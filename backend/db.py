from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file in the backend directory
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)

# Retrive MONGODB_URI from environment variables
mongo_uri = os.getenv("MONGODB_URI")

# Check if MONGODB_URI is set correctly
if not mongo_uri:
    raise ValueError("MONGODB_URI not set in environment variables")

# Connect to MongoDB
client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
db = client["tasteknowledge"]

# Initialize all collections
recipes_collection = db["recipes"]
user_collection = db["users"]
chef_collection = db["chefs"]
ingredients_collection = db["ingredients"]
comments_collection = db["comments"]

# Default avatar URL
DEFAULT_AVATAR = "https://imgs.search.brave.com/GgV2avlvxYDeuhFu8D5KI3V8PNMBf6gEm59lDgvqhmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzLzIzLzkx/LzllLzIzOTE5ZTlm/ZWRlYjIwZjljMDY3/OWYxYjI1NzllMzc0/LmpwZw"