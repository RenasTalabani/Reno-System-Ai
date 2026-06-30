import { prisma } from '@reno/database'

export interface TaskStep {
  id: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  result?: string
  startedAt?: string
  completedAt?: string
}

export async function executeTask(taskId: string, approverId: string): Promise<void> {
  const task = await prisma.aiwTask.findUnique({ where: { id: taskId } })
  if (!task) throw new Error('Task not found')
  if (task.status !== 'pending_approval') throw new Error(`Task is not awaiting approval (status: ${task.status})`)

  // Mark approved
  await prisma.aiwTask.update({
    where: { id: taskId },
    data: { status: 'running', approvedBy: approverId, approvedAt: new Date() },
  })

  const rawSteps = task.steps as unknown as TaskStep[]
  const steps: TaskStep[] = rawSteps.map(s => ({ ...s, status: 'pending' as const }))

  // Execute steps sequentially (simulated — real execution happens per step type)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step) continue
    steps[i] = { ...step, status: 'running', startedAt: new Date().toISOString() }
    await prisma.aiwTask.update({ where: { id: taskId }, data: { steps: steps as never } })

    // Simulate step execution — in production each step type dispatches to the right handler
    await new Promise(r => setTimeout(r, 50))
    steps[i] = {
      ...steps[i]!,
      status: 'completed',
      result: `Step "${steps[i]!.title}" completed successfully`,
      completedAt: new Date().toISOString(),
    }
    await prisma.aiwTask.update({ where: { id: taskId }, data: { steps: steps as never } })
  }

  await prisma.aiwTask.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      result: { completedSteps: steps.length, summary: 'All steps completed successfully' } as never,
      steps: steps as never,
    },
  })
}

export function buildSteps(description: string): TaskStep[] {
  // Parse natural language description into steps
  const lines = description.split('\n').filter(l => l.trim())
  if (lines.length <= 1) {
    return [
      { id: '1', title: 'Analyze request', status: 'pending' },
      { id: '2', title: description.trim() || 'Execute action', status: 'pending' },
      { id: '3', title: 'Verify and report', status: 'pending' },
    ]
  }
  return lines.map((l, i) => ({ id: String(i + 1), title: l.trim().replace(/^[-*\d.]+\s*/, ''), status: 'pending' as const }))
}
