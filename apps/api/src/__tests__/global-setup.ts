import { config } from 'dotenv'
import path from 'path'

export default function globalSetup() {
  // Load .env from repo root — dotenv properly strips surrounding quotes from values
  config({ path: path.resolve(process.cwd(), '../../.env'), override: true })
}
