import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can join by code' }, { status: 403 })
  }
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })
  const course = await db.course.findUnique({ where: { code: code.toUpperCase().trim() } })
  if (!course) return NextResponse.json({ error: 'Invalid code' }, { status: 404 })
  const existing = await db.enrollment.findUnique({
    where: { courseId_studentId: { courseId: course.id, studentId: session.userId } },
  })
  if (!existing) {
    await db.enrollment.create({ data: { courseId: course.id, studentId: session.userId } })
  }
  return NextResponse.json({ course })
}
