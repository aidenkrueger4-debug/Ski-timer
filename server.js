/**
 * Race Timer WebSocket Relay Server
 * Run: node server.js
 * Default port: 3001 (set PORT env var to override)
 *
 * Rooms are created on-the-fly by room code.
 * All messages are broadcast to every other socket in the room.
 */

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomCode, Set<WebSocket>>
const rooms = new Map();

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

wss.on("connection", (ws) => {
  let currentRoom = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // First message must be { type: "join", room: "XXXXXX" }
    if (msg.type === "join") {
      const code = (msg.room || "").toUpperCase().trim();
      if (!code) return;

      currentRoom = code;
      if (!rooms.has(code)) rooms.set(code, new Set());
      rooms.get(code).add(ws);

      const count = rooms.get(code).size;
      log(`Socket joined room ${code} (${count} in room)`);

      // Tell the joiner how many are in the room
      ws.send(JSON.stringify({ type: "room_info", room: code, count }));

      // Tell everyone else someone joined
      broadcast(code, ws, { type: "peer_joined", count });
      return;
    }

    // All other messages: relay to everyone else in the room
    if (currentRoom && rooms.has(currentRoom)) {
      broadcast(currentRoom, ws, msg);
    }
  });

  ws.on("close", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.delete(ws);
      const count = room.size;
      log(`Socket left room ${currentRoom} (${count} remaining)`);
      if (count === 0) {
        rooms.delete(currentRoom);
        log(`Room ${currentRoom} dissolved`);
      } else {
        broadcast(currentRoom, ws, { type: "peer_left", count });
      }
    }
  });

  ws.on("error", (err) => {
    log(`Socket error: ${err.message}`);
  });
});

function broadcast(room, sender, msg) {
  const members = rooms.get(room);
  if (!members) return;
  const payload = JSON.stringify(msg);
  for (const client of members) {
    if (client !== sender && client.readyState === 1 /* OPEN */) {
      client.send(payload);
    }
  }
}

log(`Race Timer relay server listening on ws://localhost:${PORT}`);
log(`Set PORT env var to change port. Expose with ngrok: npx ngrok http ${PORT}`);
