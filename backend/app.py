from flask import Flask, render_template, jsonify
from dotenv import load_dotenv
import os
from bson.objectid import ObjectId

from db import recipes_collection, chef_collection
from register import register_bp
from login import login_bp

load_dotenv()

app = Flask(
    __name__,
    template_folder="../frontend/pages/html",
    static_folder="../frontend"
)

# Imposta la chiave segreta per le sessioni
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")

# Attiva il blueprint
app.register_blueprint(register_bp)


# ---------------------------
# Funzione per ottenere ricette complete
# ---------------------------
def get_recipes_from_db():
    recipes = list(recipes_collection.find({}))

    for r in recipes:
        r["_id"] = str(r["_id"])

        # arricchisci ricetta con info chef
        if "chef_id" in r:
            chef = chef_collection.find_one({"_id": ObjectId(r["chef_id"])})
            if chef:
                r["user_name"] = chef.get("user_name", "Unknown")
                r["user_avatar"] = chef.get("user_avatar", "")
            r["chef_id"] = str(r["chef_id"])

    return recipes


# ---------------------------
# API ROUTES (JSON)
# ---------------------------
@app.route("/api/recipes")
def api_recipes():
    recipes = get_recipes_from_db()
    return jsonify(recipes)

@app.route("/api/recipes/<recipe_id>")
def api_recipe_detail(recipe_id):
    try:
        recipe = recipes_collection.find_one({"_id": ObjectId(recipe_id)})
        if recipe:
            recipe["_id"] = str(recipe["_id"])
            if "chef_id" in recipe:
                chef = chef_collection.find_one({"_id": ObjectId(recipe["chef_id"])})
                if chef:
                    recipe["user_name"] = chef.get("user_name", "Unknown")
                    recipe["user_avatar"] = chef.get("user_avatar", "")
                recipe["chef_id"] = str(recipe["chef_id"])
            return jsonify(recipe)
    except:
        pass
    return jsonify({"error": "Recipe not found"}), 404


# ---------------------------
# ROUTES (HTML)
# ---------------------------
@app.route("/")
def home():
    return render_template("home.html", active_page='home')

@app.route("/explore")
def explore():
    return render_template("explore.html", active_page='explore')

@app.route("/profile")
def profile():
    return render_template("profile.html", active_page='profile')

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

if __name__ == "__main__":
    app.run(debug=True)
