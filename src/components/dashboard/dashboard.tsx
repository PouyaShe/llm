'use client'

import { useApp, type Role } from '@/lib/store'
import { AdminDashboard } from './admin-dashboard'
import { TeacherDashboard } from './teacher-dashboard'
import { StudentDashboard } from './student-dashboard'

export function Dashboard() {
  const { user } = useApp()
  if (!user) return null

  const role: Role = user.role
  if (role === 'ADMIN') return <AdminDashboard />
  if (role === 'TEACHER') return <TeacherDashboard />
  return <StudentDashboard />
}
