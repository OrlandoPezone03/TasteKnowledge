from flask import Flask, render_template, jsonify, session, request
from flask.json.provider import DefaultJSONProvider
import os
from bson.objectid import ObjectId
from db import recipes_collection, chef_collection, user_collection, ingredients_collection, comments_collection
from login import login_bp
from register import register_bp

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

# Session info
@app.route('/api/session')
def api_session():
    logged_in = 'user_id' in session
    if not logged_in:
        return jsonify({'logged_in': False})

    user_id = session.get('user_id')
    role = session.get('role')
    collection = user_collection if role == 'user' else chef_collection

    try:
        user = collection.find_one({"_id": ObjectId(user_id)})
        if user:
            user_avatar = user.get("user_avatar", "")
            # Use default avatar if not present
            if not user_avatar:
                user_avatar = "https://imgs.search.brave.com/GgV2avlvxYDeuhFu8D5KI3V8PNMBf6gEm59lDgvqhmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzIzLzkx/LzllLzIzOTE5ZTlm/ZWRlYjIwZjljMDY3/OWYxYjI1NzllMzc0/LmpwZw"
            
            # Get followed chefs count
            followed_chefs_count = 0
            try:
                if 'followedChefs' in user:
                    followed_chefs = user.get('followedChefs', [])
                    followed_chefs_count = len(followed_chefs) if isinstance(followed_chefs, list) else 0
            except Exception:
                followed_chefs_count = 0
            
            return jsonify({
                'logged_in': True,
                'user_id': user_id,
                'user_name': user.get("nickname") or user.get("user_name") or user.get("email", ""),
                'user_avatar': user_avatar,
                'role': role,
                'followed_chefs_count': followed_chefs_count
            })
    except Exception as e:
        print(f"Error fetching user session data: {e}")

    # Fallback in case of error or user not found
    user_avatar = session.get('user_avatar', '')
    if not user_avatar:
        user_avatar = "https://imgs.search.brave.com/GgV2avlvxYDeuhFu8D5KI3V8PNMBf6gEm59lDgvqhmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzIzLzkx/LzllLzIzOTE5ZTlm/ZWRlYjIwZjljMDY3/OWYxYjI1NzllMzc0/LmpwZw"
    
    # Get followed chefs count (return 0 if not available)
    followed_chefs_count = 0
    try:
        if user and 'followedChefs' in user:
            followed_chefs = user.get('followedChefs', [])
            followed_chefs_count = len(followed_chefs) if isinstance(followed_chefs, list) else 0
    except Exception:
        followed_chefs_count = 0
    
    return jsonify({
        'logged_in': True,
        'user_id': user_id,
        'user_name': session.get('user_name', 'User'),
        'user_avatar': user_avatar,
        'role': role,
        'followed_chefs_count': followed_chefs_count
    })

# This is for testing purposes
if __name__ == "__main__":
    app.run(debug=True)