import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const where: any = {}
  if (courseId) where.courseId = courseId
  if (session.role === 'TEACHER') {
    where.course = { teacherId: session.userId }
  } else if (session.role === 'STUDENT') {
    where.course = { enrollments: { some: { studentId: session.userId } } }
  }
  const sessions = await db.session.findMany({
    where,
    include: { course: { select: { id: true, title: true, code: true, color: true } }, _count: { select: { attendances: true, messages: true } } },
    orderBy: { scheduledAt: 'desc' },
  })
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { courseId, title, description, scheduledAt } = await req.json()
  if (!courseId || !title) return NextResponse.json({ error: 'courseId and title required' }, { status: 400 })
  const sess = await db.session.create({
    data: {
      courseId,
      title,
      description: description || '',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
    },
    include: { course: { select: { id: true, title: true, code: true, color: true } } },
  })
  return NextResponse.json({ session: sess })
}
