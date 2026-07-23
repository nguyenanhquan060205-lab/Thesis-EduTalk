import numpy as np

# Danh sách 35 Nhóm ngành chuẩn (Profile Signature)
# Thứ tự điểm: [Năng động, Hướng nội, Sáng tạo, Logic, Tò mò, Cảm thông, Công nghệ, Xã hội, Sức khỏe, Nghệ thuật]
MASTER_PROFILES = {
    "Kế toán - Kiểm toán":                         [3, 3, 2, 5, 3, 2, 3, 3, 2, 1],
    "Tài chính - Ngân hàng - Bảo hiểm":            [4, 2, 3, 5, 3, 2, 3, 4, 2, 1],
    "Kinh tế - Quản trị kinh doanh - Thương Mại":  [5, 1, 4, 4, 4, 3, 3, 5, 2, 1],
    "Công nghệ thông tin - Tin học":               [2, 4, 4, 5, 5, 1, 5, 1, 1, 2],
    "Công nghiệp bán dẫn":                         [2, 4, 3, 5, 5, 1, 5, 1, 1, 1],
    "Báo chí - Markerting - Quảng cáo - PR":       [5, 1, 5, 3, 5, 3, 3, 5, 2, 3],
    "Sư phạm - Giáo dục":                          [3, 3, 3, 3, 3, 5, 2, 5, 2, 2],
    "Y - dược":                                    [3, 3, 2, 5, 4, 5, 3, 3, 5, 1],
    "Bác sĩ thú y":                                [3, 2, 2, 4, 4, 5, 2, 2, 5, 1],
    "Công an - Quân đội":                          [4, 2, 2, 4, 3, 4, 3, 4, 5, 1],
    "Thiết kế đồ họa - Game - Đa phương tiện":     [3, 3, 5, 2, 4, 2, 4, 2, 1, 5],
    "Xây dựng - Kiến trúc - Giao thông":           [3, 3, 4, 5, 3, 2, 4, 2, 3, 2],
    "Ngoại giao - Ngoại ngữ":                      [4, 2, 3, 3, 4, 4, 2, 5, 1, 2],
    "Ngoại thương - Xuất nhập khẩu - Kinh tế quốc tế": [5, 1, 4, 4, 4, 2, 3, 5, 2, 1],
    "Du lịch - Khách sạn":                         [5, 1, 3, 2, 5, 4, 2, 5, 2, 2],
    "Ô tô - Cơ khí - Chế tạo":                     [3, 3, 3, 5, 4, 1, 5, 1, 3, 1],
    "Điện lạnh - Điện tử - Điện - Tự động hóa":    [3, 3, 3, 5, 4, 1, 5, 1, 2, 1],
    "Hàng hải - Thủy lợi - Thời tiết":             [3, 3, 2, 4, 4, 2, 4, 1, 4, 1],
    "Hàng không - Vũ trụ - Hạt nhân":              [3, 3, 3, 5, 5, 1, 5, 1, 3, 1],
    "Công nghệ vật liệu":                          [2, 4, 3, 5, 4, 1, 5, 1, 1, 1],
    "Công nghệ chế biến thực phẩm":                [3, 3, 3, 4, 3, 2, 4, 2, 2, 1],
    "Công nghệ In - Giấy":                         [2, 4, 3, 4, 3, 1, 4, 1, 1, 2],
    "Công nghệ sinh - Hóa":                        [2, 4, 3, 5, 5, 2, 4, 1, 2, 1],
    "Luật - Tòa án":                               [3, 3, 2, 5, 4, 4, 2, 5, 2, 1],
    "Mỏ - Địa chất":                               [3, 2, 2, 4, 5, 2, 4, 1, 4, 1],
    "Mỹ thuật - Âm nhạc - Nghệ thuật":             [4, 3, 5, 1, 4, 5, 1, 3, 1, 5],
    "Tài nguyên - Môi trường":                     [3, 3, 2, 4, 4, 4, 3, 3, 2, 1],
    "Tâm lý":                                      [2, 4, 2, 4, 5, 5, 2, 4, 2, 2],
    "Thể dục - Thể thao":                          [5, 1, 2, 2, 2, 3, 1, 4, 5, 1],
    "Thời trang - May mặc":                        [3, 3, 5, 2, 4, 2, 2, 3, 1, 5],
    "Thủy sản - Lâm nghiệp - Nông nghiệp":         [3, 2, 2, 4, 3, 3, 3, 2, 4, 1],
    "Toán học và thống kê":                        [2, 5, 2, 5, 4, 1, 4, 1, 1, 1],
    "Nhân sự - Hành chính":                        [4, 2, 3, 3, 3, 5, 2, 5, 1, 1],
    "Văn hóa - Chính trị - Khoa học Xã hội":       [3, 3, 3, 3, 4, 5, 2, 5, 1, 3],
    "Khoa học tự nhiên khác":                      [2, 4, 3, 5, 5, 1, 4, 1, 1, 1]
}

def calculate_similarity(v1, v2):
    v1 = np.array(v1, dtype=float)
    v2 = np.array(v2, dtype=float)
    dot = np.dot(v1, v2)
    norm = np.linalg.norm(v1) * np.linalg.norm(v2)
    return 0.5 if norm == 0 else dot / norm

def predict_major(user_scores: list[int]) -> list[dict]:
    """
    Dự đoán ngành phù hợp dựa trên thuật toán cosine similarity
    user_scores: Danh sách 10 điểm từ bài khảo sát [Năng động, Hướng nội, Sáng tạo, ...]
    """
    results = []
    for major, profile in MASTER_PROFILES.items():
        sim = calculate_similarity(user_scores, profile)
        results.append({
            "major": major,
            "similarity": float(sim)
        })
    
    # Sắp xếp theo độ tương đồng giảm dần
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results
