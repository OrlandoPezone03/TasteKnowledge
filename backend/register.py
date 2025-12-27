from flask import Blueprint, request, redirect, url_for
from werkzeug.security import generate_password_hash
from db import user_collection, chef_collection

register_bp = Blueprint("register_bp", __name__)

# Avatar di default
DEFAULT_AVATAR = "https://imgs.search.brave.com/GgV2avlvxYDeuhFu8D5KI3V8PNMBf6gEm59lDgvqhmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzIzLzkx/LzllLzIzOTE5ZTlm/ZWRlYjIwZjljMDY3/OWYxYjI1NzllMzc0/LmpwZw"

@register_bp.route("/register", methods=["POST"])
def register():
    """Register a new user or chef with credentials."""
    nickname = request.form.get("nickname")
    email = request.form.get("email")
    password = request.form.get("password")
    role = request.form.get("role")

    # Validate all required fields are provided
    if not nickname or not email or not password or not role:
        return "Missing fields", 400

    # Hash password for secure storage
    hashed_pw = generate_password_hash(password)

    # Select appropriate collection based on user role
    collection = user_collection if role == "user" else chef_collection

    # Prevent duplicate email registrations
    if collection.find_one({"email": email}):
        return "Email already registered", 400

    # Create new user/chef document
    collection.insert_one({
        "nickname": nickname,
        "email": email,
        "password": hashed_pw,
        "user_avatar": DEFAULT_AVATAR,
    })

    # Redirect to home after successful registration
    return redirect(url_for("login_bp.login"))
