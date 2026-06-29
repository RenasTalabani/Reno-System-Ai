import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/auth.js'
import { prisma } from '@reno/database'

export async function lms2Routes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  app.get('/summary', async (req) => {
    const { tenantId } = req
    const [courses, enrollments, completed] = await Promise.all([
      prisma.lms2Course.count({ where: { tenantId, status: 'published' } }),
      prisma.lms2Enrollment.count({ where: { course: { tenantId } } }),
      prisma.lms2Enrollment.count({ where: { course: { tenantId }, status: 'completed' } }),
    ])
    return { success: true, data: { publishedCourses: courses, totalEnrollments: enrollments, completedEnrollments: completed } }
  })

  app.get('/courses', async (req) => {
    const { tenantId } = req
    const q = req.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    const courses = await prisma.lms2Course.findMany({
      where: where as never,
      include: { _count: { select: { modules: true, enrollments: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return { success: true, data: courses }
  })

  app.post('/courses', async (req) => {
    const { tenantId, userId } = req
    const data = req.body as Record<string, unknown>
    const course = await prisma.lms2Course.create({ data: { tenantId, authorId: userId, ...data } as never })
    return { success: true, data: course }
  })

  app.get('/courses/:id', async (req) => {
    const { id } = req.params as { id: string }
    const course = await prisma.lms2Course.findUnique({
      where: { id },
      include: { modules: { orderBy: { order: 'asc' } }, _count: { select: { enrollments: true } } },
    })
    return { success: true, data: course }
  })

  app.patch('/courses/:id', async (req) => {
    const { id } = req.params as { id: string }
    const data = req.body as Record<string, unknown>
    const course = await prisma.lms2Course.update({ where: { id }, data: data as never })
    return { success: true, data: course }
  })

  app.post('/courses/:id/enroll', async (req) => {
    const { id } = req.params as { id: string }
    const { userId } = req
    const existing = await prisma.lms2Enrollment.findFirst({ where: { courseId: id, learnerId: userId } })
    if (existing) return { success: false, error: 'Already enrolled' }
    const enrollment = await prisma.lms2Enrollment.create({ data: { courseId: id, learnerId: userId } as never })
    return { success: true, data: enrollment }
  })

  app.get('/my-enrollments', async (req) => {
    const { userId } = req
    const enrollments = await prisma.lms2Enrollment.findMany({
      where: { learnerId: userId },
      include: { course: { select: { title: true, category: true, level: true, thumbnailUrl: true } } },
      orderBy: { enrolledAt: 'desc' },
    })
    return { success: true, data: enrollments }
  })
}
