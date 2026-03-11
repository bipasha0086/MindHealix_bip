# Face Stress Dataset Guide

This project supports binary stress classification with either of these folder layouts:

## Option 1: Direct binary folders

dataset/
  stressed/
    image1.jpg
    image2.jpg
  not_stressed/
    image3.jpg
    image4.jpg

## Option 2: Existing repository layout

stress_images/
  low/
    happy/
    neutral/
  medium/
    neutral/
    sad/
    surprise/
  high/
    angry/
    disgust/
    fear/

Current binary mapping used by `train.py`:

- `low` -> `Not Stressed`
- `medium` -> `Stressed`
- `high` -> `Stressed`

If you want a stricter dataset, create only two top-level folders:

- `stressed`
- `not_stressed`

Recommended tips:

- Keep face images clear and front-facing.
- Use balanced numbers of stressed and not-stressed images.
- Remove blurry and duplicate images.
- Try to include different lighting conditions, genders, ages, and skin tones.