# 🏁 Race Timer — Two-Phone System

A real-time race timing app. One phone starts the race, the other uses its camera to detect when you cross the finish line.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server

```bash
npm start
```

The server runs on port **3001** by default. Change it with:

```bash
PORT=8080 npm start
```

### 3. Expose the server to both phones

Both phones need to reach the server. Options:

**Option A — Same WiFi network (easiest)**
Find your computer's local IP:
- Mac: `ipconfig getifaddr en0`
- Windows: `ipconfig` → look for IPv4 Address

Then use: `ws://192.168.x.x:3001`

**Option B — Anywhere over the internet (ngrok)**
```bash
npx ngrok http 3001
```
Copy the `wss://xxxx.ngrok.io` URL it gives you.

### 4. Open index.html on both phones

You can serve it with:
```bash
npx serve .
```
Or just open `index.html` directly in a browser (file:// works for same-device testing).

---

## How to run a race

1. **Both phones** open the app and enter the **same server URL** and **room code**
2. **Finish line phone** — tap "Finish line phone", allow camera access, point at the finish line
3. **Starter phone** — tap "Starter phone", wait for "Finish phone connected ✓"
4. Press **Start race** → 5-second countdown → timer starts
5. Runner crosses the line → camera detects motion → time is recorded on both phones

---

## Tips

- **Sensitivity slider** on the finish phone: lower = triggers on less movement, higher = requires more motion. Start around 15-25.
- The green overlay shows detected motion pixels in real time — helps you aim the camera.
- The motion bar turns red when the threshold is crossed.
- Point the camera so the runner fills as much of the frame as possible when crossing.
- Works best in good lighting with a contrasting background.

---

## File structure

```
race-timer/
├── server.js      ← WebSocket relay server (Node.js)
├── package.json
├── index.html     ← Client app (open on both phones)
└── README.md
```
