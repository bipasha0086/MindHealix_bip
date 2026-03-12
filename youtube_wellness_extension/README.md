# MindHealix YouTube Wellness Extension

This Chrome extension monitors YouTube watch pages and calls your backend API to detect potentially harmful depression/anxiety-heavy content.

## What it does

- Reads YouTube video metadata (title, channel, description)
- Sends metadata to backend endpoint:
  - `POST /api/youtube/analyze-content`
- Displays a floating panel with:
  - risk level (`low`, `medium`, `high`)
  - warning message
  - safer alternatives
  - `Continue Anyway` bypass button
- Enforcement behavior:
  - risky video gets warnings up to configured limit
  - after the limit is exceeded, that same video is blocked with a full-screen guard overlay
- Forwards optional user-level rules to backend:
  - strict mode
  - warning limit before block
  - allow-list channels
  - blocked topics
  - custom blocked keywords

## Install (Chrome)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `youtube_wellness_extension` folder.
5. Open extension options page and configure backend URL + rule preferences.

## Backend requirements

- Run backend server at `http://localhost:5000`
- Ensure CORS allows YouTube origin:
  - `CORS_ORIGINS=http://localhost:3000,https://www.youtube.com`
- Optional semantic AI scoring:
  - `YT_SEMANTIC_PROVIDER=auto`

## API endpoints used

- `POST /api/youtube/analyze-content`
- `GET /api/youtube/activity-summary`
- `GET /api/youtube/profile` (frontend app)
- `PUT /api/youtube/profile` (frontend app)

## Notes

- Extension only runs on YouTube.
- If backend is down, extension shows a non-blocking status message.
- This is a wellness support tool, not a clinical diagnosis tool.
- Warning counts are persisted in extension local storage per video id.
- Use extension options `Reset Warning Counts` to clear stored counts.
