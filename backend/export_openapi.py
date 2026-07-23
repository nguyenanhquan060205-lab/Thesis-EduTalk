import json
from app.main import app

openapi_schema = app.openapi()
with open("openapi.json", "w", encoding="utf-8") as f:
    json.dump(openapi_schema, f, ensure_ascii=False, indent=2)

print("openapi.json has been generated.")
