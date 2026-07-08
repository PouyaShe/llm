import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role === 'TEACHER') {
    const courses = await db.course.findMany({
      where: { teacherId: session.userId },
      include: { _count: { select: { enrollments: true, sessions: true } }, teacher: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ courses })
  }
  if (session.role === 'STUDENT') {
    const courses = await db.course.findMany({
      where: { enrollments: { some: { studentId: session.userId } } },
      include: { _count: { select: { enrollments: true, sessions: true } }, teacher: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ courses })
  }
  // admin sees all
  const courses = await db.course.findMany({
    include: { _count: { select: { enrollments: true, sessions: true } }, teacher: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ courses })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { title, description, color } = await req.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const course = await db.course.create({
    data: {
      title,
      description: description || '',
      code,
      color: color || 'emerald',
      teacherId: session.userId,
    },
    include: { _count: { select: { enrollments: true, sessions: true } }, teacher: { select: { name: true, avatar: true } } },
  })
  return NextResponse.json({ course })
}
