document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const chatWindow = document.getElementById("chat-window");
  const messageInput = document.getElementById("message");
  const sendButton = document.getElementById("send-button");
  let isRequestRunning = false;

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
});
