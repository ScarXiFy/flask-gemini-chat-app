import sqlite3

from flask import current_app


def get_database_connection():
    """Open a connection to the SQLite database file."""
    database_path = current_app.config["DATABASE_PATH"]
    return sqlite3.connect(database_path)


def init_db():
    """Create database tables and safely upgrade older beginner schemas."""
    connection = get_database_connection()

    try:
        # A conversation is one chat thread. Each conversation can have many messages.
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'New Chat',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )

        message_columns = _get_table_columns(connection, "messages")

        if not message_columns:
            _create_messages_table(connection)
        elif "conversation_id" not in message_columns:
            _migrate_old_messages_table(connection)

        connection.commit()
    finally:
        connection.close()


def create_conversation(title="New Chat"):
    """Create one conversation and return the saved row."""
    connection = get_database_connection()
    connection.row_factory = sqlite3.Row

    try:
        cursor = connection.execute(
            "INSERT INTO conversations (title) VALUES (?)",
            (title,),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE id = ?
            """,
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)
    finally:
        connection.close()


def get_conversations():
    """Load conversations from newest to oldest."""
    connection = get_database_connection()
    connection.row_factory = sqlite3.Row

    try:
        rows = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            ORDER BY updated_at DESC, id DESC
            """
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_conversation(conversation_id):
    """Load one conversation by id."""
    connection = get_database_connection()
    connection.row_factory = sqlite3.Row

    try:
        row = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()

        return dict(row) if row else None
    finally:
        connection.close()


def update_conversation_title(conversation_id, title):
    """Update a conversation title and return the updated row."""
    connection = get_database_connection()
    connection.row_factory = sqlite3.Row

    try:
        connection.execute(
            """
            UPDATE conversations
            SET title = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (title, conversation_id),
        )
        connection.commit()

        row = connection.execute(
            """
            SELECT id, title, created_at, updated_at
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()

        return dict(row)
    finally:
        connection.close()


def get_messages(conversation_id):
    """Load messages for one conversation from oldest to newest."""
    connection = get_database_connection()
    connection.row_factory = sqlite3.Row

    try:
        rows = connection.execute(
            """
            SELECT id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY id ASC
            """,
            (conversation_id,),
        ).fetchall()

        return [dict(row) for row in rows]
    finally:
        connection.close()


def save_message(conversation_id, role, content):
    """Save one chat message under a specific conversation."""
    connection = get_database_connection()

    try:
        # The conversation_id links this message back to its chat thread.
        connection.execute(
            """
            INSERT INTO messages (conversation_id, role, content)
            VALUES (?, ?, ?)
            """,
            (conversation_id, role, content),
        )
        connection.execute(
            "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (conversation_id,),
        )
        connection.commit()
    finally:
        connection.close()


def conversation_exists(conversation_id):
    """Check whether a conversation exists before saving or loading messages."""
    connection = get_database_connection()

    try:
        row = connection.execute(
            "SELECT id FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()

        return row is not None
    finally:
        connection.close()


def _create_messages_table(connection):
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def _get_table_columns(connection, table_name):
    rows = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    return [row[1] for row in rows]


def _migrate_old_messages_table(connection):
    """Move old global messages into one default conversation."""
    cursor = connection.execute(
        "INSERT INTO conversations (title) VALUES (?)",
        ("New Chat",),
    )
    default_conversation_id = cursor.lastrowid

    _create_messages_table(connection)
    connection.execute("ALTER TABLE messages RENAME TO old_messages")
    _create_messages_table(connection)
    connection.execute(
        """
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        SELECT id, ?, role, content, created_at
        FROM old_messages
        ORDER BY id ASC
        """,
        (default_conversation_id,),
    )
    connection.execute("DROP TABLE old_messages")
