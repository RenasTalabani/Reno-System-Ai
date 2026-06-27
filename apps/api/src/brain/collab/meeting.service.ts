import { prisma } from '@reno/database'

export async function listMeetings(tenantId: string) {
  return prisma.aiMeeting.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { participants: true },
  })
}

export async function getMeeting(tenantId: string, meetingId: string) {
  return prisma.aiMeeting.findFirst({
    where: { id: meetingId, tenantId },
    include: {
      participants: true,
    },
  })
}

export async function createMeeting(params: {
  tenantId: string
  title: string
  agenda: string
  agentSlugs: string[]
  taskId?: string
}) {
  const meeting = await prisma.aiMeeting.create({
    data: {
      tenantId: params.tenantId,
      title: params.title,
      agenda: params.agenda,
      taskId: params.taskId,
      status: 'scheduled',
    },
  })
  if (params.agentSlugs.length) {
    await prisma.aiMeetingParticipant.createMany({
      data: params.agentSlugs.map((slug, i) => ({
        meetingId: meeting.id,
        agentSlug: slug,
        role: i === 0 ? 'chair' : 'member',
      })),
      skipDuplicates: true,
    })
  }
  return meeting
}
