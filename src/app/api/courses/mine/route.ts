import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'STUDENT') return NextResponse.json({ courses: [] })
  const courses = await db.course.findMany({
    where: { enrollments: { some: { studentId: session.userId } } },
    include: { _count: { select: { enrollments: true, sessions: true } }, teacher: { select: { name: true, avatar: true } } },
  })
  return NextResponse.json({ courses })
}
