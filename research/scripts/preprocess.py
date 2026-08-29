"""
preprocess.py — Script làm sạch và chuẩn hóa dữ liệu EduTalk HUIT
Chạy: python preprocess.py --input data/raw/huit_admissions_data.csv
"""
import argparse
import os
import joblib
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split

OUTPUT_DIR = "data/processed/"
MODEL_DIR  = "models/"


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"✅ Loaded {len(df):,} rows × {df.shape[1]} cols from {path}")
    return df


def handle_missing(df: pd.DataFrame) -> pd.DataFrame:
    num_cols = df.select_dtypes(include="number").columns
    df[num_cols] = df[num_cols].fillna(df[num_cols].median())
    cat_cols = df.select_dtypes(include="object").columns
    for col in cat_cols:
        df[col] = df[col].fillna(df[col].mode()[0])
    print(f"✅ Missing values handled. Total remaining: {df.isnull().sum().sum()}")
    return df


def remove_outliers(df: pd.DataFrame, score_cols: list) -> pd.DataFrame:
    before = len(df)
    for col in score_cols:
        if col not in df.columns:
            continue
        Q1, Q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        IQR = Q3 - Q1
        df = df[(df[col] >= Q1 - 1.5 * IQR) & (df[col] <= Q3 + 1.5 * IQR)]
    print(f"✅ Removed {before - len(df)} outlier rows. Remaining: {len(df):,}")
    return df


def encode_and_scale(df: pd.DataFrame, label_col: str, feature_cols: list):
    le = LabelEncoder()
    df["label"] = le.fit_transform(df[label_col])

    scaler = StandardScaler()
    df[feature_cols] = scaler.fit_transform(df[feature_cols])

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(le,     MODEL_DIR + "label_encoder.pkl")
    joblib.dump(scaler, MODEL_DIR + "scaler.pkl")
    print(f"✅ LabelEncoder + Scaler saved to {MODEL_DIR}")
    return df, le, scaler


def split_and_save(df: pd.DataFrame, feature_cols: list):
    X, y = df[feature_cols], df["label"]
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
    )

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for name, data in [
        ("X_train", X_train), ("X_val", X_val), ("X_test", X_test),
        ("y_train", y_train), ("y_val", y_val), ("y_test", y_test),
    ]:
        data.to_csv(OUTPUT_DIR + f"{name}.csv", index=False)

    print(f"✅ Saved splits: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",     default="data/raw/huit_admissions_data.csv")
    parser.add_argument("--label_col", default="major")
    # TODO: Cập nhật danh sách môn thi thật
    parser.add_argument("--score_cols", nargs="+",
                        default=["toan", "van", "ly", "hoa", "sinh", "anh", "su", "dia"])
    args = parser.parse_args()

    df = load_data(args.input)
    df = handle_missing(df)
    df = remove_outliers(df, args.score_cols)
    feature_cols = [c for c in args.score_cols if c in df.columns]
    df, _, _ = encode_and_scale(df, args.label_col, feature_cols)
    split_and_save(df, feature_cols)
    print("\n🎉 Preprocessing complete! → Chạy tiếp: python train.py")


if __name__ == "__main__":
    main()
