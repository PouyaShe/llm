import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const sess = await db.session.update({
    where: { id },
    data: { status: 'LIVE', startedAt: new Date() },
  })
  // record attendance for the starter
  await db.attendance.upsert({
    where: { id: `${id}-${session.userId}` },
    update: {},
    create: { id: `${id}-${session.userId}`, sessionId: id, userId: session.userId },
  })
  return NextResponse.json({ session: sess })
}
