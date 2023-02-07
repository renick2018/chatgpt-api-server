import http from "http";
import {Md5} from 'ts-md5';
import {ChatGPTAPI} from "../src";
import {oraPromise} from "ora";

const routerMap = new Map()
let Api: ChatGPTAPI
let lastResponseTimestamp = new Date().getTime()

export async function listenServer(api: ChatGPTAPI) {
    Api = api
    initRouter()
    const server = http.createServer((req, rsp) => {
        const array = []
        let params = {}
        req.on('data',(chunk)=>{
            array.push(chunk)
        })
        req.on('end',async ()=>{
            log(req.method, req.url, req.read())
            if (req.method === "POST") {
                params = Buffer.concat(array).toString()
                try {
                    req.params = JSON.parse(params)
                }catch (e) {
                    log('parse post params error: ' + e)
                }
            }
            let res
            try {
                res = JSON.stringify(await router(req))
            }catch (e){
                res = "request err"
                log('err: '+ e)
            }
            rsp.end(res)
        })
    })
    server.listen(8088, () => {
        log('chatgpt server is start')
    })
}

function initRouter() {
    routerMap.set("/ask", ask)
    routerMap.set("/status", status)
}

async function router(req) {
    checkSign(req.params)
    const path = req.url
    if (routerMap.has(path)){
        return await routerMap.get(path)(req)
    }
    for(let [k, v] of routerMap) {
        if (path.startsWith(k)){
            return await v(req)
        }
    }
    return baseHandler(req)
}

function checkSign(params) {
    let sign = params['sign']
    params['sign'] = process.env.SERVER_API_KEY + Math.floor(new Date().getTime() / 300000)
    return sign === Md5.hashStr(JSON.stringify(params))
}

async function baseHandler(req) {
    return {
        'path': req.url,
        'message': 'not find request page, try ask me something'
    }
}

async function status(req) {
    return {
        'code': 0,
        'message': 'refresh gpt session over',
        'status': ''
    }
}

async function ask(req, retry=false) {
    let message = "invalid session"
    let rsp
    try {
        log('req: ', req.params)
        if (req.params.conversationId.length === 0) {
            rsp = await oraPromise(
                Api.sendMessage(req.params.message),
                {
                    text: req.params.message
                }
            )
        }else {
            rsp = await oraPromise(
                Api.sendMessage(req.params.message, {
                    conversationId: req.params.conversationId,
                    parentMessageId: req.params.messageId
                }),
                {
                    text: req.params.message
                }
            )
        }


        message = ""
        rsp.response = rsp.text
        rsp.messageId = rsp.id
        log('rsp: ', JSON.stringify(rsp))
        log('******************************')
        lastResponseTimestamp = new Date().getTime()
        log('******************************\n')
    }catch (e){
        log('request ask err: ' + e)
        message = e
        if (!retry) {
            // await Api.refreshSession()
            return ask(req, true)
        }
    }
    return {
        'code': 0,
        'message': message,
        'response': rsp
    }
}

function log(str, ...optionalParams: any[]) {
    console.log(new Date().toLocaleString() + ": " + str, ...optionalParams)
}