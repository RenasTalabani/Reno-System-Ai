import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { RenoError } from '@reno/core'
import { logger } from '@reno/logger'

export function errorHandler(
  error: FastifyError | RenoError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id as string

  if (error instanceof RenoError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        requestId,
      },
    })
  }

  // Fastify validation errors
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.validation,
      },
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId },
    })
  }

  // Rate limit errors from @fastify/rate-limit
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
      meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId },
    })
  }

  logger.error({ err: error, requestId }, 'Unhandled API error')

  return reply.status(500).send({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
    meta: { timestamp: new Date().toISOString(), version: '1.0.0', requestId },
  })
}
