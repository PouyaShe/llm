import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// List all students with their enrollment status for this course
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Only admin or the course teacher can manage
  const course = await db.course.findUnique({ where: { id } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.role !== 'ADMIN' && course.teacherId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const students = await db.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  const enrollments = await db.enrollment.findMany({
    where: { courseId: id },
    select: { studentId: true },
  })
  const enrolledIds = new Set(enrollments.map((e) => e.studentId))
  return NextResponse.json({
    students: students.map((s) => ({ ...s, enrolled: enrolledIds.has(s.id) })),
  })
}
