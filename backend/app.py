from flask import Flask, render_template, jsonify, session, request
from flask.json.provider import DefaultJSONProvider
import os
from bson.objectid import ObjectId
from db import recipes_collection, chef_collection, user_collection, ingredients_collection, comments_collection
from login import login_bp
from register import register_bp
from chefBot import chef_bot_bp

# json encoder to handle objectid serialization for mongodb documents
class MongoJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        return super().default(o)

app = Flask(
    __name__,
    template_folder="../frontend/pages/html", # Path to HTML it's different from default
    static_folder="../frontend", # Path to static files (assets, css, js)
    static_url_path='' # Serve static files at the root URL to semplify access
)

# configure json serialization provider for mongodb objectid support
app.json = MongoJSONProvider(app)

# set secure session key
app.secret_key = os.getenv("SECRET_KEY", "supersecretkey")

# default avatar url (when user has no avatar)
DEFAULT_AVATAR_URL = "https://imgs.search.brave.com/GgV2avlvxYDeuhFu8D5KI3V8PNMBf6gEm59lDgvqhmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzIzLzkx/LzllLzIzOTE5ZTlm/ZWRlYjIwZjljMDY3/OWYxYjI1NzllMzc0/LmpwZw"

# register flask blueprints for modular routes
app.register_blueprint(register_bp)
app.register_blueprint(login_bp)
app.register_blueprint(chef_bot_bp)

# HELPER FUNCTIONS SECTION
def get_user_avatar(user_avatar):
    return user_avatar if user_avatar else DEFAULT_AVATAR_URL

def safe_objectid(id_val):
    try:
        return ObjectId(id_val) if isinstance(id_val, str) else id_val
    except:
        return None

def is_item_in_list(item_id, items_list):
    for item in items_list:
        check_id = item.get('recipeId') or item.get('chefId') if isinstance(item, dict) else item
        if str(check_id) == str(item_id):
            return True
    return False

# Data Enrichment Functions
def enrich_recipe(recipe):
    recipe["_id"] = str(recipe["_id"])

    # fetch and attach chef metadata
    if "chef_id" in recipe and recipe["chef_id"]:
        chef = chef_collection.find_one({"_id": ObjectId(recipe["chef_id"])})
        if chef:
            recipe["user_name"] = chef.get("user_name", "Unknown")
            recipe["user_avatar"] = chef.get("user_avatar", "")
        recipe["chef_id"] = str(recipe["chef_id"])

    # batch load ingredient details from database
    if "ingredients" in recipe and isinstance(recipe["ingredients"], list):
        # collect valid ingredient objectids for batch query
        ingredient_obj_ids = []
        for ingredient_data in recipe["ingredients"]:
            iid = ingredient_data.get("ingredientId")
            if iid:
                try:
                    oid = iid if isinstance(iid, ObjectId) else ObjectId(iid)
                    ingredient_obj_ids.append(oid)
                except Exception:
                    # if id conversion fails, skip this ingredient
                    pass

        # fetch all ingredient documents in single query
        docs_by_id = {}
        if ingredient_obj_ids:
            docs = list(ingredients_collection.find({"_id": {"$in": ingredient_obj_ids}}))
            # create index map for efficient ingredient lookup by string id
            docs_by_id = {str(doc["_id"]): doc for doc in docs}

        # map retrieved ingredient data onto recipe ingredients
        for ingredient_data in recipe["ingredients"]:
            iid = ingredient_data.get("ingredientId")
            ingredient_doc = None
            if iid:
                key = str(iid)
                ingredient_doc = docs_by_id.get(key)

            if ingredient_doc:
                # use ingredientname from db, fallback to name field
                ing_name = ingredient_doc.get("ingredientName", ingredient_doc.get("name", "Unknown Ingredient"))
                ingredient_data["name"] = ing_name
                # also set ingredient field for frontend compatibility
                ingredient_data["ingredient"] = ing_name
                ingredient_data["unit"] = ingredient_doc.get("unit", "")
                # attach nutritional values (defaults to 0 if missing)
                ingredient_data["protein"] = ingredient_doc.get("protein", 0)
                ingredient_data["carbs"] = ingredient_doc.get("carbs", 0)
                ingredient_data["fats"] = ingredient_doc.get("fats", 0)
                ingredient_data["calories"] = ingredient_doc.get("calories", 0)
                # include scientific description if available
                ingredient_data["scientificDescription"] = ingredient_doc.get("scientificDescription", "")

            # normalize ingredient id to string for json output
            ingredient_data["ingredientId"] = str(iid) if iid is not None else iid
            # ensure description field exists (safe fallback)
            ingredient_data["scientificDescription"] = ingredient_data.get("scientificDescription", "")
        
        # Calculate total nutritional values for entire recipe
        total_calories = total_protein = total_carbs = total_fats = 0.0
        
        # make a safe float conversion function
        def _safe_float(value):
            try:
                if isinstance(value, str):
                    return float(value.replace(",", ".").strip())
                return float(value)
            except Exception:
                return 0.0

        for ingredient_data in recipe["ingredients"]:
            # Convert ingredient quantity to float (defaults to 0 if invalid)
            qty_val = _safe_float(ingredient_data.get("quantity", 0))

            # Get nutritional values from database (per 100g units)
            protein_db = _safe_float(ingredient_data.get("protein", 0))
            carbs_db = _safe_float(ingredient_data.get("carbs", 0))
            fats_db = _safe_float(ingredient_data.get("fats", 0))
            calories_db = _safe_float(ingredient_data.get("calories", 0))

            # Calculate actual nutrition for this recipe's quantity
            # Using proportion math: (nutrient per 100g) * (qty in grams) / 100
            protein_calc = (protein_db * qty_val) / 100.0
            carbs_calc = (carbs_db * qty_val) / 100.0
            fats_calc = (fats_db * qty_val) / 100.0
            calories_calc = (calories_db * qty_val) / 100.0

            # Accumulate totals for recipe summary
            total_protein += protein_calc
            total_carbs += carbs_calc
            total_fats += fats_calc
            total_calories += calories_calc

            # Attach calculated values to ingredient for frontend display
            ingredient_data["calculated_nutrition"] = {
                "protein": round(protein_calc, 2),
                "carbs": round(carbs_calc, 2),
                "fats": round(fats_calc, 2),
                "calories": round(calories_calc, 2),
                "quantity": qty_val
            }

        recipe["calories"] = int(round(total_calories))
        recipe["protein"] = int(round(total_protein))
        recipe["carbs"] = int(round(total_carbs))
        recipe["fats"] = int(round(total_fats))
    return recipe

# define function to get all recipes with enrichment
def get_recipes_from_db():
    recipes = list(recipes_collection.find({}))

    for recipe in recipes:
        enrich_recipe(recipe)
        # Remove data not needed in list view for optimization
        recipe.pop("commentsList", None)
        recipe.pop("ingredients", None)
        recipe.pop("calories", None)
        recipe.pop("protein", None)
        recipe.pop("carbs", None)
        recipe.pop("fats", None)

    return recipes

# Rating and Calculation Functions
def update_recipe_average_rating(recipe_id):
    try:
        # convert recipe_id to objectid if needed
        if isinstance(recipe_id, str):
            recipe_id_obj = ObjectId(recipe_id)
        else:
            recipe_id_obj = recipe_id
        
        # fetch the recipe document to get the comments list
        recipe = recipes_collection.find_one({"_id": recipe_id_obj})
        
        if not recipe:
            print(f"recipe with id {recipe_id} not found")
            return
        
        # get the comments list (ids)
        comments_list = recipe.get("commentsList", [])
        
        # if list is empty, set rating to 0
        if not comments_list or len(comments_list) == 0:
            recipes_collection.update_one(
                {"_id": recipe_id_obj},
                {"$set": {"rating": 0}}
            )
            print(f"no comments found. rating set to 0 for recipe {recipe_id}")
            return
        
        # convert comment ids to objectid
        comment_obj_ids = []
        for comment_id in comments_list:
            try:
                if isinstance(comment_id, str):
                    comment_obj_ids.append(ObjectId(comment_id))
                else:
                    comment_obj_ids.append(comment_id)
            except Exception as e:
                print(f"error converting comment id {comment_id}: {e}")
        
        # fetch all comment documents using $in
        comments = list(comments_collection.find({
            "_id": {"$in": comment_obj_ids}
        }))
        
        if not comments or len(comments) == 0:
            print(f"no comment documents found for recipe {recipe_id}")
            recipes_collection.update_one(
                {"_id": recipe_id_obj},
                {"$set": {"rating": 0}}
            )
            return
        
        # calculate the sum of rates and total number of comments
        total_rate = 0.0
        valid_comments_count = 0
        
        for comment in comments:
            rate = comment.get("rate")
            if rate is not None:
                try:
                    # ensure it is a number
                    rate_value = float(rate)
                    total_rate += rate_value
                    valid_comments_count += 1
                except (ValueError, TypeError) as e:
                    print(f"error converting rate {rate}: {e}")
        
        # calculate average and round to 1 decimal place
        if valid_comments_count > 0:
            average_rating = round(total_rate / valid_comments_count, 1)
        else:
            average_rating = 0
        
        # update the recipe rating field
        recipes_collection.update_one(
            {"_id": recipe_id_obj},
            {"$set": {"rating": average_rating}}
        )
        
        print(f"rating updated for recipe {recipe_id}: {average_rating} (based on {valid_comments_count} comments)")
    
    except Exception as e:
        print(f"error updating rating for recipe {recipe_id}: {e}")
        import traceback
        traceback.print_exc()

# Session info
@app.route('/api/session')
def api_session():
    if 'user_id' not in session:
        return jsonify({'logged_in': False})

    user_id = session.get('user_id')
    role = session.get('role')
    collection = user_collection if role == 'user' else chef_collection
    
    user = collection.find_one({"_id": ObjectId(user_id)})
    
    return jsonify({
        'logged_in': True,
        'user_id': user_id,
        'user_name': (user.get("nickname") or user.get("user_name") or user.get("email", "")) if user else session.get('user_name', 'User'),
        'user_avatar': get_user_avatar(user.get("user_avatar", "") if user else session.get('user_avatar', '')),
        'role': role,
        'followed_chefs_count': len(user.get('followedChefs', [])) if user and isinstance(user.get('followedChefs'), list) else 0
    })
    
# HTML ROUTES SECTION
@app.route("/")
def home():
    return render_template("home.html")

@app.route("/explore")
def explore():
    return render_template("explore.html")

@app.route("/profile")
def profile():
    return render_template("profile.html")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/recipe/<recipe_id>")
def recipe_page(recipe_id):
    # the page is static and client-side will fetch /api/recipes/<id> if needed
    return render_template("recipePage.html", recipe_id=recipe_id)

@app.route("/addRecipe")
def addRecipe():
    return render_template("addRecipe.html")

@app.route("/chefProfile")
def chefProfile():
    return render_template("chefProfile.html")

@app.route("/offline")
def offline():
    return render_template("offline.html")

# This is for testing purposes
if __name__ == "__main__":
    app.run(debug=True)
    # app.run(host='0.0.0.0', port=5000, debug=True)