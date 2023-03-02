import dotenv from 'dotenv-safe'

import { listenServer } from '../src/server/server'

dotenv.config()

/**
 * Demo CLI for testing basic functionality.
 *
 * ```
 * npx tsx index-v2.ts
 * ```
 */
async function main() {
  const port = process.env.SERVER_PORT
  await listenServer(Number(port))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
