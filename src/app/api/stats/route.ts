import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [totalUsers, teachers, students, admins, totalCourses, totalSessions, liveSessions, totalMessages, recordings] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: 'TEACHER' } }),
    db.user.count({ where: { role: 'STUDENT' } }),
    db.user.count({ where: { role: 'ADMIN' } }),
    db.course.count(),
    db.session.count(),
    db.session.count({ where: { status: 'LIVE' } }),
    db.message.count(),
    db.recording.count(),
  ])
  const recentUsers = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
  const recentSessions = await db.session.findMany({
    include: { course: { select: { title: true, color: true } } },
    orderBy: { scheduledAt: 'desc' },
    take: 6,
  })
  return NextResponse.json({
    stats: {
      totalUsers, teachers, students, admins, totalCourses, totalSessions, liveSessions, totalMessages, recordings,
    },
    recentUsers,
    recentSessions,
  })
}
