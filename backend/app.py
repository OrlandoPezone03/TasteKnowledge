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

# API ROUTES SECTION
# Recipe Management Routes
@app.route("/api/recipes", methods=["GET"])
def api_recipes():
    try:
        recipes = get_recipes_from_db()
        return jsonify(recipes)
    except Exception as e:
        print(f"Error fetching recipes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route("/api/recipes", methods=["POST"])
def api_create_recipe():
    # Check if user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
    
    try:
        data = request.get_json()
        
        # validate required fields
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
        if not data.get('image'):
            return jsonify({'error': 'Cover image is required'}), 400
        if not data.get('ingredients') or len(data['ingredients']) == 0:
            return jsonify({'error': 'At least one ingredient is required'}), 400
        if not data.get('preparationSteps') or len(data['preparationSteps']) == 0:
            return jsonify({'error': 'At least one preparation step is required'}), 400
        
        # validate difficulty is between 1 and 5
        try:
            difficulty_val = int(data.get('difficulty', 3))
            if difficulty_val < 1 or difficulty_val > 5:
                return jsonify({'error': 'Difficulty must be between 1 and 5'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid difficulty value'}), 400
        
        # get chef_id from session
        chef_id = session.get('user_id')
        
        # build recipe document
        recipe_doc = {
            'title': data.get('title', ''),
            'description': data.get('description', ''),
            'image': data.get('image', ''),
            'time': data.get('time', ''),
            'difficulty': difficulty_val,
            'tags': data.get('tags', []),
            'ingredients': [],
            'preparationSteps': data.get('preparationSteps', []),
            'chef_id': ObjectId(chef_id),
            'ratings': []
        }
        
        # convert ingredient-id to objectid
        for ing in data.get('ingredients', []):
            ing_id = safe_objectid(ing.get('ingredient-id'))
            recipe_doc['ingredients'].append({
                'quantity': ing.get('quantity', ''),
                'ingredientId': ing_id
            })
        
        # insert recipe into database
        result = recipes_collection.insert_one(recipe_doc)
        inserted_id = result.inserted_id
        
        # add recipe id to chef's recipe list
        chef_collection.update_one(
            {"_id": ObjectId(chef_id)},
            {"$push": {"recipeList": inserted_id}}
        )
        
        # prepare response
        response_recipe = recipe_doc.copy()
        response_recipe['_id'] = str(inserted_id)
        response_recipe['chef_id'] = str(response_recipe['chef_id'])
        
        # convert ingredient objectids to strings
        for ing in response_recipe.get('ingredients', []):
            if ing.get('ingredientId'):
                ing['ingredientId'] = str(ing['ingredientId'])
        
        return jsonify({
            'status': 'success',
            'message': 'Recipe created successfully',
            'recipe': response_recipe
        }), 201
        
    except Exception as e:
        print(f'Error creating recipe: {e}')
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route("/api/recipes/<recipe_id>", methods=["GET"])
def api_recipe_detail(recipe_id):
    recipe_obj = safe_objectid(recipe_id)
    if not recipe_obj:
        return jsonify({"error": "Invalid recipe ID"}), 400
    
    recipe = recipes_collection.find_one({"_id": recipe_obj})
    if not recipe:
        return jsonify({"error": "Recipe not found"}), 404
    
    enrich_recipe(recipe)
    
    # fetch comments for this recipe
    comments_list = recipe.get("commentsList", [])
    recipe["comments"] = []
    
    if comments_list:
        comment_ids = [safe_objectid(cid) for cid in comments_list if safe_objectid(cid)]
        if comment_ids:
            comments = list(comments_collection.find(
                {"_id": {"$in": comment_ids}},
                sort=[("created_at", -1)]
            ))
            for comment in comments:
                comment["_id"] = str(comment["_id"])
                comment["user_id"] = str(comment["user_id"])
                comment["recipe_id"] = str(comment["recipe_id"])
                comment.pop("created_at", None)
            recipe["comments"] = comments
    
    return jsonify(recipe)


@app.route("/api/recipes/<recipe_id>", methods=["DELETE"])
def api_delete_recipe(recipe_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized. Please log in.'}), 401
    
    recipe_obj = safe_objectid(recipe_id)
    if not recipe_obj:
        return jsonify({'error': 'Invalid recipe ID'}), 400
    
    recipe = recipes_collection.find_one({"_id": recipe_obj})
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    chef_id_session = safe_objectid(session.get('user_id'))
    if str(recipe.get('chef_id')) != str(chef_id_session):
        return jsonify({'error': 'You can only delete your own recipes'}), 403
    
    recipes_collection.delete_one({"_id": recipe_obj})
    chef_collection.update_one(
        {"_id": chef_id_session},
        {"$pull": {"recipeList": recipe_obj}}
    )
    
    return jsonify({'status': 'success', 'message': 'Recipe deleted successfully'})


@app.route("/api/recipes/<recipe_id>/comments", methods=["POST"])
def api_add_comment(recipe_id):
    # Require authentication
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    try:
        payload = request.get_json() or {}
    except Exception:
        return jsonify({'error': 'Invalid JSON payload'}), 400

    description = (payload.get('description') or '').strip()
    rate = payload.get('rate', None)
    try:
        rate_val = int(rate) if rate is not None else None
        if rate_val is not None and (rate_val < 1 or rate_val > 5):
            return jsonify({'error': 'Rate must be between 1 and 5'}), 400
    except Exception:
        return jsonify({'error': 'Invalid rate value'}), 400

    user_id = session.get('user_id')
    role = session.get('role')
    user_name = session.get('user_name')
    user_avatar = session.get('user_avatar', '')

    # try to fetch user metadata if not present in session
    if not user_name or not user_avatar:
        try:
            coll = user_collection if role == 'user' else chef_collection
            user_doc = coll.find_one({"_id": ObjectId(user_id)})
            if user_doc:
                user_name = user_doc.get('nickname') or user_doc.get('user_name') or user_doc.get('email', '')
                user_avatar = user_doc.get('user_avatar', '')
        except Exception:
            user_name = user_name or 'User'
    
    # Apply default avatar if needed
    user_avatar = get_user_avatar(user_avatar)

    # build comment document
    try:
        comment_doc = {
            'recipe_id': ObjectId(recipe_id),
            'user_id': ObjectId(user_id),
            'user_name': user_name or 'User',
            'user_avatar': user_avatar or '',
            'description': description,
            'rate': rate_val
        }
    except Exception:
        return jsonify({'error': 'Invalid recipe id or user id'}), 400

    # insert and return created object (with safe serialization)
    try:
        res = comments_collection.insert_one(comment_doc)
        inserted_id = getattr(res, 'inserted_id', None)
        
        # Update recipe to add comment ID to commentsList array
        if inserted_id:
            try:
                recipes_collection.update_one(
                    {"_id": ObjectId(recipe_id)},
                    {"$push": {"commentsList": inserted_id}}
                )
            except Exception as e:
                print(f'Error updating recipe commentsList: {e}')
                # Continue anyway because the comment was created successfully
            
            # update the recipe's rating average in real time
            update_recipe_average_rating(recipe_id)
        
        out = comment_doc.copy()
        out['_id'] = str(inserted_id) if inserted_id is not None else ''
        out['recipe_id'] = str(out['recipe_id'])
        out['user_id'] = str(out['user_id'])

        return jsonify({'status': 'success', 'comment': out}), 201
    except Exception as e:
        print('Error inserting comment:', e)
        return jsonify({'error': 'Database error'}), 500


@app.route("/api/recipes/<recipe_id>/comments/<comment_id>", methods=["DELETE"])
def api_delete_comment(recipe_id, comment_id):
    # Require authentication
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    try:
        user_id = session.get('user_id')
        role = session.get('role')
        
        # Find the comment
        comment = comments_collection.find_one({"_id": ObjectId(comment_id)})
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404
        
        # Check if user owns the comment or is a chef/admin
        if str(comment['user_id']) != user_id and role != 'chef':
            return jsonify({'error': 'Unauthorized to delete this comment'}), 403
        
        # Delete the comment
        comments_collection.delete_one({"_id": ObjectId(comment_id)})
        
        # Remove comment ID from recipe's commentsList
        recipes_collection.update_one(
            {"_id": ObjectId(recipe_id)},
            {"$pull": {"commentsList": ObjectId(comment_id)}}
        )
        
        # Update recipe's average rating
        update_recipe_average_rating(recipe_id)
        
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        print('Error deleting comment:', e)
        return jsonify({'error': 'Database error'}), 500


# Session And Profile Routes
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

# Route to update user profile
@app.route('/api/update_profile', methods=['POST'])
def api_update_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    payload = request.get_json() or {}
    user_name = (payload.get('user_name') or '').strip()
    user_avatar = (payload.get('user_avatar') or '').strip()

    if not user_name:
        return jsonify({'error': 'user_name is required'}), 400

    user_obj_id = safe_objectid(session.get('user_id'))
    if not user_obj_id:
        return jsonify({'error': 'Invalid user_id'}), 400

    collection = user_collection if session.get('role') == 'user' else chef_collection
    update_data = {'user_name': user_name, 'nickname': user_name}
    
    if user_avatar:
        update_data['user_avatar'] = user_avatar

    result = collection.update_one({"_id": user_obj_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        return jsonify({'error': 'User not found'}), 404

    session['user_name'] = user_name
    if user_avatar:
        session['user_avatar'] = user_avatar

    return jsonify({
        'success': True,
        'message': 'Profile updated successfully',
        'user_name': user_name,
        'user_avatar': user_avatar or ''
    })

# Search Routes
@app.route('/api/ingredients/search')
def api_ingredients_search():
    q = request.args.get('q', '')
    if not q:
        return jsonify([])

    # non case sensitive regex search on possible name fields
    regex = {"$regex": q, "$options": "i"}
    query = {"$or": [{"name": regex}, {"ingredientName": regex}]}

    try:
        cursor = ingredients_collection.find(query, {"name": 1, "ingredientName": 1, "unit": 1}).limit(10)
        results = []
        for doc in cursor:
            name = doc.get('ingredientName') or doc.get('name') or ''
            results.append({
                '_id': str(doc.get('_id')),
                'name': name,
                'unit': doc.get('unit', '')
            })
        return jsonify(results)
    except Exception as e:
        print(f"Error in /api/ingredients/search: {e}")
        return jsonify({'error': 'server error'}), 500

@app.route('/api/search')
def api_search():
    q = request.args.get('q', '') or ''
    q = q.strip()
    if not q:
        return jsonify([])

    try:
        regex = {"$regex": q, "$options": "i"}
        cursor = recipes_collection.find({"title": regex})
        results = []
        for recipe in cursor:
            enrich_recipe(recipe)
            results.append(recipe)
        return jsonify(results)
    except Exception as e:
        print(f"Error in /api/search: {e}")
        return jsonify({'error': 'server error'}), 500

# Favorites Routes
@app.route('/api/user/favorites')
def api_user_favorites():
    # verify that the user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    user_id = session.get('user_id')
    role = session.get('role')

    try:
        # recover the user document from the appropriate collection
        collection = user_collection if role == 'user' else chef_collection
        user_doc = collection.find_one({"_id": ObjectId(user_id)})

        if not user_doc:
            return jsonify({'error': 'User not found'}), 404

        # Extract the favorites array
        favorites = user_doc.get('favorites', [])
        
        if not favorites:
            return jsonify([])

        # convert the ids in the array to objectid
        favorite_obj_ids = []
        for fav_item in favorites:
            try:
                if isinstance(fav_item, dict):
                    fav_id = fav_item.get('recipeId')
                else:
                    fav_id = fav_item
                
                if fav_id:
                    oid = fav_id if isinstance(fav_id, ObjectId) else ObjectId(fav_id)
                    favorite_obj_ids.append(oid)
            except Exception as e:
                # skip ids that cannot be converted
                print(f"Skipping invalid favorite item {fav_item}: {e}")
                continue

        if not favorite_obj_ids:
            return jsonify([])

        # Execute query to fetch recipes
        recipes_cursor = recipes_collection.find({"_id": {"$in": favorite_obj_ids}})
        favorite_recipes = list(recipes_cursor)

        # Pass each recipe through the enrich_recipe function
        for recipe in favorite_recipes:
            enrich_recipe(recipe)

        return jsonify(favorite_recipes), 200

    except Exception as e:
        print(f"Error in /api/user/favorites: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/user/favorites/toggle', methods=['POST'])
def api_toggle_favorite():
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    payload = request.get_json() or {}
    recipe_id = (payload.get('recipe_id') or '').strip()
    
    if not recipe_id:
        return jsonify({'error': 'recipe_id is required'}), 400

    user_obj_id = safe_objectid(session.get('user_id'))
    recipe_obj_id = safe_objectid(recipe_id)
    
    if not user_obj_id or not recipe_obj_id:
        return jsonify({'error': 'Invalid user_id or recipe_id'}), 400

    collection = user_collection if session.get('role') == 'user' else chef_collection
    user_doc = collection.find_one({"_id": user_obj_id})
    
    if not user_doc:
        return jsonify({'error': 'User not found'}), 404

    favorites = user_doc.get('favorites', [])
    is_in_favorites = is_item_in_list(recipe_obj_id, favorites)

    if is_in_favorites:
        new_favorites = [f for f in favorites if str(f.get('recipeId') if isinstance(f, dict) else f) != str(recipe_obj_id)]
        collection.update_one({"_id": user_obj_id}, {"$set": {"favorites": new_favorites}})
        is_favorited = False
    else:
        collection.update_one({"_id": user_obj_id}, {"$push": {"favorites": {"recipeId": recipe_obj_id}}})
        is_favorited = True

    return jsonify({'is_favorited': is_favorited})

# Followed Chefs Routes
@app.route('/api/recipes/followed')
def api_recipes_followed():
    # verify that the user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401

    user_id = session.get('user_id')
    role = session.get('role')

    try:
        # recover the user document from the appropriate collection
        collection = user_collection if role == 'user' else chef_collection
        user_doc = collection.find_one({"_id": ObjectId(user_id)})

        if not user_doc:
            return jsonify({'error': 'User not found'}), 404

        # Extract the followedChefs array
        followed_chefs = user_doc.get('followedChefs', [])
        
        if not followed_chefs:
            return jsonify([])

        # Extract chef IDs from followedChefs array
        chef_ids_search = []
        for chef_item in followed_chefs:
            try:
                chef_id = chef_item.get('chefId') if isinstance(chef_item, dict) else chef_item
                if chef_id:
                    # Try as ObjectId first then as string
                    if isinstance(chef_id, ObjectId):
                        chef_ids_search.append(chef_id)
                    else:
                        try:
                            chef_ids_search.append(ObjectId(chef_id))
                        except Exception:
                            chef_ids_search.append(str(chef_id))
            except Exception as e:
                print(f"Skipping invalid chef item {chef_item}: {e}")
                continue

        if not chef_ids_search:
            return jsonify([])

        # fetch recipes from followed chefs
        recipes_cursor = recipes_collection.find({"chef_id": {"$in": chef_ids_search}})
        followed_recipes = list(recipes_cursor)

        # pass each recipe through the enrich_recipe function
        for recipe in followed_recipes:
            enrich_recipe(recipe)

        return jsonify(followed_recipes), 200

    except Exception as e:
        print(f"Error in /api/recipes/followed: {e}")
        return jsonify({'error': 'Server error'}), 500

# Chef Routes
@app.route('/api/chefs/<chef_id>')
def api_chef_profile(chef_id):
    try:
        # recover user_id from session (user viewing the profile)
        user_id = session.get('user_id')
        role = session.get('role')
        
        # check the query parameter for include_recipes
        include_recipes = request.args.get('include_recipes', 'false').lower() == 'true'
        
        # search for the chef in chef_collection using the id passed in the url
        try:
            chef = chef_collection.find_one({"_id": ObjectId(chef_id)})
        except Exception:
            chef = None
        
        if not chef:
            return jsonify({"error": "Chef not found"}), 404
        
        # recover recipes_count from recipe list
        recipe_list = chef.get("recipeList", [])
        recipes_count = len(recipe_list) if isinstance(recipe_list, list) else 0
        
        # build json object with chef's public data
        chef_data = {
            "_id": str(chef["_id"]),
            "user_name": chef.get("user_name", "Unknown Chef"),
            "nickname": chef.get("nickname", ""),
            "user_avatar": chef.get("user_avatar", ""),
            "bio": chef.get("bio", ""),
            "info": chef.get("info", ""),
            "followers": chef.get("followers", 0),
            "recipes_count": recipes_count,
            "is_me": False,
            "is_followed": False
        }
        
        # if include_recipes=true, recover full recipe details
        if include_recipes and recipe_list:
            try:
                # convert the ids from recipelist to objectid for the query
                recipe_ids = []
                for recipe_id_item in recipe_list:
                    try:
                        if isinstance(recipe_id_item, dict):
                            item_id = recipe_id_item.get("recipeId")
                            if item_id:
                                if isinstance(item_id, ObjectId):
                                    recipe_ids.append(item_id)
                                else:
                                    recipe_ids.append(ObjectId(str(item_id)))
                        elif isinstance(recipe_id_item, ObjectId):
                            recipe_ids.append(recipe_id_item)
                        else:
                            recipe_ids.append(ObjectId(str(recipe_id_item)))
                    except Exception as e:
                        print(f"Skipping invalid recipe ID {recipe_id_item}: {e}")
                        pass
                
                # recover recipes from collection using $in
                if recipe_ids:
                    print(f"Fetching {len(recipe_ids)} recipes for chef {chef_id}")
                    recipes = list(recipes_collection.find({"_id": {"$in": recipe_ids}}))
                    print(f"Found {len(recipes)} recipes")
                    
                    # enrich each recipe
                    enriched_recipes = []
                    for recipe in recipes:
                        enrich_recipe(recipe)
                        enriched_recipes.append(recipe)
                    
                    chef_data["recipes"] = enriched_recipes
                else:
                    print(f"No recipe IDs extracted from recipeList for chef {chef_id}")
                    chef_data["recipes"] = []
            except Exception as e:
                print(f"Error fetching recipes for chef {chef_id}: {e}")
                chef_data["recipes"] = []
        
        # if the user is logged in, check if is the chef and if has been followed
        if user_id:
            chef_data["is_me"] = (str(chef["_id"]) == str(user_id))
            
            # Check if user follows this chef
            try:
                collection = user_collection if role == 'user' else chef_collection
                user_doc = collection.find_one({"_id": ObjectId(user_id)})
                if user_doc:
                    followed_chefs = user_doc.get('followedChefs', [])
                    chef_data["is_followed"] = is_item_in_list(chef_id, followed_chefs)
            except Exception as e:
                print(f"Error checking followed status: {e}")
        
        return jsonify(chef_data), 200
    
    except Exception as e:
        print(f"Error in /api/chefs/<chef_id>: {e}")
        return jsonify({'error': 'Server error'}), 500


@app.route('/api/chefs/<chef_id>/follow', methods=['POST'])
def api_follow_chef(chef_id):
    # verify that the user is logged in
    if 'user_id' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    user_id = session.get('user_id')
    role = session.get('role')
    
    try:
        # verify that the chef exists
        try:
            chef = chef_collection.find_one({"_id": ObjectId(chef_id)})
        except Exception:
            chef = None
        
        if not chef:
            return jsonify({'error': 'Chef not found'}), 404
        
        # recover the user document from the appropriate collection
        collection = user_collection if role == 'user' else chef_collection
        user_doc = collection.find_one({"_id": ObjectId(user_id)})
        
        if not user_doc:
            return jsonify({'error': 'User not found'}), 404
        
        # Get current followedChefs list
        followed_chefs = user_doc.get('followedChefs', [])
        if not isinstance(followed_chefs, list):
            followed_chefs = []
        
        # Check if currently followed
        is_currently_followed = is_item_in_list(chef_id, followed_chefs)
        
        # Toggle: if followed, remove; if not, add
        if is_currently_followed:
            # Remove from followedChefs
            new_followed = []
            for item in followed_chefs:
                check_id = item.get('chefId') if isinstance(item, dict) else item
                if str(check_id) != str(chef_id):
                    new_followed.append(item)
            collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"followedChefs": new_followed}}
            )
            is_followed = False
        else:
            # Add to followedChefs (as string for simplicity)
            collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$push": {"followedChefs": str(chef_id)}}
            )
            is_followed = True
        
        return jsonify({'is_followed': is_followed}), 200
    
    except Exception as e:
        print(f"Error in /api/chefs/<chef_id>/follow: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'success'})

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