/**
 * Reno Observability — OpenTelemetry Distributed Tracing
 * Phase 24: Observability & Monitoring Platform
 *
 * Initializes the OTel SDK with Fastify + pg auto-instrumentation.
 * Call initTracing() before importing Fastify so instrumentation patches first.
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { logger } from '@reno/logger'
import { traceSpansTotal, activeSpans } from './metrics.js'

const OTLP_ENDPOINT = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? ''
const NODE_ENV = process.env['NODE_ENV'] ?? 'development'

let sdk: NodeSDK | null = null

export function initTracing(): void {
  const resource = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: 'reno-api',
    [SEMRESATTRS_SERVICE_VERSION]: '0.1.0',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: NODE_ENV,
  })

  const spanProcessors = []

  if (OTLP_ENDPOINT) {
    // Production: export to OpenTelemetry Collector (Jaeger, Tempo, etc.)
    const exporter = new OTLPTraceExporter({ url: `${OTLP_ENDPOINT}/v1/traces` })
    spanProcessors.push(new BatchSpanProcessor(exporter))
    logger.info({ endpoint: OTLP_ENDPOINT }, 'OpenTelemetry OTLP exporter configured')
  } else if (NODE_ENV === 'development') {
    // Development: log span counts only (no console spam)
    const countingExporter = {
      export(spans: unknown[], done: (result: { code: number }) => void) {
        const count = Array.isArray(spans) ? spans.length : 0
        traceSpansTotal.inc(count)
        done({ code: 0 })
      },
      shutdown() { return Promise.resolve() },
    }
    spanProcessors.push(new SimpleSpanProcessor(countingExporter as unknown as ConsoleSpanExporter))
  }

  sdk = new NodeSDK({
    resource,
    spanProcessors,
    instrumentations: [
      new FastifyInstrumentation({
        requestHook: (_span, info) => {
          activeSpans.inc()
          void info // suppress unused warning
        },
      }),
      new PgInstrumentation({
        enhancedDatabaseReporting: false, // don't log query values (PII risk)
      }),
    ],
  })

  sdk.start()
  logger.info('OpenTelemetry SDK initialized')
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown()
    sdk = null
    logger.info('OpenTelemetry SDK shut down')
  }
}
