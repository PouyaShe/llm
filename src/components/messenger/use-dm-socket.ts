'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { Role } from '@/lib/store'

export interface DMMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  createdAt: string
}

export interface DMConversation {
  id: string
  other: {
    id: string
    name: string
    email: string
    role: Role
    avatar: string | null
  }
  closedAt: string | null
  closedById: string | null
  createdAt: string
  lastMessage?: DMMessage | null
  unread?: number
}

export function useDmSocket(userId: string) {
  const socketRef = useRef<Socket | null>(null)
  const receiveCb = useRef<((m: DMMessage) => void) | null>(null)
  const typingCb = useRef<((d: { conversationId: string; name: string }) => void) | null>(null)
  const convChangedCb = useRef<((d: { conversationId: string; action: string }) => void) | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
    })
    socketRef.current = socket
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('dm-register', { userId })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('dm-receive', (m: DMMessage) => {
      if (receiveCb.current) receiveCb.current(m)
    })
    socket.on('dm-typing', (d: { conversationId: string; name: string }) => {
      if (typingCb.current) typingCb.current(d)
    })
    socket.on('dm-conversation-changed', (d: { conversationId: string; action: string }) => {
      if (convChangedCb.current) convChangedCb.current(d)
    })
    return () => {
      socket.disconnect()
    }
  }, [userId])

  const onReceive = useCallback((cb: (m: DMMessage) => void) => {
    receiveCb.current = cb
  }, [])
  const onTyping = useCallback((cb: (d: { conversationId: string; name: string }) => void) => {
    typingCb.current = cb
  }, [])
  const onConvChanged = useCallback((cb: (d: { conversationId: string; action: string }) => void) => {
    convChangedCb.current = cb
  }, [])

  const sendMessage = useCallback((toUserId: string, message: DMMessage) => {
    socketRef.current?.emit('dm-send', { toUserId, message })
  }, [])
  const sendTyping = useCallback((toUserId: string, conversationId: string, name: string) => {
    socketRef.current?.emit('dm-typing', { toUserId, conversationId, name })
  }, [])
  const notifyConvChanged = useCallback((toUserId: string, conversationId: string, action: 'close' | 'reopen' | 'delete') => {
    socketRef.current?.emit('dm-conversation-changed', { toUserId, conversationId, action })
  }, [])

  return { connected, onReceive, onTyping, onConvChanged, sendMessage, sendTyping, notifyConvChanged }
}
