import dotenv from 'dotenv-safe'
import fs from 'fs'
import http from 'http'
import { oraPromise } from 'ora'
import { ChatGPTAPI } from 'src/chatgpt-api'

dotenv.config()

const apiMap = new Map<string, ChatGPTAPI>()
let serverPort = 8088
let maxModelTokens = 4000
let maxResponseTokens = 1000

async function main() {
  if (!fs.existsSync('./log')) {
    fs.mkdirSync('./log')
  }
  if (process.env.SERVER_PORT) {
    serverPort = Number(process.env.SERVER_PORT)
  }
  if (process.env.MAX_MODEL_TOKENS) {
    maxModelTokens = Number(process.env.MAX_MODEL_TOKENS)
  }
  if (process.env.MAX_RESPOONSE_TOKENS) {
    maxResponseTokens = Number(process.env.MAX_RESPOONSE_TOKENS)
  }

  await initServer(serverPort)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function initServer(port: number) {
  const server = http.createServer((req, rsp) => {
    const array = []
    req.on('data', (chunk) => {
      array.push(chunk)
    })
    req.on('end', async () => {
      if (req.method !== 'POST') {
        rsp.end(JSON.stringify({ code: -1, message: 'support post only' }))
        return
      }
      let params = Buffer.concat(array).toString()
      try {
        if (typeof params === 'string') {
          params = JSON.parse(params)
        }
      } catch (e) {
        rsp.end(JSON.stringify({ code: -1, message: 'params parse error' }))
        return
      }

      let res = { code: -1, message: req.url }

      switch (req.url) {
        case '/ask':
          res = await ask(params)
          break
      }

      rsp.end(JSON.stringify(res))
    })
  })
  server.listen(port, () => {
    println('chatgpt server is start on ' + port)
  })
}

async function ask(params) {
  let message = params.message
  let messageId = params.messageId
  let apikey = params.apikey
  let response
  try {
    let context = {}
    if (messageId.length > 0) {
      context = {
        parentMessageId: messageId
      }
    }
    if (!apiMap.has(apikey)) {
      const api = new ChatGPTAPI({
        apiKey: apikey,
        debug: false,
        maxModelTokens: maxModelTokens,
        maxResponseTokens: maxResponseTokens
      })
      apiMap.set(apikey, api)
    }
    let api = apiMap.get(apikey)

    let rsp = await oraPromise(api.sendMessage(message, context), {
      text: message
    })

    response = rsp.detail
    response['message_id'] = rsp.id
  } catch (e) {
    println('request ask err: ' + JSON.stringify(e))
    response = e.statusError
  }
  return response
}

function println(text: string) {
  const filePath = './log/' + new Date().toISOString().split('T')[0] + '.txt'
  const options = { flag: 'a' }

  fs.writeFile(filePath, text + '\n', options, (err) => {
    if (err) throw err
    console.log(text)
  })
}
