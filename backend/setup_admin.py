import asyncio
from firebase_admin import auth
from app.core.firebase_admin_config import get_auth
from app.core.mongodb import get_db

async def setup_admin():
    from motor.motor_asyncio import AsyncIOMotorClient
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Init Firebase
    firebase_auth = get_auth()
    
    # Init MongoDB
    uri = os.getenv('MONGO_URI')
    client = AsyncIOMotorClient(uri)
    db = client.get_default_database()
    
    email = 'admin@edutalk.com'
    password = 'adminpassword123'
    
    # 1. Update/Create Firebase User
    try:
        user = firebase_auth.get_user_by_email(email)
        firebase_auth.update_user(user.uid, password=password)
        uid = user.uid
        print('Updated existing admin in Firebase.')
    except Exception as e:
        user = firebase_auth.create_user(email=email, password=password, display_name='Admin')
        uid = user.uid
        print('Created new admin in Firebase.')
        
    # 2. Update/Create in MongoDB
    admin_data = {
        '_id': uid,
        'email': email,
        'role': 'admin',
        'name': 'Admin EduTalk'
    }
    await db['users'].update_one({'_id': uid}, {'$set': admin_data}, upsert=True)
    print('Updated admin in MongoDB.')

asyncio.run(setup_admin())
