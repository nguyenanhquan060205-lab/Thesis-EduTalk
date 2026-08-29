"""
train.py — Script huấn luyện model XGBoost + lưu Cosine profiles
Chạy: python train.py
"""
import os
import joblib
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import GridSearchCV, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
from sklearn.metrics.pairwise import cosine_similarity

DATA_DIR  = "data/processed/"
MODEL_DIR = "models/"


def load_splits():
    X_train = pd.read_csv(DATA_DIR + "X_train.csv")
    X_val   = pd.read_csv(DATA_DIR + "X_val.csv")
    X_test  = pd.read_csv(DATA_DIR + "X_test.csv")
    y_train = pd.read_csv(DATA_DIR + "y_train.csv").squeeze()
    y_val   = pd.read_csv(DATA_DIR + "y_val.csv").squeeze()
    y_test  = pd.read_csv(DATA_DIR + "y_test.csv").squeeze()
    le      = joblib.load(MODEL_DIR + "label_encoder.pkl")
    print(f"✅ Loaded: train={len(X_train)}, val={len(X_val)}, test={len(X_test)}")
    return X_train, X_val, X_test, y_train, y_val, y_test, le


def train_xgboost(X_train, y_train, X_val, y_val, le):
    print("\n🤖 Training XGBoost...")
    param_grid = {
        "n_estimators":  [100, 200],
        "max_depth":     [3, 5],
        "learning_rate": [0.1, 0.2],
        "subsample":     [0.8, 1.0],
    }
    xgb = XGBClassifier(random_state=42, eval_metric="mlogloss", verbosity=0)
    grid = GridSearchCV(xgb, param_grid, cv=5, scoring="accuracy",
                        n_jobs=-1, verbose=1)
    grid.fit(X_train, y_train)

    best = grid.best_estimator_
    print(f"✅ Best params: {grid.best_params_}")
    print(f"✅ CV accuracy: {grid.best_score_:.4f}")

    val_acc = accuracy_score(y_val, best.predict(X_val))
    print(f"✅ Val accuracy: {val_acc:.4f}")
    return best


def build_cosine_profiles(X_train, y_train):
    """Tính vector điểm trung bình cho mỗi ngành."""
    X = X_train.copy()
    X["label"] = y_train.values
    profiles = X.groupby("label").mean()
    return profiles


def evaluate(model, X_test, y_test, le, cosine_profiles):
    y_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_pred)
    print(f"\n🎯 Test Accuracy (XGBoost): {test_acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Cosine similarity accuracy
    sims = cosine_similarity(X_test.values, cosine_profiles.values)
    cosine_acc = accuracy_score(y_test, sims.argmax(axis=1))
    print(f"🎯 Test Accuracy (Cosine top-1): {cosine_acc:.4f}")
    return test_acc


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    X_train, X_val, X_test, y_train, y_val, y_test, le = load_splits()

    # Train XGBoost
    best_xgb = train_xgboost(X_train, y_train, X_val, y_val, le)

    # Build Cosine profiles
    cosine_profiles = build_cosine_profiles(X_train, y_train)

    # Evaluate
    evaluate(best_xgb, X_test, y_test, le, cosine_profiles)

    # Save
    joblib.dump(best_xgb,       MODEL_DIR + "xgboost_model.pkl")
    joblib.dump(cosine_profiles, MODEL_DIR + "cosine_profiles.pkl")
    print(f"\n✅ Models saved to {MODEL_DIR}")
    print("🎉 Training complete! Deploy models vào backend/app/services/predict_service.py")


if __name__ == "__main__":
    main()
