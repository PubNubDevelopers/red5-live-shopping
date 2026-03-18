#!/usr/bin/env bash
#
# Stream a pre-recorded MP4 file to Red5 Pro via RTMP.
# Viewers can watch it with the same WHEP subscriber used for live streams.
#
# Prerequisites:
#   - FFmpeg installed (https://ffmpeg.org/download.html)
#   - A Red5 Pro instance with RTMP enabled (port 1935)
#
# Usage:
#   ./stream-video.sh <path-to-video> [stream-name] [red5-host]
#
# Examples:
#   ./stream-video.sh demo.mp4
#   ./stream-video.sh demo.mp4 live-shopping-demo
#   ./stream-video.sh demo.mp4 live-shopping-demo your-instance.cloud.red5.net

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

VIDEO_FILE="${1:?Usage: $0 <video-file> [stream-name] [red5-host]}"
STREAM_NAME="${2:-live-shopping-demo}"

# Red5 host: CLI arg > env var > .env file
if [ -n "${3:-}" ]; then
  RED5_HOST="$3"
elif [ -n "${RED5_HOST:-}" ]; then
  RED5_HOST="$RED5_HOST"
elif [ -f "$SCRIPT_DIR/../.env" ]; then
  RED5_HOST=$(grep -E '^RED5_HOST=' "$SCRIPT_DIR/../.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
fi

if [ -z "${RED5_HOST:-}" ]; then
  echo "Error: No Red5 host specified."
  echo "Set RED5_HOST in backend/.env, pass it as an env var, or provide it as the third argument."
  exit 1
fi

if [ ! -f "$VIDEO_FILE" ]; then
  echo "Error: Video file not found: $VIDEO_FILE"
  exit 1
fi

if ! command -v ffmpeg &> /dev/null; then
  echo "Error: ffmpeg is not installed. Install it from https://ffmpeg.org/download.html"
  exit 1
fi

RTMP_URL="rtmp://${RED5_HOST}:1935/live/${STREAM_NAME}"

echo "Streaming video to Red5 Pro"
echo "  Video:   $VIDEO_FILE"
echo "  Stream:  $STREAM_NAME"
echo "  Host:    $RED5_HOST"
echo "  RTMP:    $RTMP_URL"
echo ""
echo "Viewers can watch by entering stream name \"$STREAM_NAME\" in the app."
echo "Press Ctrl+C to stop."
echo ""

ffmpeg -re -stream_loop -1 \
  -i "$VIDEO_FILE" \
  -c:v libx264 -b:v 2000k -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -preset veryfast -tune zerolatency \
  -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -f flv "$RTMP_URL"
