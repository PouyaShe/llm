'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Role } from '@/lib/store'

export type Permission = 'mic' | 'cam' | 'screen' | 'whiteboard'

export interface Participant {
  socketId: string
  userId: string
  name: string
  role: Role
  avatar: string
  micOn: boolean
  camOn: boolean
  handRaised: boolean
  isSpeaking: boolean
  allowMic: boolean
  allowCam: boolean
  allowScreen: boolean
  allowWhiteboard: boolean
  sharing?: boolean
  isLocal?: boolean
  stream?: MediaStream | null
}

export interface ChatMessage {
  id: string
  userId: string
  name: string
  content: string
  avatar?: string
  timestamp: string
  type: 'user' | 'system'
  private?: boolean
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const isStaff = (role: Role) => role === 'ADMIN' || role === 'TEACHER'

export function useClassroomSocket(opts: {
  sessionId: string
  user: { id: string; name: string; role: Role; avatar?: string | null }
}) {
  const { sessionId, user } = opts
  const staff = isStaff(user.role)
  const socketRef = useRef<Socket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localParticipantRef = useRef<Participant | null>(null)
  const audioAnalyserRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode; raf: number } | null>(null)
  const localStateRef = useRef<any>(null)

  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [localState, setLocalState] = useState({
    micOn: staff,
    camOn: staff,
    handRaised: false,
    isSpeaking: false,
    allowMic: staff,
    allowCam: staff,
    allowScreen: staff,
    allowWhiteboard: staff,
  })
  const [recording, setRecording] = useState(false)
  const [kicked, setKicked] = useState(false)
  const [forceMuted, setForceMuted] = useState(false)
  const [permissionToast, setPermissionToast] = useState<string | null>(null)
  // private chats within the meeting, keyed by participant socketId
  const [privateChats, setPrivateChats] = useState<Record<string, ChatMessage[]>>({})
  const [privateUnread, setPrivateUnread] = useState<Record<string, number>>({})
  const [chatCleared, setChatCleared] = useState(false)

  useEffect(() => { localStateRef.current = localState }, [localState])

  const pushSystem = useCallback((content: string) => {
    setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), userId: 'system', name: 'System', content, timestamp: new Date().toISOString(), type: 'system' }])
  }, [])

  // ---- local media ----
  const initLocalMedia = useCallback(async (startMicOn: boolean, startCamOn: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 360 } },
      })
      stream.getAudioTracks().forEach((t) => (t.enabled = startMicOn))
      stream.getVideoTracks().forEach((t) => (t.enabled = startCamOn))
      localStreamRef.current = stream
      setLocalStream(stream)
      if (startMicOn) setupSpeakingDetection(stream)
      return stream
    } catch (e) {
      console.warn('getUserMedia failed', e)
      return null
    }
  }, [])

  const setupSpeakingDetection = useCallback((stream: MediaStream) => {
    try {
      if (audioAnalyserRef.current) {
        cancelAnimationFrame(audioAnalyserRef.current.raf)
        audioAnalyserRef.current.ctx.close()
      }
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      src.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let speaking = false
      const tick = () => {
        analyser.getByteFrequencyData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i]
        const avg = sum / data.length
        const nowSpeaking = avg > 18
        if (nowSpeaking !== speaking) {
          speaking = nowSpeaking
          setLocalState((prev) => {
            if (prev.isSpeaking === nowSpeaking) return prev
            const next = { ...prev, isSpeaking: nowSpeaking }
            socketRef.current?.emit('update-participant', { isSpeaking: nowSpeaking })
            return next
          })
        }
        audioAnalyserRef.current = { ctx, analyser, raf: requestAnimationFrame(tick) }
      }
      tick()
    } catch (e) {
      console.warn('speaking detection failed', e)
    }
  }, [])

  const broadcastState = useCallback((state: typeof localState) => {
    socketRef.current?.emit('update-participant', {
      micOn: state.micOn,
      camOn: state.camOn,
      handRaised: state.handRaised,
    })
  }, [])

  // ---- WebRTC ----
  const createPeer = useCallback((remoteSocketId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    const ls = localStreamRef.current
    if (ls) {
      ls.getTracks().forEach((t) => pc.addTrack(t, ls))
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtc-ice', { toSocketId: remoteSocketId, candidate: e.candidate })
      }
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0]
      setParticipants((prev) => prev.map((p) => (p.socketId === remoteSocketId ? { ...p, stream } : p)))
    }
    if (initiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socketRef.current?.emit('webrtc-offer', { toSocketId: remoteSocketId, sdp: offer })
        } catch (e) {
          console.warn('offer failed', e)
        }
      }
    }
    peersRef.current.set(remoteSocketId, pc)
    return pc
  }, [])

  // ---- connect ----
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
    })
    socketRef.current = socket

    socket.on('connect', async () => {
      setConnected(true)
      // students start muted/cam-off; staff start with both on
      const stream = await initLocalMedia(staff, staff)
      const me: Participant = {
        socketId: socket.id!,
        userId: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar || user.name[0]?.toUpperCase() || 'U',
        micOn: staff,
        camOn: staff,
        handRaised: false,
        isSpeaking: false,
        allowMic: staff,
        allowCam: staff,
        allowScreen: staff,
        allowWhiteboard: staff,
        isLocal: true,
        stream: stream,
      }
      localParticipantRef.current = me
      setParticipants([me])
      socket.emit('join-room', {
        sessionId,
        userId: user.id,
        name: user.name,
        role: user.role,
        avatar: user.avatar || user.name[0]?.toUpperCase() || 'U',
      })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('room-state', (data: { participants: Participant[] }) => {
      const others = data.participants.filter((p) => p.socketId !== socket.id)
      setParticipants((prev) => {
        const me = prev.find((p) => p.isLocal)
        return me ? [me, ...others] : others
      })
      others.forEach((p) => {
        if (!peersRef.current.has(p.socketId)) {
          createPeer(p.socketId, true)
        }
      })
    })

    socket.on('participant-joined', (p: Participant) => {
      setParticipants((prev) => {
        if (prev.find((x) => x.socketId === p.socketId)) return prev
        return [...prev, p]
      })
      if (!peersRef.current.has(p.socketId)) {
        createPeer(p.socketId, false)
      }
      pushSystem(`${p.name} وارد کلاس شد`)
    })

    socket.on('participant-left', ({ socketId }: { socketId: string }) => {
      setParticipants((prev) => {
        const left = prev.find((p) => p.socketId === socketId)
        if (left) pushSystem(`${left.name} کلاس را ترک کرد`)
        return prev.filter((p) => p.socketId !== socketId)
      })
      const pc = peersRef.current.get(socketId)
      if (pc) { pc.close(); peersRef.current.delete(socketId) }
    })

    socket.on('participant-updated', ({ socketId, ...changes }: any) => {
      // if this is me, sync localState too
      if (socketId === socket.id) {
        setLocalState((prev) => {
          const next = { ...prev }
          if (changes.allowMic !== undefined) next.allowMic = changes.allowMic
          if (changes.allowCam !== undefined) next.allowCam = changes.allowCam
          if (changes.allowScreen !== undefined) next.allowScreen = changes.allowScreen
          if (changes.allowWhiteboard !== undefined) next.allowWhiteboard = changes.allowWhiteboard
          if (changes.micOn !== undefined) next.micOn = changes.micOn
          if (changes.camOn !== undefined) next.camOn = changes.camOn
          // enforce media off when permission revoked
          if (changes.allowMic === false) {
            next.micOn = false
            localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false))
          }
          if (changes.allowCam === false) {
            next.camOn = false
            localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false))
          }
          return next
        })
      }
      setParticipants((prev) => prev.map((p) => (p.socketId === socketId ? { ...p, ...changes } : p)))
    })

    socket.on('receive-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
      setChatCleared(false)
    })

    // incoming private message from another participant
    socket.on('private-message', (msg: any) => {
      const convKey = msg.fromSocketId || msg.from?.userId
      const pm: ChatMessage = {
        id: msg.id || Math.random().toString(36).slice(2),
        userId: msg.from?.userId || 'system',
        name: msg.from?.name || 'System',
        content: msg.content,
        avatar: msg.from?.avatar,
        timestamp: new Date(msg.timestamp).toISOString(),
        type: 'user',
        private: true,
      }
      setPrivateChats((prev) => ({
        ...prev,
        [convKey]: [...(prev[convKey] || []), pm],
      }))
      setPrivateUnread((prev) => ({
        ...prev,
        [convKey]: (prev[convKey] || 0) + 1,
      }))
    })

    // echo of a private message I sent (so my own UI shows it in the right conversation)
    socket.on('private-message-echo', (msg: any) => {
      const convKey = msg.toSocketId
      const pm: ChatMessage = {
        id: msg.id || Math.random().toString(36).slice(2),
        userId: user.id,
        name: user.name + ' (شما)',
        content: msg.content,
        avatar: user.avatar || undefined,
        timestamp: new Date(msg.timestamp).toISOString(),
        type: 'user',
        private: true,
      }
      setPrivateChats((prev) => ({
        ...prev,
        [convKey]: [...(prev[convKey] || []), pm],
      }))
    })

    // chat cleared by staff
    socket.on('chat-clear', () => {
      setMessages([])
      setChatCleared(true)
      pushSystem('چت توسط استاد پاک شد')
    })

    socket.on('recording-started', () => setRecording(true))
    socket.on('recording-stopped', () => setRecording(false))
    socket.on('force-muted', () => {
      setForceMuted(true)
      setLocalState((prev) => {
        const next = { ...prev, micOn: false }
        localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false))
        return next
      })
      setPermissionToast('استاد شما را بی‌صدا کرد')
    })
    socket.on('kicked', () => setKicked(true))

    socket.on('permission-grant', ({ permission }: { permission: Permission }) => {
      const labels: Record<Permission, string> = {
        mic: 'اجازه میکروفون داده شد',
        cam: 'اجازه وب‌کم داده شد',
        screen: 'اجازه اشتراک صفحه داده شد',
        whiteboard: 'اجازه وایت‌برد داده شد',
      }
      setPermissionToast(labels[permission])
      setLocalState((prev) => {
        const next = { ...prev }
        if (permission === 'mic') next.allowMic = true
        if (permission === 'cam') next.allowCam = true
        if (permission === 'screen') next.allowScreen = true
        if (permission === 'whiteboard') next.allowWhiteboard = true
        return next
      })
    })

    socket.on('permission-revoke', ({ permission }: { permission: Permission }) => {
      const labels: Record<Permission, string> = {
        mic: 'اجازه میکروفون گرفته شد',
        cam: 'اجازه وب‌کم گرفته شد',
        screen: 'اجازه اشتراک صفحه گرفته شد',
        whiteboard: 'اجازه وایت‌برد گرفته شد',
      }
      setPermissionToast(labels[permission])
      setLocalState((prev) => {
        const next = { ...prev }
        if (permission === 'mic') {
          next.allowMic = false
          next.micOn = false
          localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false))
        }
        if (permission === 'cam') {
          next.allowCam = false
          next.camOn = false
          localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false))
        }
        if (permission === 'screen') {
          next.allowScreen = false
          // stop screen share if active
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop())
            screenStreamRef.current = null
            setScreenStream(null)
            socket.emit('screen-share-stop', { sessionId })
          }
        }
        if (permission === 'whiteboard') {
          next.allowWhiteboard = false
        }
        return next
      })
    })

    // WebRTC signaling
    socket.on('webrtc-offer', async ({ fromSocketId, sdp }: any) => {
      let pc = peersRef.current.get(fromSocketId)
      if (!pc) pc = createPeer(fromSocketId, false)
      try {
        await pc.setRemoteDescription(sdp)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc-answer', { toSocketId: fromSocketId, sdp: answer })
      } catch (e) { console.warn('offer handling failed', e) }
    })
    socket.on('webrtc-answer', async ({ fromSocketId, sdp }: any) => {
      const pc = peersRef.current.get(fromSocketId)
      if (pc) {
        try { await pc.setRemoteDescription(sdp) } catch (e) { console.warn(e) }
      }
    })
    socket.on('webrtc-ice', async ({ fromSocketId, candidate }: any) => {
      const pc = peersRef.current.get(fromSocketId)
      if (pc) {
        try { await pc.addIceCandidate(candidate) } catch (e) { /* ignore */ }
      }
    })

    socket.on('screen-share-start', ({ socketId, name }: any) => {
      pushSystem(`${name} اشتراک صفحه را شروع کرد`)
      setParticipants((prev) => prev.map((p) => (p.socketId === socketId ? { ...p, sharing: true } : p)))
    })
    socket.on('screen-share-stop', ({ socketId }: any) => {
      setParticipants((prev) => prev.map((p) => (p.socketId === socketId ? { ...p, sharing: false } : p)))
    })

    return () => {
      socket.disconnect()
      peersRef.current.forEach((pc) => pc.close())
      peersRef.current.clear()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      screenStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (audioAnalyserRef.current) {
        cancelAnimationFrame(audioAnalyserRef.current.raf)
        audioAnalyserRef.current.ctx.close()
      }
    }
  }, [sessionId, user.id])

  // ---- controls ----
  const toggleMic = useCallback(() => {
    setLocalState((prev) => {
      if (!prev.allowMic && !staff) {
        setPermissionToast('برای استفاده از میکروفون ابتدا دسترسی بگیرید')
        return prev
      }
      const next = { ...prev, micOn: !prev.micOn }
      const ls = localStreamRef.current
      if (ls) {
        ls.getAudioTracks().forEach((t) => (t.enabled = next.micOn))
        if (next.micOn && !audioAnalyserRef.current) setupSpeakingDetection(ls)
      }
      socketRef.current?.emit('update-participant', { micOn: next.micOn })
      return next
    })
  }, [staff, setupSpeakingDetection])

  const toggleCam = useCallback(() => {
    setLocalState((prev) => {
      if (!prev.allowCam && !staff) {
        setPermissionToast('برای استفاده از وب‌کم ابتدا دسترسی بگیرید')
        return prev
      }
      const next = { ...prev, camOn: !prev.camOn }
      const ls = localStreamRef.current
      if (ls) ls.getVideoTracks().forEach((t) => (t.enabled = next.camOn))
      socketRef.current?.emit('update-participant', { camOn: next.camOn })
      return next
    })
  }, [staff])

  const toggleHand = useCallback(() => {
    setLocalState((prev) => {
      const next = { ...prev, handRaised: !prev.handRaised }
      socketRef.current?.emit('update-participant', { handRaised: next.handRaised })
      return next
    })
  }, [])

  const sendMessage = useCallback((content: string) => {
    socketRef.current?.emit('send-message', { sessionId, userId: user.id, name: user.name, content, avatar: user.avatar })
  }, [sessionId, user])

  const sendPrivateMessage = useCallback((toSocketId: string, content: string) => {
    socketRef.current?.emit('send-private-message', { toSocketId, from: { userId: user.id, name: user.name, avatar: user.avatar }, content })
    // the server echoes back via 'private-message-echo' so we don't add it here
  }, [user])

  const markPrivateRead = useCallback((socketId: string) => {
    setPrivateUnread((prev) => ({ ...prev, [socketId]: 0 }))
  }, [])

  const clearMeetingChat = useCallback(() => {
    socketRef.current?.emit('chat-clear', { sessionId })
  }, [sessionId])

  // ---- screen share ----
  const startScreenShare = useCallback(async () => {
    if (!localStateRef.current?.allowScreen && !staff) {
      setPermissionToast('برای اشتراک صفحه ابتدا دسترسی بگیرید')
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      screenStreamRef.current = stream
      setScreenStream(stream)
      socketRef.current?.emit('screen-share-start', { sessionId, name: user.name })
      stream.getVideoTracks()[0].onended = () => stopScreenShare()
      return true
    } catch (e) {
      console.warn('screen share failed', e)
      return false
    }
  }, [sessionId, user, staff])

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    setScreenStream(null)
    socketRef.current?.emit('screen-share-stop', { sessionId })
  }, [sessionId])

  // ---- whiteboard ----
  const sendDraw = useCallback((stroke: any) => {
    socketRef.current?.emit('whiteboard-draw', { sessionId, stroke })
  }, [sessionId])
  const sendClear = useCallback(() => {
    socketRef.current?.emit('whiteboard-clear', { sessionId })
  }, [sessionId])
  const requestWhiteboardSync = useCallback(() => {
    socketRef.current?.emit('whiteboard-sync-request', { sessionId })
  }, [sessionId])

  const onWhiteboardDraw = useCallback((cb: (stroke: any) => void) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('whiteboard-draw', cb)
    return () => { s.off('whiteboard-draw', cb) }
  }, [])
  const onWhiteboardClear = useCallback((cb: () => void) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('whiteboard-clear', cb)
    return () => { s.off('whiteboard-clear', cb) }
  }, [])
  const onWhiteboardSync = useCallback((cb: (imageData: string) => void) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('whiteboard-sync', (data: { imageData: string | null }) => { if (data.imageData) cb(data.imageData) })
    return () => { s.off('whiteboard-sync') }
  }, [])
  const respondWhiteboardSync = useCallback((toSocketId: string, imageData: string) => {
    socketRef.current?.emit('whiteboard-sync', { toSocketId, imageData })
  }, [])
  const onWhiteboardSyncRequest = useCallback((cb: () => void) => {
    const s = socketRef.current
    if (!s) return () => {}
    s.on('whiteboard-sync-request', () => cb())
    return () => { s.off('whiteboard-sync-request') }
  }, [])

  // ---- teacher controls ----
  const forceMute = useCallback((socketId: string) => {
    socketRef.current?.emit('force-mute', { socketId })
  }, [])
  const kickUser = useCallback((socketId: string) => {
    socketRef.current?.emit('kick-user', { socketId })
  }, [])
  const grantPermission = useCallback((socketId: string, permission: Permission) => {
    socketRef.current?.emit('permission-grant', { socketId, permission })
  }, [])
  const revokePermission = useCallback((socketId: string, permission: Permission) => {
    socketRef.current?.emit('permission-revoke', { socketId, permission })
  }, [])
  const toggleRecording = useCallback(() => {
    if (recording) {
      socketRef.current?.emit('recording-stopped', { sessionId })
      setRecording(false)
    } else {
      socketRef.current?.emit('recording-started', { sessionId })
      setRecording(true)
    }
  }, [recording, sessionId])

  return {
    connected,
    participants,
    messages,
    localStream,
    screenStream,
    localState,
    recording,
    kicked,
    forceMuted,
    permissionToast,
    privateChats,
    privateUnread,
    chatCleared,
    clearPermissionToast: () => setPermissionToast(null),
    toggleMic,
    toggleCam,
    toggleHand,
    sendMessage,
    sendPrivateMessage,
    markPrivateRead,
    clearMeetingChat,
    startScreenShare,
    stopScreenShare,
    sendDraw,
    sendClear,
    requestWhiteboardSync,
    onWhiteboardDraw,
    onWhiteboardClear,
    onWhiteboardSync,
    respondWhiteboardSync,
    onWhiteboardSyncRequest,
    forceMute,
    kickUser,
    grantPermission,
    revokePermission,
    toggleRecording,
    clearForceMute: () => setForceMuted(false),
  }
}
