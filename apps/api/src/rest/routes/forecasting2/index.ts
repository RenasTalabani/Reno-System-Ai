import type { FastifyInstance } from 'fastify'
import { forecasting2Routes } from './routes.js'

export async function forecasting2ModuleRoutes(app: FastifyInstance) {
  await app.register(forecasting2Routes)
}