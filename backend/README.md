# Live Shopping Backend Simulator

Publishes simulated chat messages, commentary, reactions, and product highlights to PubNub channels that the live shopping frontend subscribes to.

## Setup

```bash
cd backend
cp .env.example .env   # fill in your PubNub keys
npm install
npm run generator
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Current simulation state |
| POST | `/start` | Start the simulation loop |
| POST | `/stop` | Stop the simulation loop |
| POST | `/toggle-chat` | Pause/resume chat messages |
| POST | `/on-demand/:scriptName` | Trigger a reaction burst (`fan-excitement` or `fan-frustration`) |
| GET | `/products` | List all products |

## PubNub Channels

| Channel | Purpose |
|---------|---------|
| `game.chat` | Simulated viewer chat messages |
| `game.commentary` | Host commentary (captions/subtitles) |
| `game.stream-reactions` | Emoji reactions |
| `game.product-highlight` | Product showcase and end events |
| `game.stream-status` | Stream live/offline status |
| `game.server-control` | Remote control commands |

## Streaming Pre-Recorded Video via Red5 Pro

You can stream a pre-recorded MP4 file through Red5 Pro so viewers see it as a live stream. This uses FFmpeg to push the video over RTMP to your Red5 instance, where viewers subscribe via WHEP (the same mechanism used for live camera streams).

### Prerequisites

- [FFmpeg](https://ffmpeg.org/download.html) installed on your machine
- A Red5 Pro instance with RTMP ingest enabled (port 1935)

### Quick Start

```bash
# Add your Red5 host to .env (or pass it as a CLI argument)
echo 'RED5_HOST=your-instance.cloud.red5.net' >> .env

# Stream a video file — loops indefinitely until you press Ctrl+C
./scripts/stream-video.sh /path/to/video.mp4
```

### Usage

```
./scripts/stream-video.sh <video-file> [stream-name] [red5-host]
```

| Argument | Default | Description |
|----------|---------|-------------|
| `video-file` | (required) | Path to the MP4 file |
| `stream-name` | `live-shopping-demo` | Must match what viewers enter in the app |
| `red5-host` | From `RED5_HOST` env / `.env` | Your Red5 Pro server hostname |

The video is re-encoded to 1280x720 at 2 Mbps with low-latency settings. It loops indefinitely so viewers always have something to watch.

## Guided Demo Mode

Set `GUIDED_DEMO=true` in `.env` to prevent auto-start. Use `POST /start` or send a PubNub message on `game.server-control` with `{ "type": "START" }` to begin.
