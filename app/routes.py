from flask import Blueprint, jsonify, request, render_template

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
    message = data.get("message") if data else None

    if not message or not message.strip():
        return jsonify({"success": False, "error": "Message cannot be empty."}), 400

    try:
        gemini_response = generate_gemini_response(message)
        return jsonify({"success": True, "response": gemini_response}), 200
    except Exception as error:
        return jsonify({"success": False, "error": str(error)}), 500
