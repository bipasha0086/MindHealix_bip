"""
Dataset and Model Training Script
Generates sample data or uses Kaggle input and trains the stress prediction model
"""
import argparse
import re
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, f1_score
import pickle
import os


DEFAULT_CSV_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'Sleep_health_and_lifestyle_dataset.csv'
)


def _normalize_col_name(name):
    """Normalize column names for robust matching."""
    return re.sub(r'[^a-z0-9]+', '', str(name).lower())


def _find_column(df, candidates):
    """Find a dataframe column by normalized aliases."""
    col_map = {_normalize_col_name(c): c for c in df.columns}
    for candidate in candidates:
        hit = col_map.get(_normalize_col_name(candidate))
        if hit is not None:
            return hit
    return None


def _map_stress_to_label(stress_1_to_10):
    """Map stress scale 1-10 to model labels: 0=Low, 1=Medium, 2=High."""
    if stress_1_to_10 <= 3:
        return 0
    if stress_1_to_10 <= 7:
        return 1
    return 2


def _safe_numeric(series, fallback=0.0):
    """Convert a series to numeric and fill NaN with fallback."""
    return pd.to_numeric(series, errors='coerce').fillna(fallback)


def _derive_proxy_features_from_sleep_dataset(source_df, valid_mask):
    """
    Derive model features without target leakage from optional health/lifestyle columns.

    This keeps training realistic for deployment while still using available Kaggle signals.
    """
    rng = np.random.default_rng(42)
    filtered = source_df.loc[valid_mask].copy()

    quality_col = _find_column(filtered, ['Quality of Sleep', 'quality_sleep', 'sleep_quality'])
    activity_col = _find_column(filtered, ['Physical Activity Level', 'physical_activity', 'activity_level'])
    steps_col = _find_column(filtered, ['Daily Steps', 'steps', 'daily_steps'])
    heart_col = _find_column(filtered, ['Heart Rate', 'heart_rate'])
    disorder_col = _find_column(filtered, ['Sleep Disorder', 'sleep_disorder'])
    bmi_col = _find_column(filtered, ['BMI Category', 'bmi_category'])

    quality = _safe_numeric(filtered[quality_col], fallback=6.0) if quality_col else pd.Series(6.0, index=filtered.index)
    activity = _safe_numeric(filtered[activity_col], fallback=45.0) if activity_col else pd.Series(45.0, index=filtered.index)
    steps = _safe_numeric(filtered[steps_col], fallback=6500.0) if steps_col else pd.Series(6500.0, index=filtered.index)
    heart = _safe_numeric(filtered[heart_col], fallback=75.0) if heart_col else pd.Series(75.0, index=filtered.index)

    quality_norm = ((quality - 1.0) / 9.0).clip(0.0, 1.0)
    activity_norm = (activity / 120.0).clip(0.0, 1.0)
    steps_norm = (steps / 12000.0).clip(0.0, 1.0)
    heart_stability = (1.0 - ((heart - 55.0) / 45.0).clip(0.0, 1.0)).clip(0.0, 1.0)

    if disorder_col:
        disorder = filtered[disorder_col].astype(str).str.lower().str.strip()
        disorder_penalty = np.where(disorder.isin(['none', 'nan', '']), 0.0, 0.18)
    else:
        disorder_penalty = np.zeros(len(filtered))

    if bmi_col:
        bmi = filtered[bmi_col].astype(str).str.lower().str.strip()
        bmi_penalty = np.where(
            bmi.str.contains('obese'), 0.22,
            np.where(
                bmi.str.contains('overweight'), 0.12,
                np.where(bmi.str.contains('underweight'), 0.08, 0.0)
            )
        )
    else:
        bmi_penalty = np.zeros(len(filtered))

    # Wellness signal from independent physiological/lifestyle indicators.
    wellness = (
        0.34 * quality_norm
        + 0.23 * activity_norm
        + 0.23 * steps_norm
        + 0.20 * heart_stability
        - disorder_penalty
        - bmi_penalty
        + rng.normal(0, 0.04, len(filtered))
    ).clip(0.0, 1.0)

    mood_signal = wellness.clip(0.0, 1.0)

    # Map wellness signal to discrete mood categories used by the app.
    mood = pd.cut(
        mood_signal,
        bins=[0.0, 0.25, 0.40, 0.58, 0.74, 0.87, 1.0],
        labels=['Stressed', 'Anxious', 'Sad', 'Neutral', 'Excited', 'Happy'],
        include_lowest=True,
    ).astype(str)

    mood_value_map = {
        'Happy': 0.2,
        'Excited': 0.3,
        'Neutral': 0.5,
        'Sad': 0.7,
        'Anxious': 0.85,
        'Stressed': 0.9,
    }

    mood_value = mood.map(mood_value_map).astype(float)

    # Sentiment proxy from wellness signal (independent from target stress label).
    sentiment_score = np.clip(((mood_signal - 0.5) * 2.0) + rng.normal(0, 0.08, len(filtered)), -1.0, 1.0)

    return mood, mood_value, sentiment_score


def _select_low_overfit_candidate(search, score_tolerance=0.004):
    """
    Pick a candidate with near-best CV score but lower overfitting risk.

    Strategy:
    - Keep candidates within tolerance of the best validation score.
    - Prefer smallest train-vs-validation CV gap.
    - Break ties by higher validation score.
    """
    cv_results = search.cv_results_
    mean_test = np.array(cv_results['mean_test_score'])
    mean_train = np.array(cv_results['mean_train_score'])
    params = cv_results['params']

    best_score = float(np.max(mean_test))
    keep_mask = mean_test >= (best_score - score_tolerance)
    kept_idx = np.where(keep_mask)[0]

    if len(kept_idx) == 0:
        best_idx = int(np.argmax(mean_test))
        return params[best_idx], best_idx, float(mean_test[best_idx]), float(mean_train[best_idx] - mean_test[best_idx])

    kept_gaps = mean_train[kept_idx] - mean_test[kept_idx]
    min_gap = float(np.min(kept_gaps))
    tight_idx = kept_idx[np.where(np.isclose(kept_gaps, min_gap))[0]]

    # If multiple candidates have same minimal gap, choose the best validation score.
    chosen_idx = int(tight_idx[np.argmax(mean_test[tight_idx])])
    chosen_gap = float(mean_train[chosen_idx] - mean_test[chosen_idx])
    chosen_score = float(mean_test[chosen_idx])

    return params[chosen_idx], chosen_idx, chosen_score, chosen_gap


def load_kaggle_sleep_dataset(csv_path):
    """
    Load and convert the Kaggle Sleep Health and Lifestyle dataset to model schema.

    Required source columns (name variants supported):
    - Sleep Duration
    - Stress Level

    Returns:
        DataFrame: Converted dataset with model-ready columns
    """
    source_df = pd.read_csv(csv_path)

    sleep_col = _find_column(source_df, [
        'Sleep Duration', 'Sleep Duration (hours)', 'sleep_duration', 'sleep hours'
    ])
    stress_col = _find_column(source_df, [
        'Stress Level', 'Stress Level (scale: 1-10)', 'stress_level', 'stress level'
    ])

    if sleep_col is None or stress_col is None:
        raise ValueError(
            'Input CSV does not have expected Sleep Duration and Stress Level columns.'
        )

    df = pd.DataFrame()
    df['sleep_hours'] = pd.to_numeric(source_df[sleep_col], errors='coerce')
    stress_raw = pd.to_numeric(source_df[stress_col], errors='coerce')

    # Keep valid rows only.
    valid = (
        df['sleep_hours'].between(0, 24, inclusive='both')
        & stress_raw.between(1, 10, inclusive='both')
    )
    df = df.loc[valid].copy()
    stress_raw = stress_raw.loc[valid]

    # Model label expected by current classifier.
    df['stress_level'] = stress_raw.apply(_map_stress_to_label).astype(int)

    # Keep stress score for analysis output only (not as model feature).
    stress_score = ((stress_raw - 1.0) / 9.0).clip(0.0, 1.0)
    df['stress_score'] = stress_score.values

    # IMPORTANT: derive training features from independent health/lifestyle columns,
    # avoiding target leakage from stress labels.
    mood, mood_value, sentiment_score = _derive_proxy_features_from_sleep_dataset(source_df, valid)
    df['mood'] = mood.values
    df['mood_value'] = mood_value.values
    df['sentiment_score'] = sentiment_score

    if df.empty:
        raise ValueError('No valid rows found in input CSV after cleaning.')

    return df[['mood', 'mood_value', 'sentiment_score', 'sleep_hours', 'stress_score', 'stress_level']]


def load_training_dataset(preferred_csv_path=None, synthetic_samples=1000):
    """
    Load Kaggle dataset if available; otherwise generate synthetic data.

    Args:
        preferred_csv_path: Explicit CSV path from CLI
        synthetic_samples: Number of synthetic rows if fallback is used

    Returns:
        tuple: (dataframe, source_name)
    """
    candidate_paths = []
    if preferred_csv_path:
        candidate_paths.append(preferred_csv_path)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidate_paths.extend([
        DEFAULT_CSV_PATH,
        os.path.join(os.getcwd(), 'Sleep_health_and_lifestyle_dataset.csv'),
    ])

    for path in candidate_paths:
        if path and os.path.exists(path):
            converted = load_kaggle_sleep_dataset(path)
            return converted, f'Kaggle CSV ({path})'

    return generate_sample_dataset(n_samples=synthetic_samples), 'Synthetic generated dataset'

# Create sample training data
def generate_sample_dataset(n_samples=1000):
    """
    Generate sample mental health dataset
    
    Returns:
        DataFrame: Sample dataset with features and labels
    """
    np.random.seed(42)
    
    moods = ['Happy', 'Neutral', 'Sad', 'Stressed', 'Anxious', 'Excited']
    mood_stress = {'Happy': 0.2, 'Excited': 0.3, 'Neutral': 0.5, 'Sad': 0.7, 'Stressed': 0.9, 'Anxious': 0.85}
    
    data = []
    
    for _ in range(n_samples):
        mood = np.random.choice(moods)
        mood_value = mood_stress[mood]
        
        # Gener
        # ate sentiment score correlated with mood
        if mood in ['Happy', 'Excited']:
            sentiment = np.random.uniform(0.3, 1.0)
        elif mood in ['Sad', 'Stressed', 'Anxious']:
            sentiment = np.random.uniform(-1.0, -0.2)
        else:
            sentiment = np.random.uniform(-0.3, 0.3)
        
        # Generate sleep hours
        sleep = np.random.uniform(4, 9)
        
        # Calculate stress score
        stress_score = mood_value + (abs(sentiment) * 0.2 if sentiment < 0 else -sentiment * 0.1)
        if sleep < 6:
            stress_score += (6 - sleep) * 0.1
        elif sleep > 8:
            stress_score -= 0.1
        
        stress_score = max(0, min(1, stress_score))
        
        # Assign stress level
        if stress_score < 0.4:
            stress_level = 0  # Low
        elif stress_score < 0.7:
            stress_level = 1  # Medium
        else:
            stress_level = 2  # High
        
        data.append({
            'mood': mood,
            'mood_value': mood_value,
            'sentiment_score': sentiment,
            'sleep_hours': sleep,
            'stress_score': stress_score,
            'stress_level': stress_level
        })
    
    return pd.DataFrame(data)

def train_stress_model(df, save_path='trained_models'):
    """
    Train Random Forest model for stress prediction
    
    Args:
        df: Training dataframe
        save_path: Path to save trained model
        
    Returns:
        tuple: (model, accuracy, report)
    """
    # Prepare features and labels
    X = df[['mood_value', 'sentiment_score', 'sleep_hours']].values
    y = df['stress_level'].values
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Tune Random Forest with stratified cross-validation for stronger generalization.
    base_model = RandomForestClassifier(random_state=42)
    param_distributions = {
        # Conservative search space focused on generalization.
        'n_estimators': [100, 120, 160, 200],
        'max_depth': [4, 5, 6, 7],
        'min_samples_split': [8, 12, 16, 20],
        'min_samples_leaf': [4, 6, 8, 10],
        'max_features': ['sqrt'],
        'bootstrap': [True],
        'class_weight': ['balanced', 'balanced_subsample'],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        estimator=base_model,
        param_distributions=param_distributions,
        n_iter=20,
        scoring='f1_macro',
        cv=cv,
        random_state=42,
        n_jobs=-1,
        verbose=0,
        return_train_score=True,
    )

    search.fit(X_train, y_train)

    chosen_params, chosen_idx, chosen_cv_score, chosen_cv_gap = _select_low_overfit_candidate(search)
    model = RandomForestClassifier(random_state=42, **chosen_params)
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_train_pred = model.predict(X_train)
    y_pred = model.predict(X_test)
    train_accuracy = accuracy_score(y_train, y_train_pred)
    accuracy = accuracy_score(y_test, y_pred)
    train_f1_macro = f1_score(y_train, y_train_pred, average='macro')
    f1_macro = f1_score(y_test, y_pred, average='macro')
    report = classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High'])
    
    # Save model
    os.makedirs(save_path, exist_ok=True)
    model_file = os.path.join(save_path, 'stress_model.pkl')
    with open(model_file, 'wb') as f:
        pickle.dump(model, f)

    metadata = {
        'best_params': chosen_params,
        'search_best_params': search.best_params_,
        'search_best_f1_macro': float(search.best_score_),
        'selected_candidate_index': int(chosen_idx),
        'selected_cv_f1_macro': float(chosen_cv_score),
        'selected_cv_train_val_gap': float(chosen_cv_gap),
        'train_accuracy': float(train_accuracy),
        'test_accuracy': float(accuracy),
        'train_f1_macro': float(train_f1_macro),
        'test_f1_macro': float(f1_macro),
        'train_test_accuracy_gap': float(train_accuracy - accuracy),
        'train_test_f1_gap': float(train_f1_macro - f1_macro),
        'training_rows': int(len(df)),
        'features': ['mood_value', 'sentiment_score', 'sleep_hours'],
    }
    metadata_file = os.path.join(save_path, 'stress_model_metadata.json')
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"Model saved to {model_file}")
    
    return model, accuracy, f1_macro, report, chosen_params, chosen_cv_score, chosen_cv_gap, train_accuracy, train_f1_macro

def main():
    """Main training pipeline"""
    parser = argparse.ArgumentParser(description='Train stress model from Kaggle CSV or synthetic data')
    parser.add_argument(
        '--csv-path',
        type=str,
        default=DEFAULT_CSV_PATH,
        help='Path to Sleep_health_and_lifestyle_dataset.csv'
    )
    parser.add_argument(
        '--synthetic-samples',
        type=int,
        default=1000,
        help='Synthetic sample count when CSV is unavailable'
    )
    args = parser.parse_args()

    print("=" * 70)
    print("AI Mental Health Support - Model Training")
    print("=" * 70)
    
    print("\nLoading dataset...")
    df, source = load_training_dataset(
        preferred_csv_path=args.csv_path,
        synthetic_samples=args.synthetic_samples
    )
    print(f"Using: {source}")
    print(f"Rows loaded: {len(df)}")
    
    # Display dataset info
    print(f"\nDataset shape: {df.shape}")
    print(f"\nStress level distribution:")
    print(df['stress_level'].value_counts().sort_index())
    print(f"\nMood distribution:")
    print(df['mood'].value_counts())
    
    # Save dataset
    dataset_path = 'mental_health_data.csv'
    df.to_csv(dataset_path, index=False)
    print(f"\n✓ Dataset saved to {dataset_path}")
    
    # Train model
    print("\n🤖 Training stress prediction model...")
    model, accuracy, f1_macro, report, best_params, cv_best_score, cv_gap, train_accuracy, train_f1 = train_stress_model(df)
    
    print(f"\n✓ Model trained successfully!")
    print(f"\nAccuracy: {accuracy:.2%}")
    print(f"Train Accuracy: {train_accuracy:.2%}")
    print(f"Train-Test Accuracy Gap: {(train_accuracy - accuracy):.2%}")
    print(f"F1 (macro): {f1_macro:.4f}")
    print(f"Train F1 (macro): {train_f1:.4f}")
    print(f"Train-Test F1 Gap: {(train_f1 - f1_macro):.4f}")
    print(f"CV Best F1 (macro): {cv_best_score:.4f}")
    print(f"CV Train-Validation Gap: {cv_gap:.4f}")
    print("\nBest Hyperparameters:")
    for key, value in best_params.items():
        print(f"  {key}: {value}")
    print("\nClassification Report:")
    print(report)
    
    # Feature importance
    feature_names = ['Mood Value', 'Sentiment Score', 'Sleep Hours']
    importances = model.feature_importances_
    print("\nFeature Importance:")
    for name, importance in zip(feature_names, importances):
        print(f"  {name}: {importance:.3f}")
    
    print("\n" + "=" * 70)
    print("Training completed successfully! ✨")
    print("=" * 70)

if __name__ == "__main__":
    main()
