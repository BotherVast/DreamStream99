import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket } from 'ws';
import {
  applyPlaybackCommand,
  createInitialPlayback,
  isValidRoomId,
  normalizeChat,
  normalizeNickname,
} from './room-state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 3000);

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(rootDir, 'public'), {
  extensions: ['html'],
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
}));
app.get('/healthz', (_req, res) => res.json({ ok: true, now: Date.now() }));

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: true, credentials: false },
  maxHttpBufferSize: 1e6,
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  if (pathname !== '/bridge') return;
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
const rooms = new Map();

function getRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      playback: createInitialPlayback(),
      clients: new Map(),
      messages: [],
      extensionSockets: new Set(),
      lastActive: Date.now(),
    };
    rooms.set(roomId, room);
  }
  room.lastActive = Date.now();
  return room;
}

function publicMembers(room) {
  return [...room.clients.values()].map(({ clientId, nickname, kind }) => ({
    clientId,
    nickname,
    kind,
  }));
}

function snapshot(room) {
  return {
    roomId: room.id,
    serverTime: Date.now(),
    playback: room.playback,
    members: publicMembers(room),
    messages: room.messages.slice(-60),
  };
}

function safeSend(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function broadcastRaw(room, payload, except = null) {
  for (const ws of room.extensionSockets) {
    if (ws !== except) safeSend(ws, payload);
  }
}

function broadcastPresence(room) {
  const members = publicMembers(room);
  io.to(room.id).emit('presence:update', members);
  broadcastRaw(room, { type: 'presence', members });
}

function broadcastPlayback(room) {
  const payload = { playback: room.playback, serverTime: Date.now() };
  io.to(room.id).emit('playback:state', payload);
  broadcastRaw(room, { type: 'playback', ...payload });
}

function broadcastChat(room, message) {
  io.to(room.id).emit('chat:message', message);
  broadcastRaw(room, { type: 'chat', message });
}

function addChat(room, actor, body) {
  const text = normalizeChat(body);
  if (!text) return null;
  const message = {
    id: crypto.randomUUID(),
    clientId: actor.clientId,
    nickname: actor.nickname,
    body: text,
    serverTime: Date.now(),
  };
  room.messages.push(message);
  if (room.messages.length > 100) room.messages.splice(0, room.messages.length - 100);
  room.lastActive = Date.now();
  return message;
}

function applyCommand(room, actor, command) {
  room.playback = applyPlaybackCommand(room.playback, command, actor, Date.now());
  room.lastActive = Date.now();
  broadcastPlayback(room);
}

function leaveClient(roomId, clientId, socketRef = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.clients.delete(clientId);
  if (socketRef) room.extensionSockets.delete(socketRef);
  room.lastActive = Date.now();
  broadcastPresence(room);
}

io.on('connection', (socket) => {
  let session = null;

  socket.on('room:join', (payload, ack = () => {}) => {
    try {
      const roomId = String(payload?.roomId || '').toUpperCase();
      if (!isValidRoomId(roomId)) throw new Error('房间号应为 4–12 位字母或数字');

      const room = getRoom(roomId);
      const actor = {
        clientId: crypto.randomUUID(),
        nickname: normalizeNickname(payload?.nickname),
        kind: 'web',
      };
      session = { roomId, actor };
      socket.join(roomId);
      room.clients.set(actor.clientId, actor);
      room.lastActive = Date.now();

      ack({ ok: true, clientId: actor.clientId, snapshot: snapshot(room) });
      broadcastPresence(room);
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('playback:command', (command, ack = () => {}) => {
    try {
      if (!session) throw new Error('Not joined');
      const room = rooms.get(session.roomId);
      if (!room) throw new Error('Room expired');
      applyCommand(room, session.actor, command || {});
      ack({ ok: true, revision: room.playback.revision });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('chat:send', (payload, ack = () => {}) => {
    if (!session) return ack({ ok: false, error: 'Not joined' });
    const room = rooms.get(session.roomId);
    if (!room) return ack({ ok: false, error: 'Room expired' });
    const message = addChat(room, session.actor, payload?.body);
    if (!message) return ack({ ok: false, error: 'Empty message' });
    broadcastChat(room, message);
    ack({ ok: true, id: message.id });
  });

  socket.on('time:ping', (payload, ack = () => {}) => {
    ack({ clientTime: Number(payload?.clientTime || 0), serverTime: Date.now() });
  });

  socket.on('disconnect', () => {
    if (session) leaveClient(session.roomId, session.actor.clientId);
  });
});

wss.on('connection', (ws) => {
  let session = null;

  ws.on('message', (buffer) => {
    try {
      if (buffer.length > 64 * 1024) throw new Error('Message too large');
      const payload = JSON.parse(buffer.toString('utf8'));

      if (payload.type === 'join') {
        const roomId = String(payload.roomId || '').toUpperCase();
        if (!isValidRoomId(roomId)) throw new Error('Invalid room id');
        if (session) leaveClient(session.roomId, session.actor.clientId, ws);

        const room = getRoom(roomId);
        const actor = {
          clientId: crypto.randomUUID(),
          nickname: normalizeNickname(payload.nickname),
          kind: 'bilibili-extension',
        };
        session = { roomId, actor };
        room.clients.set(actor.clientId, actor);
        room.extensionSockets.add(ws);
        safeSend(ws, { type: 'joined', clientId: actor.clientId, snapshot: snapshot(room) });
        broadcastPresence(room);
        return;
      }

      if (!session) throw new Error('Join first');
      const room = rooms.get(session.roomId);
      if (!room) throw new Error('Room expired');

      if (payload.type === 'command') {
        applyCommand(room, session.actor, payload.command || {});
      } else if (payload.type === 'chat') {
        const message = addChat(room, session.actor, payload.body);
        if (message) broadcastChat(room, message);
      }
    } catch (error) {
      safeSend(ws, { type: 'error', error: error.message });
    }
  });

  ws.on('close', () => {
    if (session) leaveClient(session.roomId, session.actor.clientId, ws);
  });
});

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [roomId, room] of rooms) {
    if (room.clients.size === 0 && room.lastActive < cutoff) rooms.delete(roomId);
  }
}, 10 * 60 * 1000).unref();

server.listen(port, '0.0.0.0', () => {
  console.log(`Watch Together running at http://localhost:${port}`);
  console.log(`Bilibili extension bridge: ws://localhost:${port}/bridge`);
});
