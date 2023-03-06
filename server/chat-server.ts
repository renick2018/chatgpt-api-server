import http from 'http'
import { oraPromise } from 'ora'

import { ChatGPTAPIBrowser, SendMessageOptions } from '../src'

const routerMap = new Map()
let Api: ChatGPTAPIBrowser

export async function listenServer(port: number, api: ChatGPTAPIBrowser) {
  Api = api
  if (!(await Api.getIsAuthenticated())) {
    log('api is not auth')
    return
  }
  initRouter()
  const server = http.createServer((req, rsp) => {
    const array = []
    let params = {}
    req.on('data', (chunk) => {
      array.push(chunk)
    })
    req.on('end', async () => {
      log(req.method, req.url, req.read())
      if (req.method === 'POST') {
        params = Buffer.concat(array).toString()
        try {
          req.params = JSON.parse(params)
        } catch (e) {
          log('parse post params error: ' + e)
        }
      }
      let res
      try {
        res = JSON.stringify(await router(req))
      } catch (e) {
        res = 'request err'
        log('err: ' + e)
      }
      rsp.end(res)
    })
  })
  server.listen(port, () => {
    log('chatgpt server is start on ', port)
  })
}

function initRouter() {
  routerMap.set('/refresh_auth', refreshGptSession)
  routerMap.set('/ask', ask)
  routerMap.set('/status', status)
}

async function router(req) {
  const path = req.url
  if (routerMap.has(path)) {
    return await routerMap.get(path)(req)
  }
  for (let [k, v] of routerMap) {
    if (path.startsWith(k)) {
      return await v(req)
    }
  }
  return baseHandler(req)
}

async function baseHandler(req) {
  return {
    path: req.url,
    message: 'not find request page, try ask me something'
  }
}

async function refreshGptSession(req) {
  await Api.refreshSession()
  return {
    code: 0,
    message: 'refresh gpt session over',
    status: ''
  }
}

async function status(req) {
  let auth = await Api.getIsAuthenticated()
  return {
    code: 0,
    message: 'refresh gpt session over',
    status: auth
  }
}

async function ask(req, retry = false) {
  let message = 'invalid session'
  let rsp
  try {
    let options: SendMessageOptions = {}
    if (req.params.conversationId.length > 0) {
      options = {
        conversationId: req.params.conversationId,
        parentMessageId: req.params.messageId
      }
    }
    options.timeoutMs = 5 * 60 * 1000
    rsp = await oraPromise(Api.sendMessage(req.params.message, options), {
      text: req.params.message
    })
    message = ''
    rsp.text = rsp.response
    rsp.id = rsp.messageId
    rsp.parentMessageId = rsp.messageId
    log('req: ', req.params)
    log('rsp: ', rsp)
    log('******************************')
    log('******************************\n')
  } catch (e) {
    log('request ask err: ' + e)
    message = e
    if (!retry) {
      // await Api.refreshSession()
      return ask(req, true)
    }
  }
  return {
    code: 0,
    message: message,
    response: rsp
  }
}

function log(str, ...optionalParams: any[]) {
  console.log(new Date().toLocaleString() + ': ' + str, ...optionalParams)
}
