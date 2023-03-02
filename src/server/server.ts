import http from 'http'
import { oraPromise } from 'ora'

import { ChatGPTAPI } from '../chatgpt-api'

let nodeMap = new Map()

export async function listenServer(port: number) {
  const server = http.createServer((req, rsp) => {
    const array = []
    req.on('data', (chunk) => {
      array.push(chunk)
    })
    req.on('end', async () => {
      log('params parse: ', req.method)
      if (req.method === 'POST') {
        let params = Buffer.concat(array).toString()
        try {
          log('params:', params)
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
    log('chatgpt server is start on ', port)
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
        debug: false
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
  if (node === undefined || node.length === 0) {
    node = nodeMap.keys()[0]
  }
  let api = nodeMap.get(node)
  log('request node: ', req.node)
  let reply = {}
  try {
    log('request: ', req.params)
    let context = {}
    if (req.params.messageId.length > 0) {
      context = {
        parentMessageId: req.params.messageId
      }
    }

    reply = await oraPromise(api.sendMessage(req.params.message, context), {
      text: req.params.message
    })

    log('reply: ', JSON.stringify(reply))
    reply['response'] = reply['text']
    reply['messageId'] = reply['id']
    reply['conversationId'] = node
    log('******************************')
    log('******************************\n')
  } catch (e) {
    log('request ask err: ' + e)
    message = e.statusText
    code = e.statusCode
  }

  response(rsp, code, message, reply)
}

function log(str, ...optionalParams: any[]) {
  console.log(new Date().toLocaleString() + ': ' + str, ...optionalParams)
}
