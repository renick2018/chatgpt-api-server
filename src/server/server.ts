import fs from 'fs'
import http from 'http'
import { oraPromise } from 'ora'

import { ChatGPTAPI } from '../chatgpt-api'

let nodeMap = new Map<string, ChatGPTAPI>()
let maxModelTokens = 4000
let maxResponseTokens = 1000
let model = 'gpt-3.5-turbo'

export async function listenServer(port: number) {
  if (!fs.existsSync('./log')) {
    fs.mkdirSync('./log')
  }
  if (process.env.MAX_MODEL_TOKENS) {
    maxModelTokens = Number(process.env.MAX_MODEL_TOKENS)
  }
  if (process.env.MAX_RESPOONSE_TOKENS) {
    maxResponseTokens = Number(process.env.MAX_RESPOONSE_TOKENS)
  }
  if (process.env.CHAT_MODEL) {
    model = process.env.CHAT_MODEL
  }
  const server = http.createServer((req, rsp) => {
    const array = []
    req.on('data', (chunk) => {
      array.push(chunk)
    })
    req.on('end', async () => {
      log('params parse: ' + req.method)
      if (req.method === 'POST') {
        let params = Buffer.concat(array).toString()
        try {
          log('params:' + params)
          if (typeof params === 'string') {
            req.params = JSON.parse(params)
          }
        } catch (e) {
          log('parse post params error: ' + e)
        }
      }
      await router(req, rsp)
    })
  })
  server.listen(port, () => {
    log('chatgpt server is start on ' + port)
  })
}

async function router(req, rsp) {
  const path = req.url
  switch (path) {
    case '/ask':
      await ask(req, rsp)
      break
    case '/add_nodes':
      await addNodes(req, rsp)
      break
    default:
      response(rsp, 0, req.url, 'page not find')
  }
}

function response(rsp, code = 0, message = '', data = {}) {
  let res
  try {
    res = JSON.stringify({
      code: code,
      message: message,
      data: data
    })
  } catch (e) {
    res = 'request err: response data type error'
  }
  rsp.end(res)
}

async function addNodes(req, rsp) {
  let nodes = req.params.nodes
  let messages = new Map()
  for (let i in nodes) {
    let item = nodes[i]
    nodeMap.set(
      item.email,
      new ChatGPTAPI({
        apiKey: item.apiKey,
        debug: false,
        maxModelTokens: maxModelTokens,
        maxResponseTokens: maxResponseTokens,
        completionParams: {
          model: model
        }
      })
    )
    console.log('load api: ', item.email)
  }
  response(rsp, 0, '', messages)
}

async function ask(req, rsp) {
  let message = ''
  let code = 0
  let node = req.params.node
  if (node === undefined || node.length === 0 || !nodeMap.has(node)) {
    response(rsp, -1, 'not find node', {})
    return
  }
  let api = nodeMap.get(node)
  log('request node: ' + node)
  let reply = {}
  try {
    log('request: ' + JSON.stringify(req.params))
    // if (req.params.messageId.length > 0) {
    const currentDate = new Date().toISOString().split('T')[0]
    let context = {
      systemMessage: req.params.systemMessage
        ? req.params.systemMessage
        : `You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.\nKnowledge cutoff: 2021-09-01\nCurrent date: ${currentDate}`,
      parentMessageId: req.params.messageId,
      completionParams: {
        function_call: req.params.function_call,
        functions: req.params.functions
      }
    }

    reply = await oraPromise(api.sendMessage(req.params.message, context), {
      text: req.params.message
    })

    log('reply: ' + JSON.stringify(reply))
    reply['response'] = reply['text']
    reply['messageId'] = reply['id']
    reply['function_call'] = reply['function_call']
    let convId = req.params.conversationId
    if (convId.length === 0) {
      convId = reply['id']
    }
    reply['conversationId'] = convId
    log('******************************')
    log('******************************\n')
  } catch (e) {
    log('request ask err: ' + e)
    message = e.statusText
    code = e.statusCode
  }

  response(rsp, code, message, reply)
}

function log(text: string) {
  const filePath = './log/' + new Date().toISOString().split('T')[0] + '.txt'
  const options = { flag: 'a' }

  fs.writeFile(filePath, text + '\n', options, (err) => {
    if (err) throw err
    console.log(text)
  })
}
