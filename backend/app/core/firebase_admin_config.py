"""
Firebase Admin SDK Configuration
Khởi tạo kết nối Firebase một lần duy nhất, dùng chung cho toàn bộ Backend.
Tương đương với: FirebaseFirestore.instance và FirebaseAuth.instance trong Dart.
"""

import json

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import auth, credentials

from app.core import paths
from app.core.config import settings

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
    creds_json = settings.FIREBASE_CREDENTIALS_JSON
    if creds_json:
        cred_dict = json.loads(creds_json)
        cred = credentials.Certificate(cred_dict)
    else:
        # Đọc từ file local khi chạy development
        key_path = paths.FIREBASE_KEY
        if not key_path.exists():
            raise FileNotFoundError(
                "Không tìm thấy Firebase credentials. "
                "Hãy đặt file 'serviceAccountKey.json' vào thư mục backend/ "
                "hoặc set biến môi trường FIREBASE_CREDENTIALS_JSON."
            )
        cred = credentials.Certificate(key_path)

    return firebase_admin.initialize_app(cred)


# ĐÃ XOÁ `get_db()` trả Firestore client (19/09/2026): không nơi nào gọi, dự án đã
# chuyển hẳn sang MongoDB. Nguy hiểm ở chỗ nó TRÙNG TÊN với `core/mongodb.get_db`
# đang được dùng ở 40 chỗ — import nhầm thì nhận về client của CSDL khác hẳn.


def get_auth() -> auth:
    """Lấy Firebase Auth module."""
    get_firebase_app()  # Đảm bảo app đã được khởi tạo
    return auth
