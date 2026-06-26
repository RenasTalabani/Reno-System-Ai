#!/usr/bin/env node
/**
 * Reno CLI — Developer & operator tool for Reno System.
 *
 * Usage: reno <command> [options]
 *
 * Commands:
 *   status              Show API health and environment info
 *   deploy              Deploy Reno (wraps docker compose)
 *   rollback            Rollback to a previous version
 *   migrate             Run database migrations
 *   logs                Stream API logs
 *   env validate        Validate environment variables
 *   webhook list        List registered webhooks
 *   webhook create      Register a new webhook
 */

import process from 'node:process'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')

const VERSION = '1.0.0'
const API_URL = process.env['RENO_API_URL'] ?? 'http://localhost:4000'

// ── Utilities ──────────────────────────────────────────────────────────────

function log(msg: string) { process.stdout.write(msg + '\n') }
function err(msg: string) { process.stderr.write(`[error] ${msg}\n`) }

function header(title: string) {
  log('')
  log('═'.repeat(50))
  log(`  ${title}`)
  log('═'.repeat(50))
}

async function fetchApi(path: string): Promise<unknown> {
  const apiKey = process.env['RENO_API_KEY'] ?? ''
  const tenantId = process.env['RENO_TENANT_ID'] ?? ''
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(apiKey && { 'X-API-Key': apiKey }),
      ...(tenantId && { 'X-Tenant-ID': tenantId }),
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function run(cmd: string) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT })
}

// ── Commands ──────────────────────────────────────────────────────────────

async function cmdStatus() {
  header('Reno System Status')
  try {
    const health = await fetchApi('/health') as Record<string, unknown>
    log(`  Status      : ${health['status']}`)
    log(`  Version     : ${health['version']}`)
    log(`  Environment : ${health['environment']}`)
    log(`  Uptime      : ${health['uptime']}s`)
    log(`  API URL     : ${API_URL}`)
  } catch (e) {
    err(`Could not reach API at ${API_URL}: ${e instanceof Error ? e.message : String(e)}`)
    log('  Is the API running? Start it with: reno dev')
    process.exit(1)
  }
}

async function cmdEnvValidate() {
  header('Environment Validation')
  try {
    const result = await fetchApi('/v1/deployment/env-validation') as {
      valid: boolean
      checks: { variable: string; present: boolean; minLength?: boolean }[]
    }
    for (const check of result.checks) {
      const ok = check.present && check.minLength !== false
      log(`  ${ok ? 'OK  ' : 'FAIL'} ${check.variable}`)
    }
    log('')
    log(result.valid ? '  All checks passed.' : '  Some checks failed. Check .env file.')
    if (!result.valid) process.exit(1)
  } catch (e) {
    err(`Validation failed: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }
}

function cmdDeploy(args: string[]) {
  const env = args[0] ?? 'staging'
  const tag = args[1] ?? 'latest'
  header(`Deploy → ${env} @ ${tag}`)
  run(`bash "${path.join(ROOT, 'scripts/deploy.sh')}" ${env} ${tag}`)
}

function cmdRollback(args: string[]) {
  const env = args[0] ?? 'staging'
  const tag = args[1]
  if (!tag) { err('Usage: reno rollback <env> <version>'); process.exit(1) }
  header(`Rollback → ${env} @ ${tag}`)
  run(`bash "${path.join(ROOT, 'scripts/rollback.sh')}" ${env} ${tag}`)
}

function cmdMigrate() {
  header('Database Migration')
  run(`bash "${path.join(ROOT, 'scripts/migrate.sh')}"`)
}

function cmdLogs(args: string[]) {
  const service = args[0] ?? 'api'
  run(`docker compose logs -f --tail=100 ${service}`)
}

function cmdHelp() {
  log('')
  log(`  Reno CLI v${VERSION}`)
  log('')
  log('  Usage: reno <command> [options]')
  log('')
  log('  Commands:')
  log('    status                  Show API health')
  log('    env validate            Validate environment variables')
  log('    deploy <env> <tag>      Deploy (e.g. reno deploy staging v27.0.0)')
  log('    rollback <env> <tag>    Rollback (e.g. reno rollback production v26.0.0)')
  log('    migrate                 Run DB migrations')
  log('    logs [service]          Tail container logs')
  log('    help                    Show this help')
  log('')
  log('  Environment variables:')
  log('    RENO_API_URL      API base URL (default: http://localhost:4000)')
  log('    RENO_API_KEY      API key for authenticated commands')
  log('    RENO_TENANT_ID    Default tenant ID')
  log('')
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const [, , command, ...args] = process.argv

  switch (command) {
    case 'status':
      await cmdStatus()
      break
    case 'env':
      if (args[0] === 'validate') await cmdEnvValidate()
      else { err(`Unknown env subcommand: ${args[0]}`); process.exit(1) }
      break
    case 'deploy':
      cmdDeploy(args)
      break
    case 'rollback':
      cmdRollback(args)
      break
    case 'migrate':
      cmdMigrate()
      break
    case 'logs':
      cmdLogs(args)
      break
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      cmdHelp()
      break
    default:
      err(`Unknown command: ${command}`)
      cmdHelp()
      process.exit(1)
  }
}

main().catch((e) => { err(String(e)); process.exit(1) })
