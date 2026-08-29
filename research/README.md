# 🔬 Research — EduTalk HUIT

Thư mục này chứa toàn bộ nghiên cứu Machine Learning cho hệ thống tư vấn ngành của EduTalk HUIT.

## Cấu trúc

```
research/
├── data/
│   ├── raw/           # Dữ liệu thô gốc (KHÔNG chỉnh sửa)
│   ├── processed/     # Dữ liệu đã làm sạch, sẵn train
│   └── samples/       # Dữ liệu mẫu nhỏ để test
├── notebooks/
│   ├── 01_EDA.ipynb              # Khám phá & thống kê dữ liệu
│   ├── 02_preprocessing.ipynb   # Làm sạch, encode, chuẩn hóa
│   ├── 03_model_training.ipynb  # Train XGBoost + Cosine Similarity
│   └── 04_evaluation.ipynb      # Đánh giá, so sánh model
├── models/            # Model đã train (.pkl)
├── scripts/
│   ├── preprocess.py
│   └── train.py
└── README.md
```

## Quy trình
data/raw → EDA → Preprocessing → Train → Evaluate → models/

## Cài đặt
```bash
conda activate Edutalk
pip install jupyter scikit-learn xgboost pandas numpy matplotlib seaborn imbalanced-learn joblib
jupyter notebook
```
