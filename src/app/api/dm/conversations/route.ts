import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// Normalize: userAId < userBId to keep the unique constraint consistent
function ordered(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

// List my conversations (with last message + other participant + unread count)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const conversations = await db.directConversation.findMany({
    where: { OR: [{ userAId: session.userId }, { userBId: session.userId }] },
    include: {
      userA: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      userB: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  // count unread per conversation
  const result = await Promise.all(
    conversations.map(async (c) => {
      const unread = await db.directMessage.count({
        where: {
          conversationId: c.id,
          senderId: { not: session.userId },
          readAt: null,
        },
      })
      const other = c.userAId === session.userId ? c.userB : c.userA
      return {
        id: c.id,
        other,
        closedAt: c.closedAt,
        closedById: c.closedById,
        createdAt: c.createdAt,
        lastMessage: c.messages[0] || null,
        unread,
      }
    }),
  )
  return NextResponse.json({ conversations: result })
}

// Start (or get existing) conversation with a user
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  if (userId === session.userId) return NextResponse.json({ error: 'Cannot DM yourself' }, { status: 400 })

  // verify target is admin/teacher
  const target = await db.user.findUnique({ where: { id: userId } })
  if (!target || (target.role !== 'ADMIN' && target.role !== 'TEACHER')) {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
  }

  const [a, b] = ordered(session.userId, userId)
  const conv = await db.directConversation.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: {},
    create: { userAId: a, userBId: b },
    include: {
      userA: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      userB: { select: { id: true, name: true, email: true, role: true, avatar: true } },
    },
  })
  const other = conv.userAId === session.userId ? conv.userB : conv.userA
  return NextResponse.json({
    conversation: {
      id: conv.id,
      other,
      closedAt: conv.closedAt,
      closedById: conv.closedById,
      createdAt: conv.createdAt,
    },
  })
}
