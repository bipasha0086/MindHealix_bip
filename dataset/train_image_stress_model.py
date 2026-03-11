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
                f
                for f in os.listdir(cls_path)
                if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp"))
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


def train_image_classifier(data_dir, output_model_path, output_metadata_path, epochs=12, image_size=224, batch_size=16):
    """Train transfer-learning classifier (MobileNetV2) and save model + metadata."""
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, models
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
        from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
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
    train_ds = train_ds.prefetch(autotune)
    val_ds = val_ds.prefetch(autotune)

    augmentation = tf.keras.Sequential(
        [
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.08),
            layers.RandomZoom(0.1),
            layers.RandomContrast(0.1),
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
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(len(CLASS_NAMES), activation="softmax")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=4, restore_best_weights=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=2, min_lr=1e-6),
    ]

    history = model.fit(train_ds, validation_data=val_ds, epochs=epochs, callbacks=callbacks)

    val_loss, val_acc = model.evaluate(val_ds, verbose=0)
    model.save(output_model_path)

    metadata = {
        "model_type": "image_stress_classifier",
        "classes": CLASS_NAMES,
        "image_size": image_size,
        "batch_size": batch_size,
        "epochs_requested": epochs,
        "epochs_trained": len(history.history.get("loss", [])),
        "val_accuracy": float(val_acc),
        "val_loss": float(val_loss),
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
        help="Training epochs",
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
        image_size=args.image_size,
        batch_size=args.batch_size,
    )

    print("\nTraining completed successfully")
    print(f"Model saved: {model_path}")
    print(f"Metadata saved: {metadata_path}")
    print(f"Validation accuracy: {metadata['val_accuracy']:.4f}")


if __name__ == "__main__":
    main()
