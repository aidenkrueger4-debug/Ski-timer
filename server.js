const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomCode, Set<WebSocket>>
const rooms = new Map();

function log(msg) {
  console.log(new Date().toISOString(), msg);
}

// Optional Pusher (publish-only). Enable by setting PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET
const PUSHER_APP_ID  = process.env.PUSHER_APP_ID;
const PUSHER_KEY     = process.env.PUSHER_KEY;
const PUSHER_SECRET  = process.env.PUSHER_SECRET;
const PUSHER_CLUSTER = process.env.PUSHER_CLUSTER;
let pusher = null;
let usingPusher = false;
if (PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET) {
  try {
    const Pusher = require('pusher');
    pusher = new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER || undefined, useTLS: true });
    usingPusher = true;
    log('Pusher publishing enabled (publish-only).');
  } catch (e) {
    log('Pusher init failed or package not installed. Install with: npm install pusher');
  }
}

const SIGNALING_TYPES = new Set(['p2p_offer', 'p2p_answer', 'p2p_candidate']);

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) { return; }

    if (msg.type === 'join') {
      const code = String(msg.room || '').toUpperCase().trim();
      if (!code) return;

      currentRoom = code;
      if (!rooms.has(code)) rooms.set(code, new Set());
      rooms.get(code).add(ws);

      const count = rooms.get(code).size;
      log(`Joined room ${code} (${count})`);
      ws.send(JSON.stringify({ type: 'room_info', room: code, count }));
      broadcast(code, ws, { type: 'peer_joined', count });
      return;
    }

    if (currentRoom && rooms.has(currentRoom)) {
      broadcast(currentRoom, ws, msg);

      if (usingPusher && pusher && SIGNALING_TYPES.has(msg.type)) {
        const channel = `race-${currentRoom}`;
        try {
          // pusher.trigger accepts a callback; use it to surface errors reliably
          pusher.trigger(channel, 'message', msg, (err) => {
            if (err) log(`Pusher trigger error for ${channel}: ${err}`);
          });
        } catch (e) {
          log(`Pusher publish exception: ${e}`);
        }
      }
    }
  });

  ws.on('close', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    room.delete(ws);
    const count = room.size;
    log(`Left room ${currentRoom} (${count})`);
    if (count === 0) rooms.delete(currentRoom);
    else broadcast(currentRoom, ws, { type: 'peer_left', count });
  });

  ws.on('error', (err) => log(`Socket error: ${err && err.message ? err.message : err}`));
});

function broadcast(room, sender, msg) {
  const members = rooms.get(room);
  if (!members) return;
  let payload;
  try { payload = JSON.stringify(msg); } catch (e) { return; }
  for (const client of members) {
    if (client !== sender && client.readyState === 1) {
      try { client.send(payload); } catch (e) { /* ignore send errors */ }
    }
  }
}

log(`Server listening on ws://localhost:${PORT}`);

// graceful shutdown
function shutdown() {
  log('Shutting down...');
  try { wss.close(); } catch (e) {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
