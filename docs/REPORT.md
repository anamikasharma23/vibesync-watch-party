# Watch Party: latency, drift and failure handling

This document covers how playback sync works, how it was measured, the test conditions, the results against the brief's targets, and what happens when things go wrong.

## Targets from the brief

| Constraint | Target | Result (simulated Wi-Fi, 10 users) | Status |
|---|---|---|---|
| Concurrent users per room | at least 10 | 10 tested, room cap 50 | Pass |
| Playback control propagation | ≤ 250 ms at p95, local network | 66 ms p95 | Pass |
| Playback drift after correction | ≤ 500 ms | 147 ms p95, 98.2% of samples within 500 ms | Pass |

Re-run any time with `npm run bench` (see "How to reproduce" below). Numbers will vary slightly run to run because stalls and actions are random.

## How sync works

**One source of truth.** The server holds the room's playback state: which video, playing or paused, position, the server time that position was recorded, playback rate, and a version number. Clients never tell each other anything directly. A client sends an intent (play, pause, seek), the server applies it, increments the version and broadcasts the new state.

**Shared clock.** Every device estimates the difference between its clock and the server's with ping exchanges (8 at join, then one every 4 s). It keeps the samples with the lowest round trip, because those have the least network noise, and takes their median. From that, any device can compute where the video should be right now:

```
expected = position + (serverNow - updatedAt) × rate      (when playing)
```

**Drift correction** runs every 400 ms on every device, using `shared/sync.js`:

| How far off | What the player does | Why |
|---|---|---|
| under 80 ms | nothing | not noticeable, avoids constant fiddling |
| 80 ms to 1 s | plays slightly faster or slower (up to 1.10x / 0.90x) until caught up | invisible to the viewer, no jump |
| over 1 s | jumps to the right spot, 80 ms ahead to cover seek time | quickest way back |

YouTube's player usually only allows speed steps of 0.25x, which would be audible, so YouTube players skip the speed nudge and jump once they are more than 450 ms off. That keeps them inside the 500 ms target.

Drift is not sampled for 1.2 s after a seek or while the player is buffering, because the player cannot be expected to be in place during those moments. This exclusion is applied the same way in the browser and in the test.

**SyncGuard.** If a viewer is more than 500 ms off while playing and not buffering, the "In sync" pill turns amber and shows "x.x s off · Resync". One tap jumps them back to the room's position.

## How it was measured

Two kinds of measurement.

**1. Automated 10-user test (`bench/loadtest.js`).** Ten simulated viewers connect to a running server through real WebSockets. Each one:

- syncs its clock with the server using the same algorithm as the browser,
- runs a simulated video player with realistic problems: a playback clock error of up to ±0.5% between devices, random buffering stalls of 0.2 to 0.9 s (about one every 20 s per viewer), and seeks that take 80 to 250 ms to complete,
- corrects drift every 400 ms with the exact same function the browser uses.

Half the viewers behave like MP4 players (can change speed smoothly), half like YouTube (jump only).

During the run, random viewers press play, pause and seek every 2.5 to 4 s. Every sixth action is two viewers seeking at the same moment, to test the conflict rule. At 20 s a tenth viewer joins late. At 30 s one viewer's connection is killed and comes back 2 s later.

*Propagation latency* = the time between the moment a viewer pressed a control (stamped in server time) and the moment another viewer received the update, using the synced clocks. *Drift* = the simulated player's position minus where the room says it should be.

**2. Real browser test.** Four headless Chromium browsers (three desktop, one phone-sized) joined one room on the same machine and played a 2 minute test video through the actual app. Video positions were read directly from each `<video>` element.

### Test conditions

| | Automated test | Browser test |
|---|---|---|
| Machine | 2 vCPU Linux, 7 GB RAM, Node v22.22 | same |
| Server | `node server/index.js`, single process | same |
| Network | (a) localhost, (b) simulated Wi-Fi: 0 to 40 ms random delay added to every message in each direction | localhost |
| Viewers | 10 (5 MP4-like, 5 YouTube-like) | 4 Chromium 141 tabs |
| Duration | 60 s per run | about 60 s |
| Video | simulated | 120 s WebM test pattern |

## Results

### Automated test, 10 viewers

| | Localhost | Simulated Wi-Fi (0 to 40 ms each way) |
|---|---|---|
| Control propagation p50 | 1 ms | 40 ms |
| Control propagation p95 | 2.5 ms | **66 ms** |
| Control propagation max | 16 ms | 81 ms |
| Drift p50 | 67 ms | 63 ms |
| Drift p95 | 280 ms | **147 ms** |
| Samples within 500 ms | 98.4% | 98.2% |
| Drift p95, MP4-like players | 227 ms | 128 ms |
| Drift p95, YouTube-like players | 284 ms | 149 ms |
| Late joiner in sync after | 101 ms | 102 ms |
| Reconnected viewer in sync after | 509 ms | 515 ms |
| Concurrent seeks rejected as stale | 3 of 3 conflicts | 3 of 3 conflicts |

Samples: 181 propagation samples and about 900 drift samples per run. Full raw data is in `bench/results/`.

The occasional drift spikes up to around 0.9 s are the injected buffering stalls. They are corrected within one or two correction cycles (0.4 to 0.8 s).

### Real browser test, 4 viewers

Four Chromium browsers (three desktop, one phone-sized) in one room, playing a 2 minute video through the real app. Positions read straight from each video element.

| Moment | Video position on each device (s) | Spread |
|---|---|---|
| 4 s after the host pressed play | 3.95 / 3.91 / 3.88 | 77 ms |
| 2.5 s after a seek | 17.15 / 17.24 / 17.19 | 90 ms |
| After pause | 17.28 on all three | 0 ms |
| Late joiner, 4 s after joining | host vs joiner | 126 ms |
| Two people seek at the same moment | 29.15 / 29.18 / 29.33 / 29.06 | 270 ms, one timeline |
| Phone drops off the network and returns | host vs phone, 6 s after returning | 10 ms |

The same run checked 57 behaviours across every feature (rooms, queue, chat and spoilers, reactions, polls, host transfer, control permissions, reconnect, dedications, browse and search, vibe check, swipe, match and vote, mood check, verdict and the Never Again wall, sync stats, phone layout). All 57 passed with no browser errors. A separate check simulated a phone browser that blocks video with sound until a tap: the video started muted and in sync, and one tap brought the sound back.

### Measuring on real phones

Every room has a **Sync** tab in the side panel showing round trip time, clock offset, current drift and the correction being applied, plus the p50 and p95 latency and drift for the whole room. **Download measurements (JSON)** exports every latency and drift sample from that device for your own analysis. To test on a real local network: run the server on a laptop, join from phones on the same Wi-Fi, use the room for a few minutes, then export from each device.

## Failure handling

| What goes wrong | What happens |
|---|---|
| A malformed or hostile message reaches the server | It is ignored and logged. One bad message can never crash the server for everyone. |
| Two people seek or pause at the same moment | Each action carries the version it was based on. The first to reach the server wins. The other is rejected as stale, that person's player snaps to the winner's timeline, and they see "Someone else moved the video first". Nobody fights over the playhead. |
| A phone blocks video with sound until the person taps | The video starts muted and in sync with a "tap to unmute" button. If even muted playback is blocked, a "Tap to join in" button covers the video. One tap fixes it. |
| A viewer's Wi-Fi drops or their phone locks | The server notices within 10 s (heartbeat) or immediately if the socket closes. Their seat is held for 30 s. The app reconnects automatically with backoff (0.3 s, 0.6 s, 1.2 s, up to 5 s), rejoins with the same identity, gets a full snapshot and seeks to the right position. Others see "Reconnecting… seat held 30 s" in People. |
| The host leaves | After the 30 s grace period the longest-present connected viewer becomes host automatically, and the room is told in chat. The host can also hand over manually from People. |
| Someone joins late | They receive a snapshot with the video, position, chat history, playlist, open polls and any running group swipe, then seek straight to the current position. Measured back in sync in about 100 ms. |
| A player falls behind (slow device, buffering) | Drift correction catches it. If something blocks correction, SyncGuard shows a one-tap Resync. |
| A video link cannot be played | The screen shows "This video link could not be loaded" instead of a black box. The playlist keeps working. |
| A non-host tries to control playback | Blocked when only the host controls playback. They get a short explanation and their player keeps following the room. The host can let everyone control from People. |
| Clock jumps or bad samples | Only the half of ping samples with the lowest round trip are used, and the estimate keeps refining every 4 s. |
| Song dedication spam | One dedication per person per minute, and the host can turn dedications off. |
| Empty rooms | Removed 30 minutes after the last person leaves. |
| Slow or older phones | Detected by memory and CPU count. Heavy frosted-glass blur is replaced with solid panels. Calm mode turns world effects off entirely. Animations only use transform and opacity, and respect "reduce motion". |

## Known limits

- Room state lives in memory, so restarting the server ends all rooms. Fine for a single-server deployment like this one; a multi-server setup would need shared state such as Redis.
- Numbers above were measured on one machine with simulated network delay, not across physical Wi-Fi. Use the Sync tab export on real devices to confirm on your own network.
- Netflix, Prime and similar services cannot be played inside any third-party site. The app plays YouTube links and direct video files.

## How to reproduce

```bash
npm install
npm run build
npm start                                          # terminal 1
npm run bench                                      # terminal 2: localhost, 10 viewers, 60 s
node bench/loadtest.js --jitter 40 --label wifi    # simulated Wi-Fi
node bench/loadtest.js --clients 20 --duration 120 # heavier run
```
