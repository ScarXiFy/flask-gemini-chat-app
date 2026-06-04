from flask import current_app
from google import genai


def generate_gemini_response(user_message):
    """Send a user message to Gemini and return the text response."""
    if not user_message or not user_message.strip():
        raise ValueError("Message cannot be empty.")

    api_key = current_app.config.get("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("Gemini API key is not configured.")

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_message.strip(),
        )

        return response.text
    except Exception as error:
        raise RuntimeError(f"Gemini request failed: {error}") from error
