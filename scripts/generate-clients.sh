#!/bin/bash
set -e

# Chạy từ thư mục gốc của dự án (edutalk-thesis / EduTalkWeb)
PROJECT_ROOT=$(pwd)

echo "1. Generating OpenAPI Spec from FastAPI..."
cd $PROJECT_ROOT/backend
# Requires virtual environment activated and dependencies installed
python export_openapi.py

echo "2. Generating Web TypeScript Client..."
cd $PROJECT_ROOT/web
# Cài đặt openapi-typescript-codegen nếu chưa có (npm install -D openapi-typescript-codegen)
npx openapi-typescript-codegen --input ../backend/openapi.json --output ./lib/api/generated --client fetch

echo "3. Generating Mobile Dart Client..."
cd $PROJECT_ROOT
# Sử dụng openapi-generator-cli thông qua npx
npx @openapitools/openapi-generator-cli generate \
    -i backend/openapi.json \
    -g dart \
    -o mobile/lib/api/generated \
    --additional-properties=pubName=edutalk_api

echo "Done generating clients!"
