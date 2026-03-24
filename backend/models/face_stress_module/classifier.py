"""
Image-based face stress classifier.

This module loads a trained Keras model when available and provides a single
prediction function for camera frames sent by the frontend.
"""

import base64
import os

import numpy as np
import joblib

try:
    import cv2
    _CV2_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover
    cv2 = None
    _CV2_IMPORT_ERROR = str(exc)


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
MODEL_PATH_CANDIDATES = [
    os.path.join(PROJECT_ROOT, 'trained_models', 'face_stress_cnn', 'stress_detection_model.keras'),
    os.path.join(PROJECT_ROOT, 'trained_models', 'face_stress_cnn', 'stress_detection_model.pkl'),
    os.path.join(PROJECT_ROOT, 'trained_models', 'image_stress_classifier.keras'),
]
IMAGE_SIZE = (64, 64)
CLASS_LABELS_BINARY = ['Not Stressed', 'Stressed']
CLASS_LEVEL_NAMES = ['Low', 'Medium', 'High']

_MODEL = None
_MODEL_TYPE = None
_MODEL_STATUS = {
    'loaded': False,
    'source': 'unavailable',
    'model_path': None,
    'reason': 'Model has not been initialized yet.',
}


def _load_keras_model(model_path):
    try:
        from tensorflow.keras.models import load_model
    except Exception:
        from keras.models import load_model

    return load_model(model_path)


def _load_sklearn_model(model_path):
    return joblib.load(model_path)


def _load_class_names_from_metadata(model_path):
    metadata_path = os.path.join(os.path.dirname(model_path), 'training_metadata.json')
    if not os.path.exists(metadata_path):
        return None

    try:
        import json

        with open(metadata_path, 'r', encoding='utf-8') as fp:
            metadata = json.load(fp)
        class_names = metadata.get('class_names')
        if isinstance(class_names, list) and class_names:
            return [str(name) for name in class_names]
    except Exception:
        return None

    return None


def _initialize_model():
    global _MODEL, _MODEL_TYPE

    if _MODEL is not None:
        return _MODEL

    if cv2 is None:
        _MODEL_STATUS.update(
            {
                'loaded': False,
                'source': 'unavailable',
                'model_path': None,
                'reason': f'OpenCV is not installed: {_CV2_IMPORT_ERROR}',
            }
        )
        return None

    for candidate in MODEL_PATH_CANDIDATES:
        if not os.path.exists(candidate):
            continue

        try:
            if candidate.lower().endswith('.pkl'):
                _MODEL = _load_sklearn_model(candidate)
                _MODEL_TYPE = 'sklearn'
            else:
                _MODEL = _load_keras_model(candidate)
                _MODEL_TYPE = 'keras'

            _MODEL_STATUS.update(
                {
                    'loaded': True,
                    'source': 'image_ml_model',
                    'model_path': candidate,
                    'model_type': _MODEL_TYPE,
                    'reason': 'Loaded successfully.',
                }
            )
            return _MODEL
        except Exception as exc:  # pragma: no cover
            _MODEL_STATUS.update(
                {
                    'loaded': False,
                    'source': 'unavailable',
                    'model_path': candidate,
                    'model_type': None,
                    'reason': f'Failed to load model: {exc}',
                }
            )

    _MODEL_STATUS.update(
        {
            'loaded': False,
            'source': 'unavailable',
            'model_path': None,
            'model_type': None,
            'reason': 'No trained face stress model file was found.',
        }
    )
    return None


def get_face_model_status():
    """Return current image model availability information."""
    _initialize_model()
    return dict(_MODEL_STATUS)


def _decode_data_url(image_data):
    if cv2 is None:
        raise RuntimeError('OpenCV is required for image decoding.')

    if not image_data or ',' not in image_data:
        raise ValueError('Expected a base64 image data URL.')

    encoded = image_data.split(',', 1)[1]
    image_bytes = base64.b64decode(encoded)
    np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('Could not decode image bytes.')
    return image


def _detect_largest_face(image):
    if cv2 is None:
        raise RuntimeError('OpenCV is required for face detection.')

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    classifier = cv2.CascadeClassifier(cascade_path)
    faces = classifier.detectMultiScale(gray, scaleFactor=1.3, minNeighbors=5)

    if len(faces) == 0:
        return image, False

    x, y, width, height = max(faces, key=lambda box: box[2] * box[3])
    return image[y:y + height, x:x + width], True


def _preprocess_image(image):
    face_region, face_found = _detect_largest_face(image)
    gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, IMAGE_SIZE)
    normalized = resized.astype('float32') / 255.0
    batched = normalized.reshape(1, IMAGE_SIZE[0], IMAGE_SIZE[1], 1)
    flat = normalized.reshape(1, IMAGE_SIZE[0] * IMAGE_SIZE[1])
    return batched, flat, resized, face_found


def _extract_hog_features(gray_uint8):
    hog = cv2.HOGDescriptor(
        (64, 64),
        (16, 16),
        (8, 8),
        (8, 8),
        9,
    )
    return hog.compute(gray_uint8).reshape(1, -1)


def _prepare_sklearn_features(model, flat_input, resized_uint8):
    # Use the feature dimensionality expected by the model to choose preprocessing.
    n_features = getattr(model, 'n_features_in_', None)
    if n_features is None and hasattr(model, 'steps') and model.steps:
        final_estimator = model.steps[-1][1]
        n_features = getattr(final_estimator, 'n_features_in_', None)

    hog_input = _extract_hog_features(resized_uint8)
    if n_features is None:
        # Prefer HOG for newer multiclass models.
        return hog_input

    if int(n_features) == int(hog_input.shape[1]):
        return hog_input

    return flat_input


def _predict_probability(model, keras_input, flat_input):
    if _MODEL_TYPE == 'keras':
        return float(model.predict(keras_input, verbose=0)[0][0])

    if hasattr(model, 'predict_proba'):
        return float(model.predict_proba(flat_input)[0][1])

    score = float(model.decision_function(flat_input)[0])
    return float(1.0 / (1.0 + np.exp(-score)))


def _predict_multiclass(model, feature_input):
    classes = getattr(model, 'classes_', None)
    if classes is None:
        return None

    classes = list(classes)
    if len(classes) < 3:
        return None

    probabilities = None
    if hasattr(model, 'predict_proba'):
        probabilities = model.predict_proba(feature_input)[0]
    elif hasattr(model, 'decision_function'):
        scores = np.asarray(model.decision_function(feature_input)).reshape(-1)
        shifted = scores - np.max(scores)
        exp_scores = np.exp(shifted)
        denom = np.sum(exp_scores)
        if denom <= 0:
            return None
        probabilities = exp_scores / denom
    else:
        return None

    best_index = int(np.argmax(probabilities))
    class_value = int(classes[best_index])

    metadata_names = _load_class_names_from_metadata(_MODEL_STATUS.get('model_path') or '')
    class_names = metadata_names if metadata_names and len(metadata_names) > class_value else CLASS_LEVEL_NAMES
    stress_level = class_names[class_value] if class_value < len(class_names) else CLASS_LEVEL_NAMES[min(class_value, 2)]

    stress_score = round((class_value / 2.0) * 100.0, 2)
    confidence = float(probabilities[best_index])

    return {
        'stress_label': stress_level,
        'stress_level': stress_level,
        'stress_score': stress_score,
        'confidence': round(confidence, 4),
        'class_index': class_value,
        'class_probabilities': {
            str(class_names[int(c)] if int(c) < len(class_names) else c): round(float(probabilities[idx]), 4)
            for idx, c in enumerate(classes)
        },
        'prediction_source': 'image_ml_model_multiclass',
    }


def predict_face_stress_from_image(image_data):
    """
    Predict stressed vs not stressed from a base64 image frame.

    Returns:
        dict | None: Prediction details if model is available, otherwise None.
    """
    model = _initialize_model()
    if model is None:
        return None

    image = _decode_data_url(image_data)
    keras_input, flat_input, resized_uint8, face_found = _preprocess_image(image)

    if _MODEL_TYPE == 'sklearn':
        sklearn_input = _prepare_sklearn_features(model, flat_input, resized_uint8)
        multiclass = _predict_multiclass(model, sklearn_input)
        if multiclass is not None:
            multiclass.update(
                {
                    'face_detected': face_found,
                    'model_path': _MODEL_STATUS['model_path'],
                    'model_type': _MODEL_STATUS.get('model_type'),
                    'disclaimer': 'Experimental wellness signal. Not a medical diagnosis.',
                }
            )
            return multiclass

    probability = _predict_probability(model, keras_input, flat_input)
    predicted_index = 1 if probability >= 0.5 else 0
    confidence = probability if predicted_index == 1 else 1.0 - probability
    stress_score = round(probability * 100, 2)
    stress_level = 'High' if probability >= 0.7 else 'Medium' if probability >= 0.45 else 'Low'

    return {
        'stress_label': CLASS_LABELS_BINARY[predicted_index],
        'stress_level': stress_level,
        'stress_score': stress_score,
        'confidence': round(confidence, 4),
        'prediction_source': 'image_ml_model',
        'face_detected': face_found,
        'model_path': _MODEL_STATUS['model_path'],
        'model_type': _MODEL_STATUS.get('model_type'),
        'disclaimer': 'Experimental wellness signal. Not a medical diagnosis.',
    }
