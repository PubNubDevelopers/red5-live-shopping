"use strict";

require("dotenv").config();
const express = require("express");
const PubNub = require("pubnub");

const { chat } = require("./game-data/chat.js");
const { commentary } = require("./game-data/commentary.js");
const { reactions } = require("./game-data/reactions.js");
const betsData = require("./game-data/bets.json");
const productsData = require("./game-data/products.json");
const { fanExcitement } = require("./on-demand/fan-excitement.js");
const { fanFrustration } = require("./on-demand/fan-frustration.js");

const CHANNELS = {
  CHAT: "game.chat",
  COMMENTARY: "game.commentary",
  REACTIONS: "game.stream-reactions",
  BETS: "game.bets",
  BET_RESULTS: "game.bet-results",
  PRODUCTS: "game.product-highlight",
  STREAM_STATUS: "game.stream-status",
  VIDEO_CONTROL: "game.video-control",
  CONTROL: "game.server-control",
};

const pubnub = new PubNub({
  publishKey: process.env.PUBNUB_PUBLISH_KEY,
  subscribeKey: process.env.PUBNUB_SUBSCRIBE_KEY,
  secretKey: process.env.PUBNUB_SECRET_KEY,
  userId: "shopping-server",
});

pubnub.subscribe({ channels: [CHANNELS.CONTROL] });
pubnub.addListener({
  message: async ({ channel, message }) => {
    if (channel === CHANNELS.CONTROL) {
      await handleControlMessage(message);
    }
  },
});

// ─── Timeline State ──────────────────────────────────────────────────────────

let script = buildScript();
let currentTime = 0;
let lastPublishedTime = -1;
let scriptIndex = 0;
let loopCount = 0;
let chatEnabled = true;
let intervalId = null;
let safetyTimeoutId = null;
const MS_INTERVAL = 1000;
const MAX_DURATION_MS = 10 * 60 * 1000; // 10 min safety cutoff

const lastEventTime =
  script.length > 0
    ? script[script.length - 1].timeSinceVideoStartedInMs
    : 0;

// ─── Script Building ─────────────────────────────────────────────────────────

function expandRepeatedEvents(events) {
  const expanded = [];
  events.forEach((ev) => {
    if (ev.repeat && ev.repeat > 1) {
      let lastTime = ev.timeSinceVideoStartedInMs;
      for (let i = 0; i < ev.repeat; i++) {
        const randomDelay = i === 0 ? 0 : Math.floor(500 + Math.random() * 2000);
        const newTime = lastTime + randomDelay;
        lastTime = newTime;
        expanded.push({ ...ev, timeSinceVideoStartedInMs: newTime, repeat: 1 });
      }
    } else {
      expanded.push(ev);
    }
  });
  return expanded;
}

function buildProductEvents() {
  const events = [];
  for (const product of productsData) {
    if (product.startTimeMs != null) {
      events.push({
        timeSinceVideoStartedInMs: product.startTimeMs,
        persistInHistory: false,
        action: {
          channel: CHANNELS.PRODUCTS,
          data: { type: "PRODUCT_HIGHLIGHT", product },
        },
      });
    }
    if (product.endTimeMs != null) {
      events.push({
        timeSinceVideoStartedInMs: product.endTimeMs,
        persistInHistory: false,
        action: {
          channel: CHANNELS.PRODUCTS,
          data: { type: "PRODUCT_DISMISS" },
        },
      });
    }
  }
  return events;
}

function buildScript() {
  const productEvents = buildProductEvents();
  const merged = [...chat, ...commentary, ...reactions, ...betsData, ...productEvents];
  const expanded = expandRepeatedEvents(merged);
  expanded.sort((a, b) => a.timeSinceVideoStartedInMs - b.timeSinceVideoStartedInMs);
  return expanded;
}

// ─── Publishing ──────────────────────────────────────────────────────────────

async function publishMessage(channel, message, persistInHistory = false) {
  try {
    await pubnub.publish({ channel, message, storeInHistory: persistInHistory });
  } catch (err) {
    console.error("[Publish] Error:", err.message);
  }
}

async function publishStreamStatus(isLive) {
  await pubnub.publish({
    channel: CHANNELS.STREAM_STATUS,
    message: { type: "STREAM_STATUS", isLive, currentTime },
    storeInHistory: false,
  });
}

// ─── On-Demand Scripts ───────────────────────────────────────────────────────

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function runOnDemandScript(events) {
  for (const eventObj of events) {
    await publishMessage(
      eventObj.action.channel,
      eventObj.action.data,
      !!eventObj.persistInHistory
    );
  }
}

// ─── Control Handler ─────────────────────────────────────────────────────────

async function handleControlMessage(msg) {
  switch (msg.type) {
    case "START":
      currentTime = 0;
      scriptIndex = 0;
      loopCount = 0;
      chatEnabled = true;
      script = buildScript();
      await publishStreamStatus(true);
      startLoop();
      console.log("[Control] Started simulation");
      break;

    case "STOP":
      stopLoop();
      await publishStreamStatus(false);
      console.log("[Control] Stopped simulation");
      break;

    case "TOGGLE_CHAT": {
      if (!intervalId) return;
      chatEnabled = !chatEnabled;
      const statusText = chatEnabled ? "Chat messages resumed" : "Chat messages paused";
      await publishMessage(CHANNELS.CHAT, { user: "system", text: statusText });
      console.log("[Control]", statusText);
      break;
    }

    case "ON_DEMAND": {
      if (!intervalId) return;
      const scriptName = msg.scriptName;
      let onDemandEvents = null;

      if (scriptName === "fan-excitement") {
        onDemandEvents = shuffleArray(expandRepeatedEvents(fanExcitement));
      } else if (scriptName === "fan-frustration") {
        onDemandEvents = shuffleArray(expandRepeatedEvents(fanFrustration));
      } else {
        console.error("[Control] Unknown on-demand script:", scriptName);
        return;
      }

      await runOnDemandScript(onDemandEvents);
      console.log("[Control] Ran on-demand script:", scriptName);
      break;
    }

    default:
      console.log("[Control] Unknown command:", msg.type);
  }
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

async function runLoop() {
  if (currentTime === lastPublishedTime) return;
  lastPublishedTime = currentTime;

  while (
    scriptIndex < script.length &&
    script[scriptIndex].timeSinceVideoStartedInMs <= currentTime
  ) {
    const eventObj = script[scriptIndex];

    if (!(eventObj.action.channel === CHANNELS.CHAT && !chatEnabled)) {
      try {
        await publishMessage(
          eventObj.action.channel,
          eventObj.action.data,
          !!eventObj.persistInHistory
        );
      } catch (err) {
        console.error("[Loop] Error publishing:", err.message);
      }
    }

    scriptIndex++;
  }

  if (!intervalId) return;

  // Broadcast playback time so all clients stay in sync
  try {
    await pubnub.publish({
      channel: CHANNELS.VIDEO_CONTROL,
      message: {
        type: "STATUS",
        params: {
          playbackTime: currentTime,
          videoStarted: currentTime === 0,
          videoEnded: currentTime >= lastEventTime,
        },
      },
      storeInHistory: false,
    });
  } catch (err) {
    console.error("[Video] Status publish error:", err.message);
  }

  currentTime += MS_INTERVAL;

  if (currentTime > lastEventTime) {
    currentTime = 0;
    scriptIndex = 0;
    loopCount++;

    if (loopCount >= 1 && process.env.GUIDED_DEMO === "true") {
      stopLoop();
      console.log("[Loop] Completed playthrough in guided mode, auto-stopping to save PubNub usage");
      return;
    }

    script = buildScript();
    console.log("[Loop] Restarting timeline (loop", loopCount, ")");
  }
}

function startLoop() {
  if (intervalId) return;
  console.log("[Loop] Starting...");
  intervalId = setInterval(async () => {
    try {
      await runLoop();
    } catch (err) {
      console.error("[Loop] Error:", err.message);
    }
  }, MS_INTERVAL);

  if (safetyTimeoutId) clearTimeout(safetyTimeoutId);
  safetyTimeoutId = setTimeout(() => {
    if (intervalId) {
      console.log(`[Loop] Safety cutoff after ${MAX_DURATION_MS / 60000} minutes`);
      stopLoop();
    }
  }, MAX_DURATION_MS);
}

function stopLoop() {
  if (intervalId) {
    console.log("[Loop] Stopping...");
    clearInterval(intervalId);
    intervalId = null;
  }
  if (safetyTimeoutId) {
    clearTimeout(safetyTimeoutId);
    safetyTimeoutId = null;
  }
}

// ─── Express API ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  next();
});

app.get("/status", (req, res) => {
  res.json({
    running: !!intervalId,
    currentTime,
    scriptIndex,
    totalEvents: script.length,
    loopCount,
    chatEnabled,
  });
});

app.post("/start", async (req, res) => {
  await handleControlMessage({ type: "START" });
  res.json({ ok: true, message: "Simulation started" });
});

app.post("/stop", async (req, res) => {
  await handleControlMessage({ type: "STOP" });
  res.json({ ok: true, message: "Simulation stopped" });
});

app.post("/toggle-chat", async (req, res) => {
  await handleControlMessage({ type: "TOGGLE_CHAT" });
  res.json({ ok: true, chatEnabled });
});

app.post("/on-demand/:scriptName", async (req, res) => {
  const { scriptName } = req.params;
  await handleControlMessage({ type: "ON_DEMAND", scriptName });
  res.json({ ok: true, message: `Ran ${scriptName}` });
});

app.get("/bets", (req, res) => {
  res.json(betsData.filter((b) => b.action.data.type === "BET_PROPOSAL"));
});

app.get("/products", (req, res) => {
  res.json(productsData);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[Server] Soccer Betting Simulator running on port ${PORT}`);
  console.log(`[Server] API: http://localhost:${PORT}/status`);
  console.log(`[Server] Channels: ${Object.values(CHANNELS).join(", ")}`);
});

if (process.env.GUIDED_DEMO === "true") {
  console.log("[Startup] Guided demo mode — waiting for START command");
} else {
  console.log("[Startup] Auto-starting simulation loop");
  startLoop();
}

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  stopLoop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  stopLoop();
  process.exit(0);
});
