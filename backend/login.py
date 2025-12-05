from flask import Blueprint, request, render_template, redirect, url_for, session, flash
from werkzeug.security import check_password_hash
from db import user_collection, chef_collection

login_bp = Blueprint("login_bp", __name__)

# Chiave segreta per le sessioni (deve essere impostata in app.py)
# app.secret_key = os.getenv("SECRET_KEY") 

@login_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        role = request.form.get("role")  # user o chef

        if not email or not password or not role:
            flash("Compila tutti i campi", "error")
            return redirect(url_for("login_bp.login"))

        collection = user_collection if role == "user" else chef_collection

        user = collection.find_one({"email": email})

        if user and check_password_hash(user["password"], password):
            # Login riuscito → salva sessione
            session["user_id"] = str(user["_id"])
            session["user_name"] = user.get("nickname", "")
            session["role"] = role

            # Redirect differente per user o chef (opzionale)
            if role == "user":
                return redirect(url_for("home"))
            else:
                return redirect(url_for("profile"))  # o una dashboard chef
        else:
            flash("Email o password errati", "error")
            return redirect(url_for("login_bp.login"))

    # GET → mostra la pagina login
    return render_template("login.html")
