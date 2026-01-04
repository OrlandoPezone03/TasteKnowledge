from flask import Blueprint, request, redirect, url_for
from werkzeug.security import generate_password_hash
from db import user_collection, chef_collection, DEFAULT_AVATAR

register_bp = Blueprint("register_bp", __name__)

@register_bp.route("/register", methods=["POST"])
def register():
    # Register a new user or chef with credentials.
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
