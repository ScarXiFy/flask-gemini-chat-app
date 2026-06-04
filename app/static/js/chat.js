document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chat-form");
  const chatWindow = document.getElementById("chat-window");
  const conversationList = document.getElementById("conversation-list");
  const messageInput = document.getElementById("message");
  const newChatButton = document.getElementById("new-chat-button");
  const sendButton = document.getElementById("send-button");

  let activeConversationId = null;
  let conversations = [];
  let isRequestRunning = false;

  if (window.marked) {
    marked.use({
      gfm: true,
      breaks: true,
    });
  }

  function addMessage(text, sender) {
    removeEmptyState();

    const message = document.createElement("div");
    message.className = `message message-${sender}`;

    const paragraph = document.createElement("p");
    paragraph.className = "mb-0";

    if (sender === "assistant") {
      paragraph.className = "mb-0 markdown-content";
      paragraph.innerHTML = renderMarkdown(text);
    } else {
      paragraph.textContent = text;
    }

    message.appendChild(paragraph);
    chatWindow.appendChild(message);
    scrollToNewestMessage();

    return message;
  }

  function renderMarkdown(text) {
    if (!window.marked || !window.DOMPurify) {
      return escapeHtml(text);
    }

    const rawHtml = marked.parse(text);

    return DOMPurify.sanitize(rawHtml);
  }

  function escapeHtml(text) {
    const span = document.createElement("span");
    span.textContent = text;

    return span.innerHTML;
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

  function showEmptyState() {
    clearMessages();

    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "Start a conversation with Gemini.";
    chatWindow.appendChild(emptyState);
  }

  function removeEmptyState() {
    const emptyState = chatWindow.querySelector(".empty-state");

    if (emptyState) {
      emptyState.remove();
    }
  }

  function scrollToNewestMessage() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function renderConversations() {
    conversationList.innerHTML = "";

    conversations.forEach(function (conversation) {
      const item = document.createElement("div");
      item.className = "conversation-item";

      if (conversation.id === activeConversationId) {
        item.classList.add("active");
      }

      const titleButton = document.createElement("button");
      titleButton.className = "conversation-title";
      titleButton.type = "button";
      titleButton.textContent = conversation.title;
      titleButton.addEventListener("click", function () {
        switchConversation(conversation.id);
      });

      const actions = document.createElement("div");
      actions.className = "conversation-actions";

      const renameButton = document.createElement("button");
      renameButton.className = "conversation-action";
      renameButton.type = "button";
      renameButton.textContent = "Rename";
      renameButton.addEventListener("click", function () {
        renameConversation(conversation);
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "conversation-action";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", function () {
        deleteConversation(conversation);
      });

      actions.appendChild(renameButton);
      actions.appendChild(deleteButton);
      item.appendChild(titleButton);
      item.appendChild(actions);
      conversationList.appendChild(item);
    });
  }

  function updateConversationInSidebar(updatedConversation) {
    conversations = conversations.map(function (conversation) {
      if (conversation.id === updatedConversation.id) {
        return {
          ...conversation,
          title: updatedConversation.title,
        };
      }

      return conversation;
    });

    renderConversations();
  }

  function displaySavedMessages(messages) {
    if (!messages.length) {
      showEmptyState();
      return;
    }

    clearMessages();

    messages.forEach(function (message) {
      addMessage(message.content, message.role);
    });

    scrollToNewestMessage();
  }

  async function fetchConversations() {
    const response = await fetch("/api/conversations");
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error("Unable to load conversations.");
    }

    conversations = data.conversations;
  }

  async function createConversation() {
    const response = await fetch("/api/conversations/new", {
      method: "POST",
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error("Unable to create a conversation.");
    }

    return data.conversation;
  }

  async function renameConversation(conversation) {
    const newTitle = prompt("Enter new conversation title", conversation.title);

    if (newTitle === null) {
      return;
    }

    const cleanTitle = newTitle.trim();

    if (!cleanTitle) {
      return;
    }

    try {
      const response = await fetch("/api/conversations/rename", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
          title: cleanTitle,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Rename failed.");
      }

      updateConversationInSidebar({
        id: conversation.id,
        title: cleanTitle.slice(0, 60),
      });
    } catch (error) {
      addMessage("Unable to rename this conversation.", "error");
    }
  }

  async function deleteConversation(conversation) {
    const shouldDelete = confirm(
      "Delete this conversation?\nThis action cannot be undone."
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch("/api/conversations/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversation.id,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Delete failed.");
      }

      conversations = conversations.filter(function (item) {
        return item.id !== conversation.id;
      });

      if (conversation.id === activeConversationId) {
        await chooseConversationAfterDelete();
      } else {
        renderConversations();
      }
    } catch (error) {
      addMessage("Unable to delete this conversation.", "error");
    }
  }

  async function chooseConversationAfterDelete() {
    if (!conversations.length) {
      conversations.push(await createConversation());
    }

    activeConversationId = conversations[0].id;
    localStorage.setItem("activeConversationId", activeConversationId);
    renderConversations();
    await loadMessagesForActiveConversation();
  }

  async function loadMessagesForActiveConversation() {
    const response = await fetch(`/api/messages?conversation_id=${activeConversationId}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Message history failed to load.");
    }

    displaySavedMessages(data.messages);
  }

  async function switchConversation(conversationId) {
    if (isRequestRunning || conversationId === activeConversationId) {
      return;
    }

    activeConversationId = conversationId;
    localStorage.setItem("activeConversationId", activeConversationId);
    renderConversations();
    setLoading(true);

    try {
      await loadMessagesForActiveConversation();
    } catch (error) {
      addMessage("Unable to load previous messages.", "error");
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  }

  async function startNewConversation() {
    if (isRequestRunning) {
      return;
    }

    setLoading(true);

    try {
      const conversation = await createConversation();
      conversations.unshift(conversation);
      activeConversationId = conversation.id;
      localStorage.setItem("activeConversationId", activeConversationId);
      renderConversations();
      showEmptyState();
    } catch (error) {
      addMessage("Unable to start a new chat. Please try again.", "error");
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  }

  async function prepareConversations() {
    setLoading(true);

    try {
      await fetchConversations();

      if (!conversations.length) {
        conversations.push(await createConversation());
      }

      const savedConversationId = Number(localStorage.getItem("activeConversationId"));
      const savedConversation = conversations.find(function (conversation) {
        return conversation.id === savedConversationId;
      });

      activeConversationId = savedConversation
        ? savedConversation.id
        : conversations[0].id;

      localStorage.setItem("activeConversationId", activeConversationId);
      renderConversations();
      await loadMessagesForActiveConversation();
    } catch (error) {
      addMessage("Unable to load previous messages.", "error");
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  }

  chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (isRequestRunning || !activeConversationId) {
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
          conversation_id: activeConversationId,
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "The chat request failed.");
      }

      removeMessage(loadingMessage);
      addMessage(data.response, "assistant");
      updateConversationInSidebar(data.conversation);
      await fetchConversations();
      renderConversations();
    } catch (error) {
      removeMessage(loadingMessage);
      addMessage("Unable to contact Gemini. Please try again.", "error");
    } finally {
      setLoading(false);
      messageInput.focus();
    }
  });

  newChatButton.addEventListener("click", startNewConversation);

  prepareConversations();
});
