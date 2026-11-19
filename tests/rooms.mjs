import assert from 'node:assert/strict'
import {once} from 'node:events'
import {WebSocket} from 'ws'
import {createRoomServer} from '../server/rooms.js'
import {ROOM_PATH,ROOM_CODE,packPlayer,packVehicle} from '../src/room-protocol.js'
import {vehicles} from '../src/vehicles.js'

const {server,close}=createRoomServer({origins:['http://localhost:5173'],graceMs:1200})
server.listen(0,'127.0.0.1')
await once(server,'listening')
const url='ws://127.0.0.1:'+server.address().port+ROOM_PATH
const connections=[]
async function connect(origin='http://localhost:5173'){
 const ws=new WebSocket(url,{origin}),buffer=[]
 connections.push(ws)
 ws.on('message',data=>buffer.push(JSON.parse(data)))
 await once(ws,'open')
 return {ws, send:message=>ws.send(JSON.stringify(message)),async read(type,when=()=>true){
  const end=Date.now()+1700
  while(Date.now()<end){
   const i=buffer.findIndex(m=>m.t===type&&when(m))
   if(i>=0)return buffer.splice(i,1)[0]
   await new Promise(resolve=>setTimeout(resolve,10))
  }
  assert.fail('Missing '+type)
 }}
}
const p=(x,z)=>packPlayer({x,z,y:.05,face:0,speed:1.4,jump:null,land:0,visible:true,crouch:0,reach:0,side:0})
const pose=(v,extra={})=>packVehicle({...v,speed:0,steer:0,accel:0,braking:false,door:0,...extra})
const car=(snapshot,id)=>snapshot.cars.find(entry=>entry[0]===id)

try{
 await assert.rejects(connect('https://invalid.example'),/403/)
 const a=await connect(),b=await connect()
 a.send({t:'create'})
 const host=await a.read('welcome')
 assert.match(host.code,ROOM_CODE)
 b.send({t:'join',code:host.code})
 const guest=await b.read('welcome')
 assert.notEqual(host.token,guest.token)
 assert.equal(guest.state.host,host.id)
 assert.equal(guest.state.players.length,2)
 a.send({t:'move',p:p(0,22)})
 await b.read('snapshot',s=>s.players.some(([id,,,state])=>id===host.id&&state[1]===22))
 a.send({t:'move',p:p(-600,22)})
 await b.read('snapshot',s=>s.players.some(([id,,,state])=>id===host.id&&state[0]===0))
 const c=await connect(),d=await connect(),e=await connect()
 c.send({t:'join',code:host.code});await c.read('welcome')
 d.send({t:'join',code:host.code});await d.read('welcome')
 e.send({t:'join',code:host.code});assert.equal((await e.read('error')).code,'room_full')

 const tour=vehicles.touring
 a.send({t:'move',p:p(3.47,12)});b.send({t:'move',p:p(3.47,12)})
 a.send({t:'seat',car:'touring',side:-1})
 assert.equal((await a.read('seat')).ok,true)
 b.send({t:'seat',car:'touring',side:-1})
 assert.equal((await b.read('seat')).ok,false)
 b.send({t:'move',p:p(3.47,12),v:pose(tour,{z:11.5,speed:2})})
 await b.read('snapshot',s=>car(s,'touring')[1]===host.id&&car(s,'touring')[2][1]===12)
 a.send({t:'move',p:p(3.47,12),v:pose(tour,{door:-.7})})
 await b.read('snapshot',s=>car(s,'touring')[2][7]===-.7)
 a.send({t:'move',p:p(tour.x,11.78),v:pose(tour,{z:11.78,speed:2})})
 await b.read('snapshot',s=>car(s,'touring')[2][1]===11.78)
 a.send({t:'move',p:p(tour.x,22),v:pose(tour,{z:42,speed:4})})
 assert.equal((await a.read('correction')).pose[1],11.78)
 a.ws.terminate()
 const abandoned=await b.read('snapshot',s=>s.host===guest.id&&car(s,'touring')[1]===null)
 assert.deepEqual(car(abandoned,'touring')[2].slice(3),[0,0,0,false,0])
 const again=await connect()
 again.send({t:'resume',code:host.code,token:host.token})
 const resumed=await again.read('welcome')
 assert.equal(resumed.id,host.id)
 assert.notEqual(resumed.pose[0],tour.x)
 assert.equal(resumed.state.host,guest.id)
 b.send({t:'seat',car:'touring',side:-1})
 assert.equal((await b.read('seat')).ok,true)
 b.send({t:'release',p:p(3.35,11.78)})
 await again.read('snapshot',s=>car(s,'touring')[1]===null)
 again.send({t:'leave'});await b.read('snapshot',s=>s.players.length===3)
 const tooBig=await connect()
 const closed=once(tooBig.ws,'close');tooBig.ws.send('x'.repeat(1025))
 assert.equal((await closed)[0],1009)
 const spam=await connect()
 const rateClose=once(spam.ws,'close')
 for(let i=0;i<60;i++)spam.send({t:'ignored'})
 assert.equal((await rateClose)[0],1008)
 console.log('Passed four-client room capacity, movement broadcast, origin/size/rate checks, seat exclusivity, vehicle correction, disconnect, host transfer, resume and leave.')
}finally{
 for(const ws of connections)ws.terminate()
 await close()
}
