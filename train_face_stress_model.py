"""
Train a stronger 3-class face-stress image model without TensorFlow.

This script uses HOG features + model selection over multiple classifiers,
then saves the best sklearn pipeline to:
    trained_models/face_stress_cnn/stress_detection_model.pkl

Label mapping:
- low -> 0
- medium -> 1
- high -> 2
"""

import argparse
import json
import os
from collections import defaultdict

import cv2
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
CLASS_MAPPING = {
    "low": 0,
    "medium": 1,
    "high": 2,
}
CLASS_NAMES = ["Low", "Medium", "High"]


def parse_args():
    parser = argparse.ArgumentParser(description="Train face stress classifier (sklearn)")
    parser.add_argument("--dataset", default="stress_images", help="Dataset root")
    parser.add_argument("--image-size", type=int, default=64, help="Square resize value")
    parser.add_argument("--max-samples", type=int, default=12000, help="Max total images to load")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio")
    parser.add_argument(
        "--output-dir",
        default="trained_models/face_stress_cnn",
        help="Output directory for model + metadata",
    )
    parser.add_argument(
        "--feature-type",
        default="hog",
        choices=["hog", "raw"],
        help="Feature extraction method",
    )
    return parser.parse_args()


def extract_hog_features(gray_image):
    # Tuned for 64x64 images.
    hog = cv2.HOGDescriptor(
        (64, 64),
        (16, 16),
        (8, 8),
        (8, 8),
        9,
    )
    return hog.compute(gray_image).reshape(-1)


def detect_largest_face(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)
    if len(faces) == 0:
        return image

    x, y, width, height = max(faces, key=lambda box: box[2] * box[3])
    return image[y : y + height, x : x + width]


def preprocess_image(path, image_size, feature_type="hog"):
    image = cv2.imread(path)
    if image is None:
        return None

    face = detect_largest_face(image)
    gray = cv2.cvtColor(face, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (image_size, image_size))
    normalized = (resized.astype("float32") / 255.0 * 255.0).astype("uint8")

    if feature_type == "hog":
        return extract_hog_features(normalized)

    return (normalized.astype("float32") / 255.0).reshape(-1)


def collect_dataset(dataset_root, image_size, max_samples, feature_type):
    if not os.path.isdir(dataset_root):
        raise FileNotFoundError(f"Dataset not found: {dataset_root}")

    by_class_paths = defaultdict(list)

    for class_dir in sorted(os.listdir(dataset_root)):
        class_path = os.path.join(dataset_root, class_dir)
        if not os.path.isdir(class_path):
            continue

        label = CLASS_MAPPING.get(class_dir.strip().lower())
        if label is None:
            continue

        for root, _dirs, files in os.walk(class_path):
            for file_name in files:
                if file_name.lower().endswith(IMAGE_EXTENSIONS):
                    by_class_paths[label].append(os.path.join(root, file_name))

    class0 = by_class_paths[0]
    class1 = by_class_paths[1]
    class2 = by_class_paths[2]
    if not class0 or not class1 or not class2:
        raise ValueError("Dataset must contain low, medium, and high image folders.")

    per_class_limit = max_samples // 3
    class0 = class0[:per_class_limit]
    class1 = class1[:per_class_limit]
    class2 = class2[:per_class_limit]

    features = []
    labels = []

    for label, paths in ((0, class0), (1, class1), (2, class2)):
        for path in paths:
            vector = preprocess_image(path, image_size, feature_type=feature_type)
            if vector is None:
                continue
            features.append(vector)
            labels.append(label)

    if len(features) < 100:
        raise ValueError("Too few valid images were loaded to train a usable model.")

    return np.array(features), np.array(labels)


def build_candidates():
    return {
        "linear_svc": Pipeline(
            [
                ("scaler", StandardScaler()),
                ("classifier", LinearSVC(C=1.2, class_weight="balanced", random_state=42)),
            ]
        ),
        "logistic": Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "classifier",
                    LogisticRegression(
                        max_iter=2000,
                        class_weight="balanced",
                        random_state=42,
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            [
                (
                    "classifier",
                    RandomForestClassifier(
                        n_estimators=350,
                        max_depth=None,
                        min_samples_split=6,
                        min_samples_leaf=3,
                        class_weight="balanced_subsample",
                        random_state=42,
                        n_jobs=-1,
                    ),
                )
            ]
        ),
    }


def main():
    args = parse_args()

    print("Loading dataset...")
    x, y = collect_dataset(args.dataset, args.image_size, args.max_samples, args.feature_type)
    print(f"Loaded samples: {len(x)}")

    x_train_full, x_test, y_train_full, y_test = train_test_split(
        x,
        y,
        test_size=args.test_size,
        random_state=42,
        stratify=y,
    )

    x_train, x_val, y_train, y_val = train_test_split(
        x_train_full,
        y_train_full,
        test_size=0.2,
        random_state=42,
        stratify=y_train_full,
    )

    candidates = build_candidates()
    best_name = None
    best_model = None
    best_val_acc = -1.0

    print("Selecting best classifier...")
    for name, candidate in candidates.items():
        print(f"  -> Training candidate: {name}")
        candidate.fit(x_train, y_train)
        val_pred = candidate.predict(x_val)
        val_acc = accuracy_score(y_val, val_pred)
        print(f"     Validation accuracy: {val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_name = name
            best_model = candidate

    print(f"Best model: {best_name} (val_acc={best_val_acc:.4f})")

    # Refit best model on full train split before final test evaluation.
    best_model.fit(x_train_full, y_train_full)

    y_pred = best_model.predict(x_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="macro", zero_division=0)
    recall = recall_score(y_test, y_pred, average="macro", zero_division=0)

    print(f"Accuracy : {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall   : {recall:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=CLASS_NAMES, zero_division=0))

    os.makedirs(args.output_dir, exist_ok=True)
    model_path = os.path.join(args.output_dir, "stress_detection_model.pkl")
    metadata_path = os.path.join(args.output_dir, "training_metadata.json")

    joblib.dump(best_model, model_path)

    metadata = {
        "model_type": f"sklearn_{best_name}_multiclass",
        "dataset_path": os.path.abspath(args.dataset),
        "image_size": args.image_size,
        "max_samples": args.max_samples,
        "feature_type": args.feature_type,
        "train_samples": int(len(x_train_full)),
        "validation_samples": int(len(x_val)),
        "test_samples": int(len(x_test)),
        "validation_accuracy": round(float(best_val_acc), 4),
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "model_path": os.path.abspath(model_path),
        "class_mapping": {
            "low": 0,
            "medium": 1,
            "high": 2,
        },
        "class_names": CLASS_NAMES,
    }
    with open(metadata_path, "w", encoding="utf-8") as fp:
        json.dump(metadata, fp, indent=2)

    print("\nSaved model:", model_path)
    print("Saved metadata:", metadata_path)


if __name__ == "__main__":
    main()
