import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function educationAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [totalSchools, totalStudents, totalClasses] = await Promise.all([
      prisma.eduSchool.count({ where: { tenantId, isActive: true } }),
      prisma.eduStudent.count({ where: { school: { tenantId }, status: 'active' } }),
      prisma.eduClass.count({ where: { school: { tenantId } } }),
    ])
    return { success: true, data: { totalSchools, totalStudents, totalClasses } }
  })

  app.get('/schools', async (req) => {
    const { tenantId } = req
    const schools = await prisma.eduSchool.findMany({
      where: { tenantId },
      include: { _count: { select: { classes: true, students: true } } },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: schools }
  })

  app.post('/schools', async (req) => {
    const { tenantId } = req
    const data = req.body as Record<string, unknown>
    const school = await prisma.eduSchool.create({ data: { tenantId, ...data } as never })
    return { success: true, data: school }
  })

  app.get('/schools/:id/students', async (req) => {
    const { id } = req.params as { id: string }
    const students = await prisma.eduStudent.findMany({
      where: { schoolId: id },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: students }
  })

  app.post('/schools/:id/students', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const student = await prisma.eduStudent.create({ data: { schoolId: id, ...data } as never })
    return { success: true, data: student }
  })

  app.get('/schools/:id/classes', async (req) => {
    const { id } = req.params as { id: string }
    const classes = await prisma.eduClass.findMany({
      where: { schoolId: id },
      include: { _count: { select: { enrollments: true } } },
    })
    return { success: true, data: classes }
  })

  app.post('/schools/:id/classes', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const cls = await prisma.eduClass.create({ data: { schoolId: id, ...data } as never })
    return { success: true, data: cls }
  })

  app.post('/classes/:id/enroll', async (req) => {
    const { id } = req.params as { id: string }
    const { studentId } = req.body as { studentId: string }
    const enrollment = await prisma.eduEnrollment.create({ data: { classId: id, studentId } })
    return { success: true, data: enrollment }
  })
}
