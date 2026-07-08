import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParticipantRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export type Permission = 'mic' | 'cam' | 'screen' | 'whiteboard'

export interface Participant {
  socketId: string
  userId: string
  name: string
  role: ParticipantRole
  avatar: string
  roomId: string
  micOn: boolean
  camOn: boolean
  handRaised: boolean
  isSpeaking: boolean
  joinedAt: number
  // per-participant permissions granted by teacher/admin
  allowMic: boolean
  allowCam: boolean
  allowScreen: boolean
  allowWhiteboard: boolean
}

export interface ChatMessage {
  id: string
  userId: string
  name: string
  content: string
  avatar: string
  timestamp: number
  type: 'user' | 'system'
}

export interface WhiteboardStroke {
  points: Array<{ x: number; y: number }>
  color: string
  size: number
  tool: 'pen' | 'eraser'
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const participants = new Map<string, Participant>()
const socketRoom = new Map<string, string>()

/** userId -> set of socketIds, for direct-message delivery (dashboard-level, outside rooms) */
const userSockets = new Map<string, Set<string>>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roomOf = (sessionId: string): string => `session:${sessionId}`

const generateId = (): string =>
  Math.random().toString(36).slice(2, 11) + Date.now().toString(36)

const isStaff = (role: ParticipantRole): boolean => role === 'ADMIN' || role === 'TEACHER'

const listParticipantsInRoom = (roomId: string): Participant[] => {
  const result: Participant[] = []
  for (const p of participants.values()) {
    if (p.roomId === roomId) result.push(p)
  }
  return result
}

const firstOtherParticipantInRoom = (
  roomId: string,
  excludeSocketId: string,
): Participant | undefined => {
  for (const p of participants.values()) {
    if (p.roomId === roomId && p.socketId !== excludeSocketId) return p
  }
  return undefined
}

const removeParticipant = (
  socket: Socket,
): { participant: Participant | undefined; roomId: string | undefined } => {
  const participant = participants.get(socket.id)
  const roomId = socketRoom.get(socket.id)
  if (participant) participants.delete(socket.id)
  if (roomId) {
    socketRoom.delete(socket.id)
    socket.leave(roomId)
  }
  return { participant, roomId }
}

// apply a permission toggle to a target participant and broadcast state
const applyPermission = (
  target: Participant,
  permission: Permission,
  granted: boolean,
) => {
  switch (permission) {
    case 'mic':
      target.allowMic = granted
      if (!granted) target.micOn = false
      break
    case 'cam':
      target.allowCam = granted
      if (!granted) target.camOn = false
      break
    case 'screen':
      target.allowScreen = granted
      break
    case 'whiteboard':
      target.allowWhiteboard = granted
      break
  }
}

const permField = (permission: Permission): keyof Participant => {
  switch (permission) {
    case 'mic': return 'allowMic'
    case 'cam': return 'allowCam'
    case 'screen': return 'allowScreen'
    case 'whiteboard': return 'allowWhiteboard'
  }
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path — Caddy uses it to route based on XTransformPort.
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

io.on('connection', (socket: Socket) => {
  console.log(`[socket] connected: ${socket.id}`)

  // -------------------------------------------------------------------------
  // Room management
  // -------------------------------------------------------------------------

  socket.on(
    'join-room',
    (payload: {
      sessionId: string
      userId: string
      name: string
      role: ParticipantRole
      avatar: string
    }) => {
      const { sessionId, userId, name, role, avatar } = payload
      const roomId = roomOf(sessionId)

      const prev = removeParticipant(socket)
      if (prev.roomId && prev.participant) {
        io.to(prev.roomId).emit('participant-left', { socketId: socket.id })
        console.log(
          `[join-room] ${prev.participant.name} left room ${prev.roomId} before joining ${roomId}`,
        )
      }

      const staff = isStaff(role)
      const participant: Participant = {
        socketId: socket.id,
        userId,
        name,
        role,
        avatar,
        roomId,
        micOn: false,
        camOn: false,
        handRaised: false,
        isSpeaking: false,
        joinedAt: Date.now(),
        // staff have everything by default; students start with nothing
        allowMic: staff,
        allowCam: staff,
        allowScreen: staff,
        allowWhiteboard: staff,
      }

      participants.set(socket.id, participant)
      socketRoom.set(socket.id, roomId)
      socket.join(roomId)

      console.log(
        `[join-room] ${name} (${role}) joined ${roomId} | total in room: ${listParticipantsInRoom(roomId).length}`,
      )

      socket.to(roomId).emit('participant-joined', participant)

      socket.emit('room-state', {
        sessionId,
        participants: listParticipantsInRoom(roomId),
      })
    },
  )

  socket.on('leave-room', () => {
    const { participant, roomId } = removeParticipant(socket)
    if (participant && roomId) {
      io.to(roomId).emit('participant-left', { socketId: socket.id })
      console.log(`[leave-room] ${participant.name} left ${roomId}`)
    }
  })

  // -------------------------------------------------------------------------
  // Participant state sync
  // -------------------------------------------------------------------------

  socket.on(
    'update-participant',
    (changes: Partial<Pick<Participant, 'micOn' | 'camOn' | 'handRaised' | 'isSpeaking'>>) => {
      const participant = participants.get(socket.id)
      if (!participant) return

      const allowed: Array<keyof Participant> = ['micOn', 'camOn', 'handRaised', 'isSpeaking']
      const update: Partial<Participant> = {}
      for (const key of allowed) {
        if (changes[key] !== undefined) {
          // enforce permission: a student can only turn ON a media if allowed
          if (key === 'micOn' && changes[key] === true && !participant.allowMic && !isStaff(participant.role)) continue
          if (key === 'camOn' && changes[key] === true && !participant.allowCam && !isStaff(participant.role)) continue
          update[key] = changes[key] as never
          participant[key] = changes[key] as never
        }
      }

      if (Object.keys(update).length === 0) return

      io.to(participant.roomId).emit('participant-updated', {
        socketId: socket.id,
        ...update,
      })
    },
  )

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  socket.on(
    'send-message',
    (payload: {
      sessionId: string
      userId: string
      name: string
      content: string
      avatar: string
    }) => {
      const { sessionId, userId, name, content, avatar } = payload
      const roomId = roomOf(sessionId)
      const message: ChatMessage = {
        id: generateId(),
        userId,
        name,
        content,
        avatar,
        timestamp: Date.now(),
        type: 'user',
      }
      io.to(roomId).emit('receive-message', message)
    },
  )

  socket.on(
    'send-private-message',
    (payload: { toSocketId: string; from: { userId: string; name: string; avatar: string }; content: string }) => {
      const { toSocketId, from, content } = payload
      // deliver to recipient
      io.to(toSocketId).emit('private-message', {
        id: generateId(),
        from,
        content,
        fromSocketId: socket.id,
        timestamp: Date.now(),
      })
      // echo back to sender so their own UI shows it in the right conversation
      socket.emit('private-message-echo', {
        id: generateId(),
        from,
        content,
        toSocketId,
        timestamp: Date.now(),
      })
    },
  )

  socket.on('chat-clear', (payload: { sessionId: string }) => {
    const participant = participants.get(socket.id)
    if (!participant || !isStaff(participant.role)) return // only staff can clear chat
    const roomId = roomOf(payload.sessionId)
    io.to(roomId).emit('chat-clear', { bySocketId: socket.id })
    console.log(`[chat-clear] ${participant.name} cleared the chat in ${roomId}`)
  })

  // -------------------------------------------------------------------------
  // Whiteboard
  // -------------------------------------------------------------------------

  socket.on(
    'whiteboard-draw',
    (payload: { sessionId: string; stroke: WhiteboardStroke }) => {
      const participant = participants.get(socket.id)
      // only allow drawing if staff or explicitly granted whiteboard
      if (participant && !isStaff(participant.role) && !participant.allowWhiteboard) return
      const roomId = roomOf(payload.sessionId)
      socket.to(roomId).emit('whiteboard-draw', { stroke: payload.stroke })
    },
  )

  socket.on('whiteboard-clear', (payload: { sessionId: string }) => {
    const participant = participants.get(socket.id)
    if (participant && !isStaff(participant.role) && !participant.allowWhiteboard) return
    const roomId = roomOf(payload.sessionId)
    io.to(roomId).emit('whiteboard-clear')
  })

  socket.on('whiteboard-sync-request', (payload: { sessionId: string }) => {
    const roomId = roomOf(payload.sessionId)
    const target = firstOtherParticipantInRoom(roomId, socket.id)
    if (target) {
      io.to(target.socketId).emit('whiteboard-sync-request', {
        fromSocketId: socket.id,
      })
    } else {
      socket.emit('whiteboard-sync', { imageData: null })
    }
  })

  socket.on(
    'whiteboard-sync',
    (payload: { toSocketId: string; imageData: string | null }) => {
      io.to(payload.toSocketId).emit('whiteboard-sync', {
        imageData: payload.imageData,
      })
    },
  )

  // -------------------------------------------------------------------------
  // WebRTC signaling relay (real webcam / screen-share between peers)
  // -------------------------------------------------------------------------

  socket.on(
    'webrtc-offer',
    (payload: { toSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      io.to(payload.toSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        sdp: payload.sdp,
      })
    },
  )

  socket.on(
    'webrtc-answer',
    (payload: { toSocketId: string; sdp: RTCSessionDescriptionInit }) => {
      io.to(payload.toSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        sdp: payload.sdp,
      })
    },
  )

  socket.on(
    'webrtc-ice',
    (payload: { toSocketId: string; candidate: RTCIceCandidateInit }) => {
      io.to(payload.toSocketId).emit('webrtc-ice', {
        fromSocketId: socket.id,
        candidate: payload.candidate,
      })
    },
  )

  socket.on('webrtc-start', (payload: { toSocketId: string }) => {
    io.to(payload.toSocketId).emit('webrtc-start', { fromSocketId: socket.id })
  })

  socket.on('screen-share-start', (payload: { sessionId: string; name?: string }) => {
    const participant = participants.get(socket.id)
    if (participant && !isStaff(participant.role) && !participant.allowScreen) return
    const roomId = roomOf(payload.sessionId)
    io.to(roomId).emit('screen-share-start', {
      socketId: socket.id,
      name: payload.name ?? '',
    })
  })

  socket.on('screen-share-stop', (payload: { sessionId: string; name?: string }) => {
    const roomId = roomOf(payload.sessionId)
    io.to(roomId).emit('screen-share-stop', {
      socketId: socket.id,
      name: payload.name ?? '',
    })
  })

  // -------------------------------------------------------------------------
  // Recording / class control notifications
  // -------------------------------------------------------------------------

  socket.on('recording-started', (payload: { sessionId: string }) => {
    const roomId = roomOf(payload.sessionId)
    io.to(roomId).emit('recording-started', { startedBy: socket.id })
  })

  socket.on('recording-stopped', (payload: { sessionId: string }) => {
    const roomId = roomOf(payload.sessionId)
    io.to(roomId).emit('recording-stopped', { stoppedBy: socket.id })
  })

  socket.on('force-mute', (payload: { socketId: string }) => {
    const target = participants.get(payload.socketId)
    io.to(payload.socketId).emit('force-muted', { bySocketId: socket.id })
    if (target) {
      target.micOn = false
      io.to(target.roomId).emit('participant-updated', {
        socketId: target.socketId,
        micOn: false,
      })
    }
  })

  socket.on('kick-user', (payload: { socketId: string }) => {
    const target = participants.get(payload.socketId)
    io.to(payload.socketId).emit('kicked', { bySocketId: socket.id })
    const targetSocket = io.sockets.sockets.get(payload.socketId)
    if (targetSocket) {
      targetSocket.disconnect(true)
    }
    if (target) {
      console.log(`[kick-user] ${target.name} was kicked from ${target.roomId}`)
    }
  })

  // -------------------------------------------------------------------------
  // Permission grant / revoke  (teacher <-> student, live)
  // -------------------------------------------------------------------------

  socket.on(
    'permission-grant',
    (payload: { socketId: string; permission: Permission }) => {
      const requester = participants.get(socket.id)
      if (!requester || !isStaff(requester.role)) return // only staff can grant
      const target = participants.get(payload.socketId)
      if (!target) return
      applyPermission(target, payload.permission, true)
      // notify the target client
      io.to(payload.socketId).emit('permission-grant', {
        bySocketId: socket.id,
        permission: payload.permission,
      })
      // broadcast updated state to the whole room
      io.to(target.roomId).emit('participant-updated', {
        socketId: target.socketId,
        [permField(payload.permission)]: true,
      })
      console.log(`[permission-grant] ${requester.name} -> ${target.name}: ${payload.permission}`)
    },
  )

  socket.on(
    'permission-revoke',
    (payload: { socketId: string; permission: Permission }) => {
      const requester = participants.get(socket.id)
      if (!requester || !isStaff(requester.role)) return
      const target = participants.get(payload.socketId)
      if (!target) return
      applyPermission(target, payload.permission, false)
      io.to(payload.socketId).emit('permission-revoke', {
        bySocketId: socket.id,
        permission: payload.permission,
      })
      // broadcast updated state (includes forced micOn/camOn=false when relevant)
      const update: Record<string, unknown> = { socketId: target.socketId, [permField(payload.permission)]: false }
      if (payload.permission === 'mic') update.micOn = false
      if (payload.permission === 'cam') update.camOn = false
      io.to(target.roomId).emit('participant-updated', update)
      console.log(`[permission-revoke] ${requester.name} -> ${target.name}: ${payload.permission}`)
    },
  )

  // -------------------------------------------------------------------------
  // Direct messaging (admin <-> teacher, dashboard-level)
  // -------------------------------------------------------------------------

  socket.on('dm-register', (payload: { userId: string }) => {
    if (!payload.userId) return
    let set = userSockets.get(payload.userId)
    if (!set) {
      set = new Set()
      userSockets.set(payload.userId, set)
    }
    set.add(socket.id)
    // remember on the socket for cleanup
    ;(socket as any).__dmUserId = payload.userId
  })

  socket.on(
    'dm-send',
    (payload: {
      toUserId: string
      message: {
        id: string
        conversationId: string
        senderId: string
        senderName: string
        senderAvatar: string
        content: string
        createdAt: string
      }
    }) => {
      const targetSockets = userSockets.get(payload.toUserId)
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit('dm-receive', payload.message)
        }
      }
      // also relay to sender's OTHER sockets (multi-tab)
      const senderId = payload.message.senderId
      if (senderId) {
        const senderSockets = userSockets.get(senderId)
        if (senderSockets) {
          for (const sid of senderSockets) {
            if (sid !== socket.id) io.to(sid).emit('dm-receive', payload.message)
          }
        }
      }
    },
  )

  socket.on(
    'dm-typing',
    (payload: { toUserId: string; conversationId: string; name: string }) => {
      const targetSockets = userSockets.get(payload.toUserId)
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit('dm-typing', { conversationId: payload.conversationId, name: payload.name })
        }
      }
    },
  )

  socket.on(
    'dm-conversation-changed',
    (payload: { toUserId: string; conversationId: string; action: 'close' | 'reopen' | 'delete' }) => {
      const targetSockets = userSockets.get(payload.toUserId)
      if (targetSockets) {
        for (const sid of targetSockets) {
          io.to(sid).emit('dm-conversation-changed', { conversationId: payload.conversationId, action: payload.action })
        }
      }
    },
  )

  // -------------------------------------------------------------------------
  // Disconnect / error
  // -------------------------------------------------------------------------

  socket.on('disconnect', () => {
    const { participant, roomId } = removeParticipant(socket)
    if (participant && roomId) {
      io.to(roomId).emit('participant-left', { socketId: socket.id })
      console.log(
        `[disconnect] ${participant.name} left ${roomId} | remaining: ${listParticipantsInRoom(roomId).length}`,
      )
    } else {
      console.log(`[socket] disconnected: ${socket.id}`)
    }
    // DM cleanup
    const dmUserId = (socket as any).__dmUserId as string | undefined
    if (dmUserId) {
      const set = userSockets.get(dmUserId)
      if (set) {
        set.delete(socket.id)
        if (set.size === 0) userSockets.delete(dmUserId)
      }
    }
  })

  socket.on('error', (error: unknown) => {
    console.error(`[socket] error on ${socket.id}:`, error)
  })
})

// ---------------------------------------------------------------------------
// Boot + graceful shutdown
// ---------------------------------------------------------------------------

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[classroom-socket] Socket.io server running on port ${PORT}`)
  console.log(`[classroom-socket] path: "/" | CORS: * | pingTimeout: 60000 | pingInterval: 25000`)
})

process.on('SIGTERM', () => {
  console.log('[classroom-socket] received SIGTERM, shutting down...')
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
})

process.on('SIGINT', () => {
  console.log('[classroom-socket] received SIGINT, shutting down...')
  io.close(() => {
    httpServer.close(() => process.exit(0))
  })
})
