from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGODB_URI")

# Prova a connettersi a MongoDB
try:
    if "?tls=" not in mongo_uri:
        mongo_uri = mongo_uri + ("&" if "?" in mongo_uri else "?") + "tls=false"
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    # Testa la connessione
    client.admin.command('ismaster')
    db = client["tasteknowledge"]
    print("✓ Connected to MongoDB")
except Exception as e:
    print(f"✗ MongoDB connection failed: {e}")
    print("Using mock database for development")
    # Fallback: non usare MongoDB, usa un dict mock
    class MockDb:
        def __getitem__(self, name):
            return MockCollection()
    
    class MockCollection:
        def find(self, query=None):
            return []
        def find_one(self, query=None):
            return None
        def insert_one(self, doc):
            return None
    
    db = MockDb()

# Collections
class MockCollection:
    def find(self, query=None):
        return iter([])
    def find_one(self, query=None):
        return None
    def insert_one(self, doc):
        from types import SimpleNamespace
        return SimpleNamespace(inserted_id=None)

recipes_collection = MockCollection() if isinstance(db, MockDb) else db["recipes"]
user_collection = MockCollection() if isinstance(db, MockDb) else db["users"]
chef_collection = MockCollection() if isinstance(db, MockDb) else db["chefs"]