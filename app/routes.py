from flask import Blueprint, jsonify, request, render_template

from app.database import (
    conversation_exists,
    create_conversation,
    get_conversation,
    get_conversations,
    get_messages,
    save_message,
    update_conversation_title,
)
from app.gemini_service import generate_gemini_response

main = Blueprint("main", __name__)


@main.route("/")
def index():
    """Render the home page."""
    return render_template("index.html")


@main.route("/api/chat", methods=["POST"])
def chat():
    """Receive a user message and return Gemini's response as JSON."""
    if not request.is_json:
        return jsonify({"success": False, "error": "Request must be JSON."}), 400

    data = request.get_json()
    conversation_id = data.get("conversation_id") if data else None
    message = data.get("message") if data else None

    if not conversation_id or not conversation_exists(conversation_id):
        return jsonify({"success": False, "error": "A valid conversation_id is required."}), 400

    if not message or not message.strip():
        return jsonify({"success": False, "error": "Message cannot be empty."}), 400

    user_message = message.strip()

    try:
        conversation = get_conversation(conversation_id)
        conversation = _auto_title_conversation(conversation, user_message)

        # Save the user message first, then save Gemini's reply only if it succeeds.
        save_message(conversation_id, "user", user_message)
        gemini_response = generate_gemini_response(user_message)
        save_message(conversation_id, "assistant", gemini_response)

        return jsonify(
            {
                "success": True,
                "response": gemini_response,
                "conversation": {
                    "id": conversation["id"],
                    "title": conversation["title"],
                },
            }
        ), 200
    except Exception as error:
        return jsonify({"success": False, "error": str(error)}), 500


@main.route("/api/messages", methods=["GET"])
def messages():
    """Return saved chat messages as JSON."""
    conversation_id = request.args.get("conversation_id", type=int)

    if not conversation_id or not conversation_exists(conversation_id):
        return jsonify({"success": False, "error": "A valid conversation_id is required."}), 400

    try:
        return jsonify({"success": True, "messages": get_messages(conversation_id)}), 200
    except Exception:
        return jsonify({"success": False, "error": "Unable to load messages."}), 500


@main.route("/api/conversations/new", methods=["POST"])
def new_conversation():
    """Create a new chat conversation."""
    conversation = create_conversation()

    return jsonify(
        {
            "success": True,
            "conversation": {
                "id": conversation["id"],
                "title": conversation["title"],
            },
        }
    ), 200


@main.route("/api/conversations", methods=["GET"])
def conversations():
    """Return all chat conversations from newest to oldest."""
    return jsonify({"success": True, "conversations": get_conversations()}), 200


def _auto_title_conversation(conversation, user_message):
    """Use the first user message as a simple beginner-friendly chat title."""
    if not _can_auto_title(conversation["title"]):
        return conversation

    title = _format_conversation_title(user_message)
    return update_conversation_title(conversation["id"], title)


def _can_auto_title(title):
    return title == "New Chat" or title.startswith("New Chat #")


def _format_conversation_title(message):
    title = message.strip()

    if len(title) > 40:
        return title[:37] + "..."

    return title
