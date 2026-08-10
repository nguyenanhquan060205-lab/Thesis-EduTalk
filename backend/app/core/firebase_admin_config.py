"""
Firebase Admin SDK Configuration
Khởi tạo kết nối Firebase một lần duy nhất, dùng chung cho toàn bộ Backend.
Tương đương với: FirebaseFirestore.instance và FirebaseAuth.instance trong Dart.
"""

import json
import os

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import auth, credentials, firestore

load_dotenv()

_firebase_app = None
_db = None


def get_firebase_app():
    """Lấy Firebase App instance (singleton)."""
    global _firebase_app
    if _firebase_app is None:
        _firebase_app = _initialize_firebase()
    return _firebase_app


def _initialize_firebase() -> firebase_admin.App:
    """
    Khởi tạo Firebase Admin SDK.
    Đọc credentials từ biến môi trường FIREBASE_CREDENTIALS_JSON
    hoặc từ file serviceAccountKey.json.
    """
    # Ưu tiên đọc từ biến môi trường (phù hợp khi deploy lên Render/Heroku)
    creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    if creds_json:
        cred_dict = json.loads(creds_json)
        cred = credentials.Certificate(cred_dict)
    else:
        # Đọc từ file local khi chạy development
        key_path = os.path.join(
            os.path.dirname(__file__), "..", "..", "serviceAccountKey.json"
        )
        if not os.path.exists(key_path):
            raise FileNotFoundError(
                "Không tìm thấy Firebase credentials. "
                "Hãy đặt file 'serviceAccountKey.json' vào thư mục backend/ "
                "hoặc set biến môi trường FIREBASE_CREDENTIALS_JSON."
            )
        cred = credentials.Certificate(key_path)

    return firebase_admin.initialize_app(cred)


def get_db() -> firestore.Client:
    """Lấy Firestore client (singleton)."""
    global _db
    if _db is None:
        get_firebase_app()  # Đảm bảo app đã được khởi tạo
        _db = firestore.client()
    return _db


def get_auth() -> auth:
    """Lấy Firebase Auth module."""
    get_firebase_app()  # Đảm bảo app đã được khởi tạo
    return auth
