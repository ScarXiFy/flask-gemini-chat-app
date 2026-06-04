from flask import Flask

from config import Config


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    from app.routes import main

    app.register_blueprint(main)

    return app
