from flask import Blueprint, request, redirect, url_for
from werkzeug.security import generate_password_hash
from db import user_collection, chef_collection

register_bp = Blueprint("register_bp", __name__)

@register_bp.route("/register", methods=["POST"])
def register():
    nickname = request.form.get("nickname")
    email = request.form.get("email")
    password = request.form.get("password")
    role = request.form.get("role")

    if not nickname or not email or not password or not role:
        return "Missing fields", 400

    hashed_pw = generate_password_hash(password)

    collection = user_collection if role == "user" else chef_collection

    if collection.find_one({"email": email}):
        return "Email already registered", 400

    collection.insert_one({
        "nickname": nickname,
        "email": email,
        "password": hashed_pw,
        "avatar": f"https://i.pravatar.cc/40?u={nickname}",
    })

    return redirect(url_for("home"))
