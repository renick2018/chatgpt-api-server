import dotenv from 'dotenv-safe'

import { ChatGPTAPIBrowser } from '../src'

import { listenServer } from '../server/chat-server'
dotenv.config()

/**
 * Demo CLI for testing basic functionality.
 *
 * ```
 * npx tsx demos/demo-web-server.ts
 * ```
 */
async function main() {
    const email = process.env.OPENAI_EMAIL
    const password = process.env.OPENAI_PASSWORD
    const port = process.env.SERVER_PORT

    const api = new ChatGPTAPIBrowser({
        email,
        password,
        debug: false,
        minimize: true,
    })
    await api.initSession()

    await listenServer(Number(port), api)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})