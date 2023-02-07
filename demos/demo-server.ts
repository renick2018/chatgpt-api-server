import dotenv from 'dotenv-safe'

import { listenServer } from '../server/chat-server'

dotenv.config()

/**
 * Demo CLI for testing basic functionality.
 *
 * ```
 * npx tsx demos/demo.ts
 * ```
 */
async function main() {
    let data = JSON.parse(process.env.API_KEYS)
    for (let port in data) {
        await listenServer(Number(port), data[port])
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})