"""
CNN model definition for binary face stress classification.

This file only contains model-building logic so it can be reused by both
training and prediction scripts.
"""

from tensorflow.keras import layers, models


def build_stress_cnn(input_shape=(64, 64, 1), num_classes=1):
    """
    Build a beginner-friendly CNN for stressed vs not stressed prediction.

    Args:
        input_shape: Shape of the input image tensor.
        num_classes: Number of output classes. Binary classification uses 1.

    Returns:
        A compiled Keras model.
    """
    model = models.Sequential(
        [
            layers.Input(shape=input_shape),
            layers.Conv2D(32, (3, 3), activation="relu", padding="same"),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            layers.Conv2D(64, (3, 3), activation="relu", padding="same"),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            layers.Conv2D(128, (3, 3), activation="relu", padding="same"),
            layers.BatchNormalization(),
            layers.MaxPooling2D((2, 2)),
            layers.Dropout(0.25),
            layers.Flatten(),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.4),
            layers.Dense(64, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation="sigmoid"),
        ]
    )

    model.compile(
        optimizer="adam",
        loss="binary_crossentropy",
        metrics=["accuracy"],
    )
    return model