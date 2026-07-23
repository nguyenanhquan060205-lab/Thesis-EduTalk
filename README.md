# EduTalk HUIT - Monorepo

Đây là kho lưu trữ chung (monorepo) của dự án EduTalk HUIT, bao gồm Backend (FastAPI), Web (Next.js) và Mobile (Flutter).

## Kiến trúc hệ thống
- **Backend:** FastAPI (Python). Cung cấp RESTful API và tính toán thuật toán AI (XGBoost, RAG Chatbot).
- **Firebase:** Firebase Authentication, Firestore Database, Cloud Messaging (FCM) quản lý CSDL & xác thực chung cho Web và Mobile.
- **Web:** Next.js (React), giao diện tư vấn tuyển sinh công khai và dashboard.
- **Mobile:** Flutter, ứng dụng di động dành cho học sinh & sinh viên.
- **API Codegen:** Tự động sinh Client cho TypeScript và Dart dựa trên OpenAPI.

## Yêu cầu môi trường
- Node.js >= 18 (cho Web)
- Python >= 3.10 (cho Backend)
- Flutter SDK (cho Mobile)

## Hướng dẫn phát triển độc lập

### 1. Backend
```bash
cd backend
python -m venv venv

# Kích hoạt môi trường ảo (venv):
# Trên Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Trên Windows CMD:
venv\Scripts\activate.bat
# Trên Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Web
```bash
cd web
npm install
npm run dev
```

### 3. Mobile
```bash
cd mobile
flutter pub get
flutter run
```

### 4. Cập nhật API Client
Sau khi thay đổi Backend API, để cập nhật client cho Web và Mobile:
```bash
./scripts/generate-clients.sh
```
*(Yêu cầu cài đặt npm và npx)*