from flask import Blueprint, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import check_password_hash
from db import user_collection, chef_collection, DEFAULT_AVATAR

login_bp = Blueprint("login_bp", __name__)

@login_bp.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    password = request.form.get("password")
    role = request.form.get("role")  # user or chef

    # Validate required fields
    if not email or not password or not role:
        flash("Please fill in all fields", "error")
        return redirect(url_for("login_bp.login"))

    # Select collection based on user role (taken from db.py)
    collection = user_collection if role == "user" else chef_collection
    user = collection.find_one({"email": email})

    # Verify password (hashed + fallback plaintext for development)
    password_ok = False
    if user:
        try:
            password_ok = check_password_hash(user["password"], password)
        except Exception:
            password_ok = False

        if not password_ok and user.get("password") == password:
            password_ok = True

    if user and password_ok:
        # Create session
        session["user_id"] = str(user["_id"])
        session["user_name"] = (
            # It tries to get nickname, if missing get user_name, if both missing then email
            user.get("nickname")
            or user.get("user_name")
            or user.get("email")
            or "" # ensures we store an empty string instead of 'None' if all fields are missing
        )

        # Avatar, use default if not set
        user_avatar = user.get("user_avatar")
        if not user_avatar:
            user_avatar = DEFAULT_AVATAR

        session["user_avatar"] = user_avatar
        session["role"] = role

        # set destination to Home or ChefProfile based on role
        dest = url_for("home") if role == "user" else url_for("chefProfile")
        # return a JSON response so the frontend can handle the redirection manually
        return jsonify({
            "success": True,
            "redirect": dest,
            "role": role
        })
    else:
        # Invalid credentials
        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        }), 401