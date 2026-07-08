import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sess = await db.session.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, code: true, color: true, teacherId: true, teacher: { select: { id: true, name: true, avatar: true } } } },
      messages: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'asc' }, take: 100 },
      _count: { select: { attendances: true } },
    },
  })
  if (!sess) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ session: sess })
}
