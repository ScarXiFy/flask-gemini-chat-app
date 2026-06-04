document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const chatWindow = document.getElementById("chat-window");
  const messageInput = document.getElementById("message");
  const sendButton = document.getElementById("send-button");
  let isRequestRunning = false;
  let currentConversationId = null;

  function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message message-${sender}`;

    const paragraph = document.createElement("p");
    paragraph.className = "mb-0";
    paragraph.textContent = text;

    message.appendChild(paragraph);
    chatWindow.appendChild(message);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    return message;
  }

  function removeMessage(message) {
    if (message) {
      message.remove();
    }
  }

  function setLoading(isLoading) {
    isRequestRunning = isLoading;
    messageInput.disabled = isLoading;
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? "Sending..." : "Send";
  }

  function clearMessages() {
    chatWindow.innerHTML = "";
  }

  function displaySavedMessages(messages) {
    if (!messages.length) {
      chatWindow.scrollTop = chatWindow.scrollHeight;
      return;
    }

    clearMessages();

    messages.forEach(function (message) {
      addMessage(message.content, message.role);
    });
  }

  async function getCurrentConversation() {
    const response = await fetch("/api/conversations");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error("Unable to load conversations.");
    }

    if (data.conversations.length) {
      return data.conversations[0];
    }

    const newResponse = await fetch("/api/conversations/new", {
      method: "POST",
    });
    const newData = await newResponse.json();

    if (!newResponse.ok || !newData.success) {
      throw new Error("Unable to create a conversation.");
    }

    return newData.conversation;
  }

  async function loadMessageHistory() {
    try {
      const conversation = await getCurrentConversation();
      currentConversationId = conversation.id;

      const response = await fetch(`/api/messages?conversation_id=${currentConversationId}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Message history failed to load.");
      }

      displaySavedMessages(data.messages);
    } catch (error) {
      addMessage("Unable to load previous messages.", "error");
    }
  }

  chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (isRequestRunning) {
      return;
    }

    const userMessage = messageInput.value.trim();

    if (!userMessage) {
      messageInput.value = "";
      return;
    }

    addMessage(userMessage, "user");
    messageInput.value = "";
    setLoading(true);
    const loadingMessage = addMessage("Gemini is typing...", "loading");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "The chat request failed.");
      }

      removeMessage(loadingMessage);
      addMessage(data.response, "assistant");
    } catch (error) {
      removeMessage(loadingMessage);
      addMessage("Unable to contact Gemini. Please try again.", "error");
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  });

  loadMessageHistory();
});
