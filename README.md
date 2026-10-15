*Live Demo:* [VibeSync — Watch Party](https://vibesync-watch-party.onrender.com)
# Watch Party

Watch videos together in perfect sync, pick a movie as a group in two minutes, and react without interrupting a single line.

## Run it (3 steps)

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run build
npm start
```

The terminal prints two links:

- `http://localhost:3000` for your own computer
- `http://<your-ip>:3000` for friends on the **same Wi-Fi**. They open it on their phone or laptop.

Create a room, copy the invite link (tap the room code at the top), and send it.

> If friends can't connect: make sure everyone is on the same Wi-Fi, and allow Node through your firewall when Windows or macOS asks.

### Share a link anyone can open (friends anywhere)

Keep `npm start` running, open a second terminal in the same folder and run:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

It prints a link like `https://some-words.trycloudflare.com`. Send that. It works while your laptop and both terminals stay on, and you get a new link each time you restart it.

### If something looks wrong

- **Video shows but no sound, or a "Tap to join in" button:** phones block video with sound until you tap. Tap once anywhere and it plays in sync with sound.
- **YouTube spinner that won't go away:** if YouTube can't start by itself after a few seconds, a hint appears. Tap the video once and it starts, then lines up with the room.
- **"This YouTube video cannot be played here":** the video's owner turned off embedding (common for music labels and full movies). Use another link.
- **"This room has ended":** rooms live in memory, so restarting the server closes them. Create a new room.
- **Headings look plain:** the fonts load from the internet. Connect the laptop to the internet.

## Quick demo script

1. Create a room on your laptop. Join from your phone with the invite link (tap the room code at the top to copy it).
2. Tap **Party → Pick a movie together**. Everyone picks a vibe on their own device, then swipes a deck built for the room's mix. Matches reveal together with confetti and a vote starts automatically.
3. The host closes the vote. The winner lands in the **Queue**. Pick one of the free films (Sintel, Tears of Steel, Big Buck Bunny, Elephants Dream) or paste any YouTube link.
4. Press play on one device and watch every screen follow. Seek, pause, all in sync. The background world follows the film's genre (or the host picks one in **Party → World**).
5. Tap **React**. Reactions float up as small lights and leave pins on the timeline. **Save moment** marks a scene.
6. Tap a friend's face to dedicate a song. The first time, add a song: any YouTube link and the second where the hook starts.
7. Host: **Party → Mood check**. The film pauses and everyone's mood is read out one by one with a song.
8. When the film ends (or **Party → Verdict time**), everyone gives a verdict and a one-line roast. If half the room says "Never again", the film gets stamped and goes on the **Never Again wall**, and never shows up in your swipes again.
9. Open **Moments** for the scenes the room reacted to most, with **Replay together**. Open **Sync** to show live latency and drift numbers.

## What's inside

| Brief requirement | Where |
|---|---|
| Create and join rooms via invite link or code | Home screen, `/r/CODE` links, code button in the room |
| Sync play, pause and seek | `server/index.js` (versioned playback state), `client/src/Room.jsx` (sync engine) |
| Recommendations, categories, filters, fuzzy search | Browse (`client/src/ui/Discover.jsx`), `shared/catalog.js` |
| Emoji reactions, live chat, shared playlist, group polls, host transfer | React button, Chat drawer tabs Chat / Queue / Polls / People |
| Drift detection and correction | `shared/sync.js`, runs every 400 ms on every device |
| Late joins, reconnections, concurrent actions | Snapshot on join, 30 s seat hold, auto reconnect, version check |
| 10+ users, ≤250 ms p95 propagation, ≤500 ms drift, documented | `bench/loadtest.js`, [docs/REPORT.md](docs/REPORT.md) |

Creative features:

- **VibeMatch + NoMoreScrolling**: everyone picks a vibe, the room gets a swipe deck built from the mix, matches reveal live, a vote picks the winner.
- **Song dedications**: tap a friend's face, the app reads their mood from their chat and reactions and suggests a song hook that plays for the whole room, in sync, with the film's volume dipped.
- **Mood Check**: a roll call at the interval. Each person's mood, the reason, and their song.
- **Verdict + Never Again wall**: funny verdicts and roast lines after the film. A flop gets stamped and banned from future swipes.
- **Best Moments**: the scenes the room reacted to most, with Replay together.
- **Movie worlds**: the room's atmosphere follows the film (graveyard fog, deep space, monsoon rain, golden stage) and reacts when the room does. **Calm** turns it off.
- **Spoiler-safe chat** and **SyncGuard** one-tap resync.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Run the server (serves the built app on port 3000) |
| `npm run build` | Build the frontend into `dist/` |
| `npm run dev` | Development mode with hot reload (Vite on 5173, server on 3000) |
| `npm run bench` | 10-viewer latency and drift test against a running server |

Set `PORT=8080 npm start` to use another port.

## Tech

React 19 + Vite on the front end, Node + Express + `ws` on the back end, Fuse.js for fuzzy search. No database: rooms live in memory. Songs added for dedications are saved to `data/songs.json`.
