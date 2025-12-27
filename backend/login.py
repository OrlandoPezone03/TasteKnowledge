from flask import Blueprint, request, render_template, redirect, url_for, session, flash, jsonify
from werkzeug.security import check_password_hash
from db import user_collection, chef_collection

login_bp = Blueprint("login_bp", __name__)

# default avatar url
DEFAULT_AVATAR = "https://imgs.search.brave.com/GgV2avlvxYDeuhFu8D5KI3V8PNMBf6gEm59lDgvqhmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzIzLzkx/LzllLzIzOTE5ZTlm/ZWRlYjIwZjljMDY3/OWYxYjI1NzllMzc0/LmpwZw"

@login_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
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

            # AJAX request
            #TODO: remember to create the login.js file to handle this response on the frontend
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                # set destination to Home or ChefProfile based on role
                dest = url_for("home") if role == "user" else url_for("chefProfile")
                # return a JSON response so the frontend can handle the redirection manually
                return jsonify({
                    "success": True,
                    "redirect": dest,
                    "role": role
                })

            # Redirect to Home or ChefProfile based on role (base case for non AJAX)
            if role == "user":
                return redirect(url_for("home"))
            else:
                return redirect(url_for("chefProfile"))
        else:
            # Invalid credentials
            if request.headers.get("X-Requested-With") == "XMLHttpRequest":
                return jsonify({
                    "success": False,
                    "message": "Invalid email or password"
                }), 401 # error for unauthorized

            flash("Invalid email or password", "error")
            return redirect(url_for("login_bp.login"))

    # GET request
    return render_template("login.html")

# Logout route
@login_bp.route("/logout", methods=["POST"])
# AJAX logout endpoint
def logout():
    session.clear()
    return jsonify({"success": True})