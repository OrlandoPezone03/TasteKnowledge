# TasteKnowledge

A web application for discovering recipes and find scientific knowledge behind them, featuring an AI-powered chef bot that can answer your questions. Built with Python Flask backend and vanilla JavaScript frontend with Progressive Web App (PWA) capabilities.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Project Structure](#project-structure)
- [Running the Application](#running-the-application)

## Technology Stack

### Backend
- **Python 3** - Programming language
- **Flask 3.1.2** - Web framework for building REST APIs
- **MongoDB 4.15.5** - NoSQL database for storing recipes, chef profiles, and user data
- **Hugging Face Hub** - Integration with AI models for the chef bot feature
- **python-dotenv** - Environment variable management

### Frontend
- **HTML5** - Markup language
- **CSS3** - Styling and responsive design
- **Vanilla JavaScript** - Client-side interactivity
- **Service Workers** - Progressive Web App support for offline functionality
- **Web Manifest** - PWA installation capabilities

### Additional Tools
- **Werkzeug 3.1.4** - WSGI utility library for Flask

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.8 or higher** - For backend and venv
- **Git** - For cloning the repository
- **MongoDB** - Use MongoDB Atlas for cloud hosting

## Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/OrlandoPezone03/TasteKnowledge.git
cd TasteKnowledge
```

### Step 2: Create a Virtual Environment

A virtual environment isolates your project dependencies from system-wide Python packages.

**On macOS and Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` prefix in your terminal, indicating the virtual environment is active.

### Step 3: Install Dependencies

With the virtual environment activated, install all required packages from the `requirements.txt` file:

```bash
pip install -r requirements.txt
```

This will install:
- Flask and related dependencies
- MongoDB driver
- Hugging Face Hub for AI integration
- All other required packages listed in requirements.txt

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory of the project.
First navigate to the backend folder and then ceate .env file:

```bash
touch .env
```

Add the following configuration variables to your `.env` file:

```env
HUGGINGFACE_API_KEY=your_secret_key_here
MONGODB_URI=your_mongodb_connection_string
```

## Running the Application

### Step 1: Activate Virtual Environment

Ensure your virtual environment is activated (you should see `(venv)` in your terminal):

```bash
# macOS/Linux
source venv/bin/activate
```

### Step 2: Start the Flask Server

Navigate to the backend directory and run the application:

```bash
cd backend
python app.py
```

You should see output similar to:

```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### Step 3: Access the Application

Open your web browser and navigate to:

```
http://localhost:5000
```

The frontend will be served from the Flask server.

### Step 4: Deactivate Virtual Environment

When you're done working, deactivate the virtual environment:

```bash
deactivate
```

## Troubleshooting

### Virtual Environment Issues

**Problem:** Command not found when trying to activate venv

**Solution:** Make sure you're in the project root directory and that Python 3 is installed.

### Missing Dependencies

**Problem:** `ModuleNotFoundError` when running the app

**Solution:** Ensure your virtual environment is activated and all dependencies are installed:

```bash
pip install -r requirements.txt
```

### MongoDB Connection Error

**Problem:** Connection refused when connecting to MongoDB

**Solution:** Ensure that your `MONGODB_URI` in `.env` is correctly configured.