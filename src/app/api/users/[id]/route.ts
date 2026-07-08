import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json()
  const data: any = {}
  if (body.role) data.role = body.role
  if (body.status) data.status = body.status
  if (body.name) data.name = body.name
  if (typeof body.canCreateClass === 'boolean') data.canCreateClass = body.canCreateClass
  if (typeof body.canCreateMeeting === 'boolean') data.canCreateMeeting = body.canCreateMeeting
  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, avatar: true, status: true, canCreateClass: true, canCreateMeeting: true, createdAt: true },
  })
  return NextResponse.json({ user })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
