document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const chatWindow = document.getElementById("chat-window");
  const messageInput = document.getElementById("message");
  const sendButton = document.getElementById("send-button");

  function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message message-${sender}`;

    const paragraph = document.createElement("p");
    paragraph.className = "mb-0";
    paragraph.textContent = text;

    message.appendChild(paragraph);
    chatWindow.appendChild(message);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function setLoading(isLoading) {
    sendButton.disabled = isLoading;
    sendButton.textContent = isLoading ? "Sending..." : "Send";
  }

  chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const userMessage = messageInput.value.trim();

    if (!userMessage) {
      return;
    }

    addMessage(userMessage, "user");
    messageInput.value = "";
    setLoading(true);

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

      addMessage(data.response, "assistant");
    } catch (error) {
      addMessage("Unable to contact Gemini. Please try again.", "error");
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  });
});
