"use strict";
// tests/timeline.test.js

const assert = require('assert');
const path = require('path');
const { expandRepeatedEvents, buildScript } = require(path.resolve(__dirname, '../lib/timeline.js'));

(function testExpandRepeatedEvents_NoRepeat() {
  const events = [{ timeSinceVideoStartedInMs: 100, repeat: 1 }];
  const out = expandRepeatedEvents(events);
  assert(Array.isArray(out), 'Output should be an array');
  assert.strictEqual(out.length, 1, 'Should have one event');
  assert.strictEqual(out[0].timeSinceVideoStartedInMs, 100);
  console.log('OK expandRepeatedEvents - no repeat');
})();

(function testExpandRepeatedEvents_WithRepeat() {
  const ev = { timeSinceVideoStartedInMs: 0, repeat: 3, action: { channel: 'x', data: {} } };
  const out = expandRepeatedEvents([ev]);
  assert.strictEqual(out.length, 3, 'Should expand into 3 events');
  assert.strictEqual(out[0].timeSinceVideoStartedInMs, 0, 'First time must equal original');
  for (let i = 1; i < out.length; i++) {
    assert(out[i].timeSinceVideoStartedInMs >= out[i-1].timeSinceVideoStartedInMs,
      'Subsequent times should be non-decreasing');
    assert.strictEqual(out[i].repeat, 1, 'Repeat flag should be reset to 1');
  }
  console.log('OK expandRepeatedEvents - with repeat');
})();

(function testBuildScript_Sorted() {
  const s = buildScript();
  assert(Array.isArray(s), 'Script should be an array');
  for (let i = 1; i < s.length; i++) {
    assert(s[i].timeSinceVideoStartedInMs >= s[i-1].timeSinceVideoStartedInMs,
      'Script should be sorted by timeSinceVideoStartedInMs');
  }
  console.log('OK buildScript - sorted order');
})();

console.log('All tests passed.');
