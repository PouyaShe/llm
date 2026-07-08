import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can enroll' }, { status: 403 })
  }
  const { id } = await params
  const existing = await db.enrollment.findUnique({
    where: { courseId_studentId: { courseId: id, studentId: session.userId } },
  })
  if (existing) return NextResponse.json({ ok: true, already: true })
  await db.enrollment.create({ data: { courseId: id, studentId: session.userId } })
  return NextResponse.json({ ok: true })
}
