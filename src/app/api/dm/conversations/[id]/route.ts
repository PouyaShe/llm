import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

async function ensureParticipant(conversationId: string, userId: string) {
  const c = await db.directConversation.findUnique({ where: { id: conversationId } })
  if (!c) return null
  if (c.userAId !== userId && c.userBId !== userId) return null
  return c
}

// Get conversation detail + messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // mark messages from the other user as read
  await db.directMessage.updateMany({
    where: { conversationId: id, senderId: { not: session.userId }, readAt: null },
    data: { readAt: new Date() },
  })

  const other = conv.userAId === session.userId
    ? await db.user.findUnique({ where: { id: conv.userBId }, select: { id: true, name: true, email: true, role: true, avatar: true } })
    : await db.user.findUnique({ where: { id: conv.userAId }, select: { id: true, name: true, email: true, role: true, avatar: true } })

  return NextResponse.json({
    conversation: {
      id: conv.id,
      other,
      closedAt: conv.closedAt,
      closedById: conv.closedById,
      createdAt: conv.createdAt,
    },
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

// Close / reopen conversation
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const conv = await ensureParticipant(id, session.userId)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { action } = await req.json() // 'close' | 'reopen'
  const data: any = {}
  if (action === 'close') {
    data.closedAt = new Date()
    data.closedById = session.userId
  } else if (action === 'reopen') {
    data.closedAt = null
    data.closedById = null
  }
  const updated = await db.directConversation.update({ where: { id }, data })
  return NextResponse.json({ conversation: updated })
}

// Delete conversation
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const conv = await ensureParticipant(id, session.userId)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.directConversation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
