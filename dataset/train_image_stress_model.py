"""
Image Stress Classification Training Script

Train a 3-class image classifier for stress level from face images.
Expected classes: low, medium, high

Dataset folder layout:

dataset/stress_images/
  low/
    img1.jpg
    img2.jpg
  medium/
    img1.jpg
  high/
    img1.jpg

Usage:
  python dataset/train_image_stress_model.py --data-dir dataset/stress_images
"""

import argparse
import json
import os
from datetime import datetime
from collections import Counter
from pathlib import Path


CLASS_NAMES = ["low", "medium", "high"]


def validate_dataset(data_dir):
    """Validate expected class subfolders and minimal image count."""
    missing = []
    counts = {}

    for cls in CLASS_NAMES:
        cls_path = os.path.join(data_dir, cls)
        if not os.path.isdir(cls_path):
            missing.append(cls)
            counts[cls] = 0
            continue

        image_count = len(
            [
                p
                for p in Path(cls_path).rglob("*")
                if p.is_file()
                and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
            ]
        )
        counts[cls] = image_count

    if missing:
        raise ValueError(
            "Missing class folders: "
            + ", ".join(missing)
            + " (expected: low, medium, high)"
        )

    min_required = 20
    too_small = [k for k, v in counts.items() if v < min_required]
    if too_small:
        raise ValueError(
            "Each class should have at least "
            + str(min_required)
            + " images. Too small: "
            + ", ".join([f"{k}={counts[k]}" for k in too_small])
        )

    return counts


def _compute_class_weights_from_dataset(train_ds):
    """Compute inverse-frequency class weights from a tf.data training dataset."""
    labels = []
    for _, batch_labels in train_ds:
        labels.extend(batch_labels.numpy().tolist())

    if not labels:
        return None, {}

    counts = Counter(labels)
    total = sum(counts.values())
    num_classes = len(CLASS_NAMES)

    class_weights = {
        int(class_idx): float(total / (num_classes * max(1, count)))
        for class_idx, count in counts.items()
    }
    distribution = {CLASS_NAMES[int(k)]: int(v) for k, v in counts.items()}
    return class_weights, distribution


def _evaluate_multiclass_metrics(val_ds, model):
    """Compute validation accuracy, macro precision/recall/F1, and confusion matrix."""
    try:
        import numpy as np
        from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
    except ImportError as exc:
        raise RuntimeError(
            "scikit-learn and numpy are required for evaluation metrics. Install with: pip install scikit-learn numpy"
        ) from exc

    y_true = []
    y_pred = []

    for images, labels in val_ds:
        probs = model.predict(images, verbose=0)
        preds = np.argmax(probs, axis=1)
        y_true.extend(labels.numpy().tolist())
        y_pred.extend(preds.tolist())

    accuracy = accuracy_score(y_true, y_pred)
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average="macro",
        zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(CLASS_NAMES))))

    return {
        "accuracy": float(accuracy),
        "precision_macro": float(precision_macro),
        "recall_macro": float(recall_macro),
        "f1_macro": float(f1_macro),
        "confusion_matrix": cm.tolist(),
    }


def train_image_classifier(
    data_dir,
    output_model_path,
    output_metadata_path,
    epochs=12,
    fine_tune_epochs=8,
    image_size=224,
    batch_size=16,
):
    """Train transfer-learning classifier (MobileNetV2) and save model + metadata."""
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, models
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
        from tensorflow.keras.preprocessing import image_dataset_from_directory
    except ImportError as exc:
        raise RuntimeError(
            "TensorFlow is required for image training. Install with: pip install tensorflow pillow"
        ) from exc

    tf.random.set_seed(42)

    train_ds = image_dataset_from_directory(
        data_dir,
        labels="inferred",
        label_mode="int",
        class_names=CLASS_NAMES,
        validation_split=0.2,
        subset="training",
        seed=42,
        image_size=(image_size, image_size),
        batch_size=batch_size,
    )

    val_ds = image_dataset_from_directory(
        data_dir,
        labels="inferred",
        label_mode="int",
        class_names=CLASS_NAMES,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=(image_size, image_size),
        batch_size=batch_size,
    )

    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)

    class_weights, train_distribution = _compute_class_weights_from_dataset(train_ds)

    augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.10),
            layers.RandomZoom(0.12),
            layers.RandomContrast(0.15),
            layers.RandomBrightness(0.15),
        ],
        name="augmentation",
    )

    base_model = MobileNetV2(
        input_shape=(image_size, image_size, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = layers.Input(shape=(image_size, image_size, 3))
    x = augmentation(inputs)
    x = preprocess_input(x)
    x = base_model(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.35)(x)
    outputs = layers.Dense(len(CLASS_NAMES), activation="softmax")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["sparse_categorical_accuracy"],
    )

    best_model_path = output_model_path + ".best.keras"
    callbacks = [
        EarlyStopping(monitor="val_loss", patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=2, min_lr=1e-6),
        ModelCheckpoint(best_model_path, monitor="val_loss", save_best_only=True, save_weights_only=False),
    ]

    warmup_history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        callbacks=callbacks,
        class_weight=class_weights,
    )

    # Fine-tune deeper layers after warm-up for better adaptation to facial stress cues.
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False
    for layer in base_model.layers:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["sparse_categorical_accuracy"],
    )

    finetune_history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs + fine_tune_epochs,
        initial_epoch=len(warmup_history.history.get("loss", [])),
        callbacks=callbacks,
        class_weight=class_weights,
    )

    if os.path.exists(best_model_path):
        model = tf.keras.models.load_model(best_model_path)

    val_loss, val_sparse_acc = model.evaluate(val_ds, verbose=0)
    eval_metrics = _evaluate_multiclass_metrics(val_ds, model)
    model.save(output_model_path)

    if os.path.exists(best_model_path):
        os.remove(best_model_path)

    total_epochs_trained = len(finetune_history.history.get("loss", []))

    metadata = {
        "model_type": "image_stress_classifier",
        "classes": CLASS_NAMES,
        "image_size": image_size,
        "batch_size": batch_size,
        "epochs_requested": epochs,
        "fine_tune_epochs_requested": fine_tune_epochs,
        "epochs_trained": total_epochs_trained,
        "class_weights": {CLASS_NAMES[k]: round(v, 6) for k, v in (class_weights or {}).items()},
        "train_distribution": train_distribution,
        "val_accuracy": float(val_sparse_acc),
        "val_loss": float(val_loss),
        "val_precision_macro": eval_metrics["precision_macro"],
        "val_recall_macro": eval_metrics["recall_macro"],
        "val_f1_macro": eval_metrics["f1_macro"],
        "confusion_matrix": eval_metrics["confusion_matrix"],
        "created_at_utc": datetime.utcnow().isoformat() + "Z",
    }

    with open(output_metadata_path, "w", encoding="utf-8") as fp:
        json.dump(metadata, fp, indent=2)

    return metadata


def parse_args():
    parser = argparse.ArgumentParser(description="Train image-based stress classifier")
    parser.add_argument(
        "--data-dir",
        default=os.path.join("dataset", "stress_images"),
        help="Path to class-folder image dataset",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=12,
        help="Warm-up training epochs",
    )
    parser.add_argument(
        "--fine-tune-epochs",
        type=int,
        default=8,
        help="Additional fine-tuning epochs after unfreezing deeper layers",
    )
    parser.add_argument(
        "--image-size",
        type=int,
        default=224,
        help="Image width/height used for training",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16,
        help="Batch size",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 70)
    print("Image Stress Classification Training")
    print("=" * 70)

    data_dir = os.path.abspath(args.data_dir)
    print(f"Dataset path: {data_dir}")

    if not os.path.isdir(data_dir):
        raise FileNotFoundError(
            "Dataset directory not found. Create class folders at: " + data_dir
        )

    counts = validate_dataset(data_dir)
    print("Class distribution:")
    for cls in CLASS_NAMES:
        print(f"  {cls}: {counts[cls]} images")

    output_dir = os.path.abspath("trained_models")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, "image_stress_classifier.keras")
    metadata_path = os.path.join(output_dir, "image_stress_classifier_metadata.json")

    metadata = train_image_classifier(
        data_dir=data_dir,
        output_model_path=model_path,
        output_metadata_path=metadata_path,
        epochs=args.epochs,
        fine_tune_epochs=args.fine_tune_epochs,
        image_size=args.image_size,
        batch_size=args.batch_size,
    )

    print("\nTraining completed successfully")
    print(f"Model saved: {model_path}")
    print(f"Metadata saved: {metadata_path}")
    print(f"Validation accuracy: {metadata['val_accuracy']:.4f}")
    print(f"Validation macro F1: {metadata['val_f1_macro']:.4f}")


if __name__ == "__main__":
    main()
