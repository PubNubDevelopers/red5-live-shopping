"use strict";
// lib/timeline.js
// Core timeline logic: expand repeats and merge data modules into a sorted script.

const { chat } = require("../game-data/chat.js");
const { commentary } = require("../game-data/commentary.js");
const { reactions } = require("../game-data/reactions.js");

/**
 * Expand events that have a `repeat` count into multiple events with randomized delays.
 * @param {Array} events Array of event objects with timeSinceVideoStartedInMs and optional repeat
 * @returns {Array} Expanded array where each event has repeat=1
 */
function expandRepeatedEvents(events) {
  const expanded = [];
  events.forEach((ev) => {
    if (ev.repeat && ev.repeat > 1) {
      let lastTime = ev.timeSinceVideoStartedInMs;
      for (let i = 0; i < ev.repeat; i++) {
        let randomDelay = Math.floor(500 + Math.random() * 2000);
        if (i === 0) randomDelay = 0;
        let newTime = lastTime + randomDelay;
        lastTime = newTime;
        expanded.push({
          ...ev,
          timeSinceVideoStartedInMs: newTime,
          repeat: 1
        });
      }
    } else {
      expanded.push(ev);
    }
  });
  return expanded;
}

/**
 * Build the script by merging all data sources and sorting by time.
 * @returns {Array} Sorted array of all events
 */
function buildScript() {
  const merged = [
    ...chat,
    ...commentary,
    ...reactions,
  ];
  const expanded = expandRepeatedEvents(merged);
  expanded.sort((a, b) => a.timeSinceVideoStartedInMs - b.timeSinceVideoStartedInMs);
  return expanded;
}

module.exports = { expandRepeatedEvents, buildScript };
