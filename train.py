"""
Train a CNN to detect stress from facial expression images.

Expected dataset examples:
1. stress_images/not_stressed/*.jpg and stress_images/stressed/*.jpg
2. stress_images/low/... , stress_images/medium/... , stress_images/high/...

For the existing repository dataset, this script maps:
low -> not stressed
medium -> stressed
high -> stressed
"""

import argparse
import os

import matplotlib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, precision_score, recall_score
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

from model import build_stress_cnn
from utils import (
    DEFAULT_DATASET_ROOT,
    plot_confusion_matrix,
    plot_training_history,
    save_metadata,
    load_dataset,
    split_dataset,
)


matplotlib.use("Agg")


def parse_args():
    parser = argparse.ArgumentParser(description="Train a facial stress detection CNN")
    parser.add_argument(
        "--dataset",
        default=DEFAULT_DATASET_ROOT,
        help="Path to the root dataset folder",
    )
    parser.add_argument(
        "--image-size",
        type=int,
        default=64,
        help="Image width and height after resizing",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=20,
        help="Number of training epochs",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Mini-batch size used during training",
    )
    parser.add_argument(
        "--output-dir",
        default="trained_models/face_stress_cnn",
        help="Directory used to save trained model and reports",
    )
    parser.add_argument(
        "--disable-face-detection",
        action="store_true",
        help="Skip OpenCV face detection during preprocessing",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    image_size = (args.image_size, args.image_size)
    detect_faces = not args.disable_face_detection

    print("Loading dataset...")
    images, labels, image_paths = load_dataset(
        dataset_root=args.dataset,
        image_size=image_size,
        detect_faces=detect_faces,
    )

    x_train, x_test, y_train, y_test = split_dataset(images, labels)

    print(f"Total images: {len(images)}")
    print(f"Training samples: {len(x_train)}")
    print(f"Testing samples: {len(x_test)}")

    model = build_stress_cnn(input_shape=(args.image_size, args.image_size, 1))
    model.summary()

    os.makedirs(args.output_dir, exist_ok=True)
    best_model_path = os.path.join(args.output_dir, "stress_detection_model.keras")

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, verbose=1),
        ModelCheckpoint(best_model_path, monitor="val_accuracy", save_best_only=True, verbose=1),
    ]

    print("Training model...")
    history = model.fit(
        x_train,
        y_train,
        validation_split=0.2,
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks,
        verbose=1,
    )

    print("Evaluating model...")
    probabilities = model.predict(x_test, verbose=0).flatten()
    y_pred = (probabilities >= 0.5).astype(int)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)

    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Not Stressed", "Stressed"], zero_division=0))

    plot_training_history(history, output_dir=args.output_dir)
    plot_confusion_matrix(y_test, y_pred, output_dir=args.output_dir)

    results_frame = pd.DataFrame(
        {
            "image_path": image_paths[: len(images)],
            "label": labels[: len(images)],
        }
    )
    results_frame.to_csv(os.path.join(args.output_dir, "dataset_index.csv"), index=False)

    metadata = {
        "dataset_path": os.path.abspath(args.dataset),
        "image_size": args.image_size,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "train_samples": int(len(x_train)),
        "test_samples": int(len(x_test)),
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "model_path": os.path.abspath(best_model_path),
        "face_detection_used": detect_faces,
        "binary_mapping": {
            "low": "Not Stressed",
            "medium": "Stressed",
            "high": "Stressed",
        },
    }
    save_metadata(metadata, os.path.join(args.output_dir, "training_metadata.json"))

    print("\nTraining complete.")
    print(f"Saved model: {best_model_path}")
    print(f"Saved plots and reports in: {os.path.abspath(args.output_dir)}")


if __name__ == "__main__":
    main()