from flask import Flask

from config import Config


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)

    from app.database import init_db
    from app.routes import main

    with app.app_context():
        init_db()

    app.register_blueprint(main)

    return app
