"""
Utility helpers for loading, preprocessing, visualizing, and predicting
stress from facial expression images.
"""

import json
import os
from typing import Dict, List, Optional, Tuple

import cv2
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import ConfusionMatrixDisplay, confusion_matrix
from sklearn.model_selection import train_test_split


IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
DEFAULT_DATASET_ROOT = "stress_images"
DEFAULT_CLASS_MAPPING = {
    "low": 0,
    "medium": 1,
    "high": 1,
    "not_stressed": 0,
    "stressed": 1,
}
CLASS_LABELS = ["Not Stressed", "Stressed"]


def ensure_directory(path: str) -> None:
    """Create a directory if it does not already exist."""
    os.makedirs(path, exist_ok=True)


def detect_largest_face(image: np.ndarray, cascade_path: Optional[str] = None) -> np.ndarray:
    """
    Detect the largest face in an image and crop it.

    If no face is found, the original image is returned. This keeps the
    pipeline usable even with imperfect datasets.
    """
    if image is None or image.size == 0:
        raise ValueError("Input image is empty or invalid.")

    if cascade_path is None:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    if len(faces) == 0:
        return image

    x, y, width, height = max(faces, key=lambda box: box[2] * box[3])
    return image[y : y + height, x : x + width]


def preprocess_image(
    image_path: str,
    image_size: Tuple[int, int] = (64, 64),
    detect_face: bool = True,
) -> np.ndarray:
    """
    Load an image from disk and convert it into a normalized model-ready array.
    """
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    if detect_face:
        image = detect_largest_face(image)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, image_size)
    normalized = resized.astype("float32") / 255.0
    return np.expand_dims(normalized, axis=-1)


def _resolve_label_from_path(class_dir_name: str, class_mapping: Dict[str, int]) -> Optional[int]:
    key = class_dir_name.strip().lower()
    return class_mapping.get(key)


def load_dataset(
    dataset_root: str = DEFAULT_DATASET_ROOT,
    image_size: Tuple[int, int] = (64, 64),
    detect_faces: bool = True,
    class_mapping: Optional[Dict[str, int]] = None,
) -> Tuple[np.ndarray, np.ndarray, List[str]]:
    """
    Load a dataset of facial images from folders.

    Supported layouts:
    1. dataset_root/stressed/*.jpg and dataset_root/not_stressed/*.jpg
    2. dataset_root/low/... , dataset_root/medium/... , dataset_root/high/...
       including nested emotion folders like low/happy/*.jpg
    """
    if class_mapping is None:
        class_mapping = DEFAULT_CLASS_MAPPING

    if not os.path.isdir(dataset_root):
        raise FileNotFoundError(f"Dataset folder not found: {dataset_root}")

    images = []
    labels = []
    image_paths = []

    for class_dir in sorted(os.listdir(dataset_root)):
        class_dir_path = os.path.join(dataset_root, class_dir)
        if not os.path.isdir(class_dir_path):
            continue

        label = _resolve_label_from_path(class_dir, class_mapping)
        if label is None:
            continue

        for root, _dirs, files in os.walk(class_dir_path):
            for file_name in files:
                if not file_name.lower().endswith(IMAGE_EXTENSIONS):
                    continue

                image_path = os.path.join(root, file_name)
                try:
                    processed = preprocess_image(
                        image_path=image_path,
                        image_size=image_size,
                        detect_face=detect_faces,
                    )
                except Exception:
                    continue

                images.append(processed)
                labels.append(label)
                image_paths.append(image_path)

    if not images:
        raise ValueError(
            "No valid images were loaded. Check dataset path, file types, and class names."
        )

    return np.array(images), np.array(labels), image_paths


def split_dataset(
    images: np.ndarray,
    labels: np.ndarray,
    test_size: float = 0.2,
    random_state: int = 42,
):
    """Split the dataset into training and testing sets."""
    return train_test_split(
        images,
        labels,
        test_size=test_size,
        random_state=random_state,
        stratify=labels,
    )


def plot_training_history(history, output_dir: str = "outputs") -> None:
    """Plot training and validation accuracy/loss graphs."""
    ensure_directory(output_dir)

    plt.figure(figsize=(12, 5))

    plt.subplot(1, 2, 1)
    plt.plot(history.history["accuracy"], label="Training Accuracy")
    plt.plot(history.history["val_accuracy"], label="Validation Accuracy")
    plt.title("Accuracy Over Epochs")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(history.history["loss"], label="Training Loss")
    plt.plot(history.history["val_loss"], label="Validation Loss")
    plt.title("Loss Over Epochs")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "training_history.png"))
    plt.close()


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    output_dir: str = "outputs",
) -> None:
    """Create and save a confusion matrix plot."""
    ensure_directory(output_dir)
    matrix = confusion_matrix(y_true, y_pred)
    display = ConfusionMatrixDisplay(confusion_matrix=matrix, display_labels=CLASS_LABELS)
    display.plot(cmap="Blues", values_format="d")
    plt.title("Confusion Matrix")
    plt.savefig(os.path.join(output_dir, "confusion_matrix.png"))
    plt.close()


def save_metadata(metadata: Dict, output_path: str) -> None:
    """Save model metadata as JSON."""
    ensure_directory(os.path.dirname(output_path) or ".")
    with open(output_path, "w", encoding="utf-8") as file_pointer:
        json.dump(metadata, file_pointer, indent=2)


def predict_from_array(model, image_array: np.ndarray) -> Dict[str, float]:
    """Run a binary stress prediction on a preprocessed image array."""
    if image_array.ndim == 3:
        image_array = np.expand_dims(image_array, axis=0)

    probability = float(model.predict(image_array, verbose=0)[0][0])
    label = CLASS_LABELS[1] if probability >= 0.5 else CLASS_LABELS[0]
    confidence = probability if probability >= 0.5 else 1.0 - probability

    return {
        "label": label,
        "stress_probability": round(probability, 4),
        "confidence": round(confidence, 4),
    }