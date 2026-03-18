#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
WEB_DIR="$ROOT_DIR/web"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID $WEB_PID 2>/dev/null || true
  wait $BACKEND_PID $WEB_PID 2>/dev/null || true
  echo -e "${GREEN}Done.${NC}"
}
trap cleanup EXIT INT TERM

# ── Validate env files ──────────────────────────────────────────────────────

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo -e "${RED}Missing backend/.env — copy backend/.env.example and add your PubNub keys${NC}"
  exit 1
fi
if [ ! -f "$WEB_DIR/.env" ]; then
  echo -e "${RED}Missing web/.env — copy web/.env.example and add your PubNub keys${NC}"
  exit 1
fi

# ── Install dependencies if needed ──────────────────────────────────────────

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo -e "${CYAN}Installing backend dependencies...${NC}"
  (cd "$BACKEND_DIR" && npm install)
fi

if [ ! -d "$WEB_DIR/node_modules" ]; then
  echo -e "${CYAN}Installing web dependencies...${NC}"
  (cd "$WEB_DIR" && npm install)
fi

# ── Start backend ───────────────────────────────────────────────────────────

echo -e "${GREEN}Starting backend (port 3002)...${NC}"
(cd "$BACKEND_DIR" && node index.js) 2>&1 | sed "s/^/[backend] /" &
BACKEND_PID=$!

sleep 1

# ── Start frontend ──────────────────────────────────────────────────────────

echo -e "${GREEN}Starting frontend (port 3000)...${NC}"
(cd "$WEB_DIR" && npm run dev) 2>&1 | sed "s/^/[web]     /" &
WEB_PID=$!

echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Live Shopping Demo${NC}"
echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
echo -e "  Frontend:  ${YELLOW}http://localhost:3000${NC}"
echo -e "  Backend:   ${YELLOW}http://localhost:3002/status${NC}"
echo -e ""
echo -e "  Backend is in ${YELLOW}GUIDED_DEMO${NC} mode."
echo -e "  Start the simulation:  ${CYAN}curl -X POST http://localhost:3002/start${NC}"
echo -e "  Stop the simulation:   ${CYAN}curl -X POST http://localhost:3002/stop${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "  Press ${RED}Ctrl+C${NC} to stop both servers."
echo ""

wait
