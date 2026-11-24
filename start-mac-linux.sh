#!/bin/sh
# Momo Play Wall - Mac/Linux starter: downloads the body-tracking model once, then serves the game locally.
cd "$(dirname "$0")"
if [ ! -f models/pose_landmarker_lite.task ]; then
  echo "Downloading body tracking model (one time, about 6 MB)..."
  curl -L -o models/pose_landmarker_lite.task "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
fi
URL="http://localhost:8765/index.html"
( sleep 1; (command -v open >/dev/null && open "$URL") || (command -v xdg-open >/dev/null && xdg-open "$URL") ) &
echo "Momo Play Wall is running at $URL  -  press Ctrl+C to stop."
python3 -m http.server 8765 --bind 127.0.0.1
