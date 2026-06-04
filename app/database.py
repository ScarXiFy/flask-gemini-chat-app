import sqlite3

from flask import current_app


def get_database_connection():
    """Open a connection to the SQLite database file."""
    database_path = current_app.config["DATABASE_PATH"]
    return sqlite3.connect(database_path)


def init_db():
    """Create the messages table if it does not already exist."""
    connection = get_database_connection()

    try:
        # This table stores each chat message with its role and timestamp.
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def save_message(role, content):
    """Save one chat message to the messages table."""
    connection = get_database_connection()

    try:
        # Parameter placeholders keep values separate from SQL code.
        connection.execute(
            "INSERT INTO messages (role, content) VALUES (?, ?)",
            (role, content),
        )
        connection.commit()
    finally:
        connection.close()
