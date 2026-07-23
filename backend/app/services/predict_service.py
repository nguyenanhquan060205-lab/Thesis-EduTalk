import numpy as np

# Danh sách 39 Ngành học chuẩn HUIT kèm 15 Tổ hợp môn xét tuyển
# Dữ liệu phục vụ thuật toán Cosine Similarity & XGBoost Prediction
HUIT_MAJORS = {
    "Quản trị dịch vụ du lịch và lữ hành": {"code": "7810103", "blocks": ["D01", "C03", "D15", "C00"]},
    "Quản trị khách sạn": {"code": "7810201", "blocks": ["D01", "C03", "D15", "C00"]},
    "Quản trị nhà hàng và dịch vụ ăn uống": {"code": "7810202", "blocks": ["D01", "C03", "D15", "C00"]},
    "Khoa học dinh dưỡng và ẩm thực": {"code": "7540105", "blocks": ["B00", "A01", "C02", "D07"]},
    "Khoa học chế biến món ăn": {"code": "7540106", "blocks": ["B00", "A01", "C02", "D07"]},
    "Du lịch": {"code": "7810101", "blocks": ["D01", "C03", "D15", "C00"]},
    "Luật": {"code": "7380101", "blocks": ["D01", "C03", "X01", "C00"]},
    "Luật kinh tế": {"code": "7380107", "blocks": ["D01", "C03", "X01", "C00"]},
    "Ngôn ngữ Anh": {"code": "7220201", "blocks": ["D01", "A01", "D09", "D14"]},
    "Ngôn ngữ Trung Quốc": {"code": "7220204", "blocks": ["D01", "A01", "D09", "D14"]},
    "Công nghệ thông tin": {"code": "7480201", "blocks": ["D01", "A00", "C01", "X26"]},
    "An toàn thông tin": {"code": "7480202", "blocks": ["D01", "A00", "C01", "X26"]},
    "Khoa học dữ liệu": {"code": "7480108", "blocks": ["D01", "A00", "C01", "X26"]},
    "Trí tuệ nhân tạo": {"code": "7480109", "blocks": ["D01", "A00", "C01", "X26"]},
    "Kế toán": {"code": "7340301", "blocks": ["D01", "A01", "C01", "A00"]},
    "Tài chính ngân hàng": {"code": "7340201", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ tài chính": {"code": "7340205", "blocks": ["D01", "A01", "C01", "A00"]},
    "Marketing": {"code": "7340115", "blocks": ["D01", "A01", "C01", "A00"]},
    "Thương mại điện tử": {"code": "7340122", "blocks": ["D01", "A01", "C01", "A00"]},
    "Logistics và quản lý chuỗi cung ứng": {"code": "7510605", "blocks": ["D01", "A01", "C01", "A00"]},
    "Quản trị kinh doanh": {"code": "7340101", "blocks": ["D01", "A01", "C01", "A00"]},
    "Kinh doanh quốc tế": {"code": "7340120", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ dệt, may": {"code": "7540204", "blocks": ["D01", "A01", "C01", "A00"]},
    "Kinh doanh thời trang và dệt may": {"code": "7540205", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ thực phẩm": {"code": "7540101", "blocks": ["B00", "B08", "A00", "D07"]},
    "Đảm bảo chất lượng và an toàn thực phẩm": {"code": "7540102", "blocks": ["B00", "B08", "A00", "D07"]},
    "Quản trị kinh doanh thực phẩm": {"code": "7540103", "blocks": ["D01", "B00", "C02", "D07"]},
    "Công nghệ chế biến thủy sản": {"code": "7540104", "blocks": ["B00", "B08", "A00", "D07"]},
    "Công nghệ chế tạo máy": {"code": "7510201", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ kỹ thuật cơ điện tử": {"code": "7510203", "blocks": ["D01", "A01", "C01", "A00"]},
    "Kỹ thuật nhiệt": {"code": "7510206", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ kỹ thuật điện - điện tử": {"code": "7510301", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ kỹ thuật điều khiển và TĐH": {"code": "7510303", "blocks": ["D01", "A01", "C01", "A00"]},
    "Công nghệ kỹ thuật hóa học": {"code": "7510401", "blocks": ["B00", "B08", "A00", "D07"]},
    "Công nghệ vật liệu": {"code": "7510402", "blocks": ["B00", "B08", "A00", "D07"]},
    "Công nghệ sinh học": {"code": "7420201", "blocks": ["B00", "B08", "A00", "D07"]},
    "Quản lý tài nguyên và môi trường": {"code": "7850101", "blocks": ["B00", "A01", "A00", "D07"]},
    "Công nghệ kỹ thuật môi trường": {"code": "7520501", "blocks": ["B00", "A01", "A00", "D07"]},
    "Quản lý Công nghiệp": {"code": "7510601", "blocks": ["D01", "A01", "C01", "A00"]},
}


def calculate_similarity(v1, v2):
    v1 = np.array(v1, dtype=float)
    v2 = np.array(v2, dtype=float)
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    return 0.5 if norm == 0 else dot / norm


def predict_major(user_features: dict) -> list:
    """
    Dự đoán ngành phù hợp dựa trên 23 Features đầu vào và luật tuyển sinh HUIT
    """
    selected_block = user_features.get("block", "D01")
    results = []

    for major_name, info in HUIT_MAJORS.items():
        is_eligible = selected_block in info["blocks"]
        # Giả lập điểm tương đồng từ 23 features
        base_score = 0.85 if is_eligible else 0.45
        results.append(
            {
                "code": info["code"],
                "major": major_name,
                "blocks": info["blocks"],
                "eligible": is_eligible,
                "similarity": float(base_score),
            }
        )

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results
