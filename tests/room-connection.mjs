import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createServer} from 'node:http'
import {setTimeout as delay} from 'node:timers/promises'
import {WebSocket} from 'ws'
import {createRoomServer} from '../server/rooms.js'
import {ROOM_PATH,packPlayer} from '../src/room-protocol.js'

const origin='https://harborline-docklands.asnt1.chatgpt.site'
globalThis.location=new URL(origin)
globalThis.WebSocket=class extends WebSocket {
 constructor(endpoint){
  super(endpoint,{origin})
  this.on('error',()=>{})
 }
 addEventListener(type,listener,options){
  if(type!=='message')return super.addEventListener(type,listener,options)
  return super.addEventListener(type,event=>setTimeout(()=>listener(event),120),options)
 }
}
const {createRoomClient,roomEndpoint}=await import('../src/room-client.js')
assert.throws(()=>roomEndpoint('ws://localhost:8787'))
assert.equal(roomEndpoint('wss://example.com'), 'wss://example.com'+ROOM_PATH)

async function waitFor(check,message){
 const deadline=performance.now()+7000
 while(!check()){
  if(performance.now()>deadline)assert.fail(message)
  await delay(25)
 }
}
function client(){
 const joins=[]
 const room=createRoomClient({
  change(){},join(pose,resumed){joins.push({pose,resumed})},
  leave(){},suspend(){}
 })
 return {room,joins}
}
const a=client(),b=client()
const sleeping=createServer((req,res)=>res.writeHead(503).end())
sleeping.listen(0,'127.0.0.1')
await once(sleeping,'listening')
const {port}=sleeping.address()
const url='ws://127.0.0.1:'+port+ROOM_PATH
// The network is local; simulate the browser's HTTP preview origin for WS.
globalThis.location=new URL('http://localhost')
let service
async function startServer(){
 service=createRoomServer({origins:[origin]})
 service.server.listen(port,'127.0.0.1')
 await once(service.server,'listening')
 assert.equal(await (await fetch('http://127.0.0.1:'+port+'/healthz')).text(),'ok\n')
}
try{
 a.room.start(url,{t:'create'})
 await waitFor(()=>a.room.message.includes('다시 연결'),'wake-up retry')
 await new Promise(resolve=>sleeping.close(resolve))
 await startServer()
 await waitFor(()=>a.room.phase==='connected','create after wake')
 const {id,code}=a.room.session
 b.room.start(url,{t:'join',code})
 await waitFor(()=>b.room.phase==='connected','second client joining')
 const packet=packPlayer({x:0,z:22,y:.8,face:1.2,speed:5,jump:.4,land:0,visible:true,crouch:0,reach:0,side:0})
 a.room.tick(performance.now(),()=>({p:packet}))
 await waitFor(()=>b.room.sample(performance.now())?.latest.players.get(id)?.pose.jump===.4,'delayed jump snapshot')
 assert.equal(b.room.sample(performance.now()).latest.players.get(id).pose.face,1.2)
 a.room.interrupt()
 await waitFor(()=>b.room.host===b.room.session.id,'host transfer')
 await waitFor(()=>a.joins.at(-1)?.resumed,'resume after connection loss')
 assert.equal(a.room.session.id,id)

 await service.close()
 await waitFor(()=>a.room.phase==='reconnecting'&&b.room.phase==='reconnecting','server stops')
 await startServer()
 await waitFor(()=>a.room.phase==='offline'&&b.room.phase==='offline','return offline after restart')
 assert.match(a.room.message,/서버가 재시작/)
 b.room.start(url,{t:'join',code})
 await waitFor(()=>b.room.phase==='offline','old code rejected')
 assert.match(b.room.message,/방을 찾을 수 없어/)
 a.room.start(url,{t:'create'})
 await waitFor(()=>a.room.phase==='connected','create after restart')
 const finalCode=a.room.session.code
 a.room.leave()
 b.room.start(url,{t:'join',code:finalCode})
 await waitFor(()=>b.room.phase==='offline','empty room rejected')
 assert.match(b.room.message,/방을 찾을 수 없어/)
 console.log('Passed cold-start retry, 120ms delayed jump/rotation, host transfer, resume, restart and room closing.')
}finally{
 a.room.leave();b.room.leave()
 await service?.close()
 if(sleeping.listening)await new Promise(resolve=>sleeping.close(resolve))
}
