import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
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

const rooms = new Map();

function getRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      playback: createInitialPlayback(),
      clients: new Map(),
      messages: [],
      lastActive: Date.now(),
    };
    rooms.set(roomId, room);
  }
  room.lastActive = Date.now();
  return room;
}

function publicMembers(room) {
  return [...room.clients.values()].map(({ clientId, nickname }) => ({
    clientId,
    nickname,
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

function broadcastPresence(room) {
  const members = publicMembers(room);
  io.to(room.id).emit('presence:update', members);
}

function broadcastPlayback(room) {
  const payload = { playback: room.playback, serverTime: Date.now() };
  io.to(room.id).emit('playback:state', payload);
}

function broadcastChat(room, message) {
  io.to(room.id).emit('chat:message', message);
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

function leaveClient(roomId, clientId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.clients.delete(clientId);
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

setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [roomId, room] of rooms) {
    if (room.clients.size === 0 && room.lastActive < cutoff) rooms.delete(roomId);
  }
}, 10 * 60 * 1000).unref();

server.listen(port, '0.0.0.0', () => {
  console.log(`Watch Together running at http://localhost:${port}`);
});
