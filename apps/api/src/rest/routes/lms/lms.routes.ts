import type { FastifyInstance } from 'fastify'
import { prisma } from '@reno/database'
import { buildSuccessResponse, RenoError, ErrorCode } from '@reno/core'
import { requireAuth } from '../../middleware/auth.js'

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function lmsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireAuth)

  // ── Courses ────────────────────────────────────────────────────────────────

  app.get('/courses', async (request, reply) => {
    const { tenantId } = request as any
    const q = request.query as any
    const where: any = { tenantId }
    if (q.status) where.status = q.status
    if (q.category) where.category = q.category
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' }
    const courses = await prisma.lmsCourse.findMany({ where, orderBy: { createdAt: 'desc' }, include: { _count: { select: { lessons: true, enrollments: true } } } })
    return reply.send(buildSuccessResponse(courses))
  })

  app.get('/courses/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const course = await prisma.lmsCourse.findFirst({ where: { id, tenantId }, include: { lessons: { orderBy: { orderIndex: 'asc' } }, _count: { select: { enrollments: true } } } })
    if (!course) throw new RenoError(ErrorCode.NOT_FOUND, 'Course not found', 404)
    return reply.send(buildSuccessResponse(course))
  })

  app.post('/courses', async (request, reply) => {
    const { tenantId, userId } = request as any
    const body = request.body as any
    const baseSlug = toSlug(body.title)
    let slug = baseSlug
    let n = 1
    while (await prisma.lmsCourse.findFirst({ where: { tenantId, slug } })) {
      slug = `${baseSlug}-${n++}`
    }
    const course = await prisma.lmsCourse.create({
      data: { tenantId, createdBy: userId, title: body.title, slug, description: body.description, category: body.category, level: body.level ?? 'beginner', isMandatory: body.isMandatory ?? false, passScore: body.passScore ?? 70 },
    })
    return reply.status(201).send(buildSuccessResponse(course))
  })

  app.put('/courses/:id', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const updated = await prisma.lmsCourse.updateMany({ where: { id, tenantId }, data: { title: body.title, description: body.description, category: body.category, level: body.level, status: body.status, isMandatory: body.isMandatory, passScore: body.passScore } })
    if (!updated.count) throw new RenoError(ErrorCode.NOT_FOUND, 'Course not found', 404)
    return reply.send(buildSuccessResponse({ updated: true }))
  })

  app.patch('/courses/:id/publish', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    await prisma.lmsCourse.updateMany({ where: { id, tenantId }, data: { status: 'published' } })
    return reply.send(buildSuccessResponse({ status: 'published' }))
  })

  // ── Lessons ────────────────────────────────────────────────────────────────

  app.post('/courses/:id/lessons', async (request, reply) => {
    const { tenantId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const maxOrder = await prisma.lmsLesson.count({ where: { courseId: id } })
    const lesson = await prisma.lmsLesson.create({
      data: { tenantId, courseId: id, title: body.title, type: body.type ?? 'text', content: body.content, videoUrl: body.videoUrl, durationMin: body.durationMin ?? 0, orderIndex: body.orderIndex ?? maxOrder, isQuiz: body.isQuiz ?? false, quizData: body.quizData ?? {} },
    })
    return reply.status(201).send(buildSuccessResponse(lesson))
  })

  app.put('/lessons/:lessonId', async (request, reply) => {
    const { lessonId } = request.params as any
    const body = request.body as any
    const lesson = await prisma.lmsLesson.update({ where: { id: lessonId }, data: { title: body.title, content: body.content, videoUrl: body.videoUrl, type: body.type, durationMin: body.durationMin, isQuiz: body.isQuiz, quizData: body.quizData } })
    return reply.send(buildSuccessResponse(lesson))
  })

  // ── Enrollments ────────────────────────────────────────────────────────────

  app.post('/courses/:id/enroll', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { id } = request.params as any
    const body = request.body as any
    const enrollment = await prisma.lmsEnrollment.upsert({
      where: { courseId_userId: { courseId: id, userId: body.userId ?? userId } },
      create: { tenantId, courseId: id, userId: body.userId ?? userId, dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
      update: { status: 'enrolled', dueDate: body.dueDate ? new Date(body.dueDate) : undefined },
    })
    return reply.status(201).send(buildSuccessResponse(enrollment))
  })

  app.get('/my-courses', async (request, reply) => {
    const { tenantId, userId } = request as any
    const enrollments = await prisma.lmsEnrollment.findMany({
      where: { tenantId, userId },
      include: { course: { select: { id: true, title: true, category: true, level: true, durationMin: true, thumbnailUrl: true, _count: { select: { lessons: true } } } } },
      orderBy: { enrolledAt: 'desc' },
    })
    return reply.send(buildSuccessResponse(enrollments))
  })

  // ── Progress ───────────────────────────────────────────────────────────────

  app.post('/lessons/:lessonId/complete', async (request, reply) => {
    const { tenantId, userId } = request as any
    const { lessonId } = request.params as any
    const body = request.body as any

    const progressRecord = await prisma.lmsProgress.upsert({
      where: { lessonId_userId: { lessonId, userId } },
      create: { tenantId, lessonId, userId, isComplete: true, score: body.score, attempts: 1 },
      update: { isComplete: true, score: body.score, attempts: { increment: 1 } },
    })

    // Recalculate enrollment progress
    const lesson = await prisma.lmsLesson.findUnique({ where: { id: lessonId } })
    if (lesson) {
      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lmsLesson.count({ where: { courseId: lesson.courseId } }),
        prisma.lmsProgress.count({ where: { userId, isComplete: true, lesson: { courseId: lesson.courseId } } }),
      ])
      const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      const isCompleted = progressPct === 100
      await prisma.lmsEnrollment.updateMany({
        where: { courseId: lesson.courseId, userId },
        data: { progress: progressPct, status: isCompleted ? 'completed' : 'in_progress', completedAt: isCompleted ? new Date() : null },
      })
    }

    return reply.send(buildSuccessResponse(progressRecord))
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  app.get('/dashboard', async (request, reply) => {
    const { tenantId } = request as any
    const [totalCourses, publishedCourses, totalEnrollments, completedEnrollments] = await Promise.all([
      prisma.lmsCourse.count({ where: { tenantId } }),
      prisma.lmsCourse.count({ where: { tenantId, status: 'published' } }),
      prisma.lmsEnrollment.count({ where: { tenantId } }),
      prisma.lmsEnrollment.count({ where: { tenantId, status: 'completed' } }),
    ])
    return reply.send(buildSuccessResponse({
      totalCourses,
      publishedCourses,
      totalEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    }))
  })
}
