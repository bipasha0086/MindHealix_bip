"""
Prediction utilities for face stress detection.

Supports:
1. Single image prediction
2. Face detection before prediction
3. Optional real-time webcam prediction
"""

import argparse
import os

import cv2
from tensorflow.keras.models import load_model

from utils import CLASS_LABELS, detect_largest_face, predict_from_array, preprocess_image


def predict_image(model, image_path: str, image_size=(64, 64), detect_face: bool = True):
    """Predict stress level from a single image path."""
    image_array = preprocess_image(
        image_path=image_path,
        image_size=image_size,
        detect_face=detect_face,
    )
    return predict_from_array(model, image_array)


def predict_webcam(model, image_size=(64, 64)):
    """Run real-time webcam prediction with OpenCV face detection."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Unable to open webcam.")

    print("Press 'q' to quit webcam prediction.")

    while True:
        success, frame = cap.read()
        if not success:
            break

        face_crop = detect_largest_face(frame)
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, image_size).astype("float32") / 255.0
        input_array = resized.reshape(1, image_size[0], image_size[1], 1)

        prediction = predict_from_array(model, input_array)
        label = prediction["label"]
        confidence = prediction["confidence"]

        cv2.putText(
            frame,
            f"{label} ({confidence:.2f})",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0) if label == CLASS_LABELS[0] else (0, 0, 255),
            2,
        )
        cv2.imshow("Real-Time Stress Detection", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


def parse_args():
    parser = argparse.ArgumentParser(description="Predict stress from facial expression images")
    parser.add_argument(
        "--model",
        default="trained_models/face_stress_cnn/stress_detection_model.keras",
        help="Path to the trained Keras model",
    )
    parser.add_argument(
        "--image",
        help="Path to a single image for prediction",
    )
    parser.add_argument(
        "--image-size",
        type=int,
        default=64,
        help="Image width and height expected by the model",
    )
    parser.add_argument(
        "--webcam",
        action="store_true",
        help="Use webcam for real-time prediction",
    )
    parser.add_argument(
        "--disable-face-detection",
        action="store_true",
        help="Skip face detection during single-image prediction",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if not os.path.exists(args.model):
        raise FileNotFoundError(f"Trained model not found: {args.model}")

    model = load_model(args.model)
    image_size = (args.image_size, args.image_size)

    if args.webcam:
        predict_webcam(model, image_size=image_size)
        return

    if not args.image:
        raise ValueError("Provide --image for single-image prediction or use --webcam.")

    prediction = predict_image(
        model=model,
        image_path=args.image,
        image_size=image_size,
        detect_face=not args.disable_face_detection,
    )
    print("Prediction result")
    print(f"Image: {os.path.abspath(args.image)}")
    print(f"Label: {prediction['label']}")
    print(f"Stress probability: {prediction['stress_probability']:.4f}")
    print(f"Confidence: {prediction['confidence']:.4f}")


if __name__ == "__main__":
    main()