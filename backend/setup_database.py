"""
MongoDB Database Setup and Initialization Script
Run this script to set up indexes and initial database configuration
"""
from pymongo import MongoClient, ASCENDING
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def setup_database():
    """
    Set up MongoDB database with proper indexes and configuration
    """
    # Connect to MongoDB
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/mental_health_db')
    client = MongoClient(mongo_uri)
    
    # Get database
    db = client.get_database()
    
    print("🔧 Setting up Mental Health Support Platform Database...")
    print(f"📊 Connected to: {mongo_uri}")
    
    # Create users collection with indexes
    print("\n👥 Setting up users collection...")
    users_collection = db.users
    
    # Create unique index on email
    users_collection.create_index([('email', ASCENDING)], unique=True)
    print("  ✓ Created unique index on email")
    
    # Create moods collection with indexes
    print("\n😊 Setting up moods collection...")
    moods_collection = db.moods
    
    # Create compound index on user_id and date
    moods_collection.create_index([('user_id', ASCENDING), ('date', ASCENDING)])
    print("  ✓ Created compound index on user_id and date")
    
    # Create index on date for time-based queries
    moods_collection.create_index([('date', ASCENDING)])
    print("  ✓ Created index on date")
    
    # Create index on user_id for user-specific queries
    moods_collection.create_index([('user_id', ASCENDING)])
    print("  ✓ Created index on user_id")
    
    # Display collection stats
    print("\n📈 Database Statistics:")
    print(f"  Users: {users_collection.count_documents({})}")
    print(f"  Mood Entries: {moods_collection.count_documents({})}")
    
    # List all indexes
    print("\n📑 Indexes created:")
    print("  Users collection:")
    for index in users_collection.list_indexes():
        print(f"    - {index['name']}")
    
    print("  Moods collection:")
    for index in moods_collection.list_indexes():
        print(f"    - {index['name']}")
    
    print("\n✅ Database setup completed successfully!")
    
    # Close connection
    client.close()

def reset_database():
    """
    WARNING: This will delete all data in the database
    Use only for development/testing
    """
    mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/mental_health_db')
    client = MongoClient(mongo_uri)
    db = client.get_database()
    
    print("⚠️  WARNING: This will delete ALL data!")
    confirm = input("Type 'YES' to confirm: ")
    
    if confirm == 'YES':
        print("\n🗑️  Dropping collections...")
        db.users.drop()
        db.moods.drop()
        print("✓ All data deleted")
        
        # Recreate with indexes
        setup_database()
    else:
        print("❌ Reset cancelled")
    
    client.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'reset':
        reset_database()
    else:
        setup_database()
