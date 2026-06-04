# Flask Gemini Chat App

A beginner-friendly Flask starter project for a future Gemini-powered chat app.

Phase 1 includes a professional Flask structure, a Bootstrap chat UI, environment setup, and local run instructions. It does not include Gemini API integration or a database yet.

## Project Structure

```text
flask-gemini-chat-app/
  app/
    __init__.py
    routes.py
    templates/
      base.html
      index.html
    static/
      css/
        styles.css
      js/
        chat.js
  config.py
  run.py
  requirements.txt
  .env.example
  .gitignore
  README.md
```

## Setup

Create and activate a virtual environment.

```bash
python -m venv .venv
```

On Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

Install the dependencies.

```bash
pip install -r requirements.txt
```

Create your local environment file.

```bash
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

Run the app.

```bash
python run.py
```

Open the local URL shown in your terminal. Flask usually uses:

```text
http://127.0.0.1:5000
```

## Important Files

`run.py` starts the Flask app locally.

`config.py` loads settings from environment variables.

`app/__init__.py` creates the Flask app and registers routes.

`app/routes.py` defines the home page route.

`app/templates/base.html` contains the shared page layout and Bootstrap CDN links.

`app/templates/index.html` contains the chat UI.

`app/static/css/styles.css` contains custom styling.

`app/static/js/chat.js` is reserved for future chat behavior.

## Phase 1 Scope

Included:

- Flask project structure
- Bootstrap chat interface
- Home page route
- Environment example file
- Requirements file
- Setup instructions

Not included yet:

- Gemini API integration
- Database storage
- Authentication
- Real chat submission
