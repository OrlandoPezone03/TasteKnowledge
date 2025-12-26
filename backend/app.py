from flask import Flask, render_template, jsonify
from dotenv import load_dotenv
import os

app = Flask(
    __name__,
    template_folder="../frontend/pages/html", # Path to HTML it's different from default
    static_folder="../frontend", # Path to static files (assets, css, js)
    static_url_path='' # Serve static files at the root URL to semplify access
)

# Routes
@app.route("/")
def home():
    return render_template("home.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

# This is for testing purposes
if __name__ == "__main__":
    app.run(debug=True)