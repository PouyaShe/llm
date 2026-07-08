# Agent Context — Task 3

- **Task ID:** 3
- **Agent:** socket-service
- **Task:** Build the Socket.io mini-service for the Online Classroom Platform
- **Service path:** `/home/z/my-project/mini-services/classroom-socket/`
- **Port:** 3003 (must be reached from the frontend via `io("/?XTransformPort=3003")`)

## What was built

A self-contained Bun + TypeScript Socket.io server with the **exact same gateway config** as `examples/websocket/server.ts`:
- `path: '/'`
- CORS `origin: '*'`, `methods: ['GET', 'POST']`
- `pingTimeout: 60000`, `pingInterval: 25000`
- Listens on **port 3003**

## Files
- `package.json` — name `classroom-socket`, scripts `dev: bun --hot index.ts`, `start: bun index.ts`, dep `socket.io`, devDeps `@types/node` + `typescript`.
- `index.ts` — full server implementation (typed, with `Participant` interface).

## Implemented events

### Room management
- `join-room` `{ sessionId, userId, name, role, avatar }` → joins room `session:<sessionId>`, stores participant in `Map<socketId, Participant>`, emits `participant-joined` to room, emits `room-state` back to joiner.
- `leave-room` → removes participant, emits `participant-left { socketId }`.
- `disconnect` → removes from any room, emits `participant-left { socketId }`.

### Participant state sync
- `update-participant` `{ micOn?, camOn?, handRaised?, isSpeaking?, allowedToSpeak? }` → updates stored participant, emits `participant-updated { socketId, ...changes }`.

### Chat
- `send-message` `{ sessionId, userId, name, content, avatar }` → broadcasts `receive-message { id, userId, name, content, avatar, timestamp, type: 'user' }`.
- `send-private-message` `{ toSocketId, from, content }` → emits `private-message` only to `toSocketId`.

### Whiteboard
- `whiteboard-draw` `{ sessionId, stroke }` → `socket.to(roomId).emit('whiteboard-draw', { stroke })` (everyone except sender).
- `whiteboard-clear` `{ sessionId }` → `io.to(roomId).emit('whiteboard-clear')`.
- `whiteboard-sync-request` `{ sessionId }` → picks first other participant in room, emits `whiteboard-sync-request { fromSocketId }` to them; if none, sends `whiteboard-sync { imageData: null }` back to requester.
- `whiteboard-sync` `{ toSocketId, imageData }` → relayed only to `toSocketId`.

### WebRTC signaling relay
- `webrtc-offer` `{ toSocketId, sdp }` → emitted to `toSocketId` with `fromSocketId`.
- `webrtc-answer` `{ toSocketId, sdp }` → emitted to `toSocketId` with `fromSocketId`.
- `webrtc-ice` `{ toSocketId, candidate }` → emitted to `toSocketId` with `fromSocketId`.
- `webrtc-start` `{ toSocketId }` → emit `webrtc-start` to `toSocketId`.
- `screen-share-start` / `screen-share-stop` `{ sessionId, name? }` → broadcast to room with `{ socketId, name }`.

### Recording / class control
- `recording-started` / `recording-stopped` `{ sessionId }` → broadcast to room (server relays, includes `startedBy`/`stoppedBy`).
- `force-mute` `{ socketId }` → emit `force-muted { bySocketId }` to that socket; also flips participant `micOn=false` and emits `participant-updated`.
- `kick-user` `{ socketId }` → emit `kicked { bySocketId }` then hard-disconnect that socket.
- `permission-grant` / `permission-revoke` `{ socketId, permission }` → emit to that socket; if `permission === 'speak'` also updates `allowedToSpeak`.

## Verification
- `bun install` ✓
- Started via `bun run dev` (`bun --hot index.ts`) in background — log shows:
  ```
  [classroom-socket] Socket.io server running on port 3003
  [classroom-socket] path: "/" | CORS: * | pingTimeout: 60000 | pingInterval: 25000
  ```
- Port 3003 confirmed listening (pid 1693).
- HTTP 200 on `http://localhost:3003/?EIO=4&transport=polling` (socket.io engine handshake works).

## Notes for downstream agents (frontend / API)
- The frontend MUST connect with: `io("/?XTransformPort=3003")` (path `/`, port via query).
- All room events are scoped to `session:<sessionId>` rooms; no DB persistence — pure in-memory.
- The `Participant` interface is exported from `index.ts` for reference.
