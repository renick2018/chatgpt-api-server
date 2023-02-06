import dotenv from 'dotenv-safe'

import { ChatGPTAPI } from '../src'
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
    const api = new ChatGPTAPI({ apiKey: process.env.OPENAI_API_KEY })
    await listenServer(api)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})