import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

async function ensureParticipant(conversationId: string, userId: string) {
  const c = await db.directConversation.findUnique({ where: { id: conversationId } })
  if (!c) return null
  if (c.userAId !== userId && c.userBId !== userId) return null
  return c
}

// List messages
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const conv = await ensureParticipant(id, session.userId)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const messages = await db.directMessage.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: m.sender.name,
      senderAvatar: m.sender.avatar,
      content: m.content,
      createdAt: m.createdAt,
    })),
  })
}

// Send message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const conv = await ensureParticipant(id, session.userId)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (conv.closedAt) return NextResponse.json({ error: 'این گفتگو بسته شده است' }, { status: 400 })
  const { content } = await req.json()
  if (!content || !content.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })
  const msg = await db.directMessage.create({
    data: { conversationId: id, senderId: session.userId, content: content.trim() },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
  })
  const otherId = conv.userAId === session.userId ? conv.userBId : conv.userAId
  return NextResponse.json({
    message: {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      senderAvatar: msg.sender.avatar,
      content: msg.content,
      createdAt: msg.createdAt,
    },
    toUserId: otherId,
  })
}
