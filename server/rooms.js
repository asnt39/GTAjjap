import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {WebSocketServer, WebSocket} from 'ws'
import {vehicles} from '../src/vehicles.js'
import {spawn,inDistrict} from '../src/navigation.js'
import {clearPose,doorPoint,overlapsCar} from '../src/driving.js'
import {MAX_PLAYERS,TICK_MS,MESSAGE_BYTES,ROOM_PATH,ROOM_CODE,packPlayer,packVehicle,unpackPlayer,unpackVehicle,wrapAngle} from '../src/room-protocol.js'

const newToken=bytes=>randomBytes(bytes).toString('hex')
const freshPlayer=(x=spawn.x,z=spawn.z)=>({x,z,y:0,face:Math.PI,speed:0,jump:null,land:0,visible:true,crouch:0,reach:0,side:0})
const between=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max
const isSide=value=>value===1||value===-1
const isOriginAllowed=(origin,allowed)=>{
 if(allowed.length)return allowed.includes(origin)
 try{return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(new URL(origin).origin)}catch{return false}
}

export function createRoomServer({origins=[],graceMs=25000}={}){
 const rooms=new Map(),clients=new Map(),sources=new Map()
 const server=createServer((req,res)=>{res.writeHead(404).end()})
 const wss=new WebSocketServer({noServer:true,maxPayload:MESSAGE_BYTES,perMessageDeflate:false})
 let serial=0
 const send=(ws,payload)=>{
  if(ws.readyState!==WebSocket.OPEN)return
  if(ws.bufferedAmount>32768){ws.terminate();return}
  ws.send(JSON.stringify(payload))
 }
 const error=(ws,code)=>send(ws,{t:'error',code})
 const active=room=>[...room.players.values()].filter(p=>p.ws)
 function removeSeat(room,player,placeOutside){
  if(!player.car)return
  const car=room.cars[player.car]
  car.owner=null;car.speed=car.accel=car.steer=car.door=0;car.braking=false
  if(placeOutside){
   const candidates=[doorPoint(car,player.side,.68),doorPoint(car,-player.side,.68)]
   const door=candidates.find(p=>inDistrict(p.x,p.z,.32))??spawn
   player.pose=freshPlayer(door.x,door.z)
  }else Object.assign(player.pose,{visible:true,crouch:0,reach:0,side:0})
  player.car=null
 }
 function depart(ws,keep){
  const state=clients.get(ws)
  if(!state?.room)return
  const {room,player}=state
  removeSeat(room,player,true)
  player.ws=null
  player.expires=Date.now()+graceMs
  state.room=state.player=null
  if(!keep)room.players.delete(player.token)
  if(room.host===player.id)room.host=active(room)[0]?.id??null
  if(!room.players.size)rooms.delete(room.code)
 }
 function snapshot(room){
  return {t:'snapshot',host:room.host,
   players:active(room).map(p=>[p.id,p.number,p.car,packPlayer(p.pose)]),
   cars:Object.entries(room.cars).map(([id,car])=>[id,car.owner,packVehicle(car)])}
 }
 function join(ws,state,msg,now){
  if(state.room||now-state.lastJoin<280)return error(ws,'try_again')
  state.lastJoin=now
  // Count unsuccessful attempts even if the client reconnects.
  const source=state.source
  if(now>=source.reset){source.reset=now+60000;source.attempts=0}
  if(++source.attempts>45)return error(ws,'try_again')
  let room
  if(msg.t==='create'){
   if(rooms.size>=256)return error(ws,'server_full')
   let code
   do{code=newToken(6).toUpperCase()}while(rooms.has(code))
   const cars=Object.fromEntries(Object.entries(vehicles).map(([id,setup])=>[id,{...setup,owner:null,speed:0,steer:0,accel:0,braking:false,door:0}]))
   room={code,host:null,players:new Map(),cars};rooms.set(code,room)
  }else{
   if(typeof msg.code!=='string'||!ROOM_CODE.test(msg.code))return error(ws,'invalid_code')
   room=rooms.get(msg.code)
   if(!room)return error(ws,msg.t==='resume'?'expired':'room_missing')
  }
  let player
  if(msg.t==='resume'){
   player=typeof msg.token==='string'?room.players.get(msg.token):null
   if(player?.ws)return error(ws,'try_again')
   if(!player||player.expires<=now)return error(ws,'expired')
  }else{
   if(room.players.size>=MAX_PLAYERS)return error(ws,'room_full')
   const number=[1,2,3,4].find(candidate=>![...room.players.values()].some(p=>p.number===candidate))
   player={id:++serial,number,token:newToken(24),car:null,pose:freshPlayer(),side:-1}
   room.players.set(player.token,player)
  }
  state.room=room;state.player=player
  player.ws=ws;room.host??=player.id
  send(ws,{t:'welcome',code:room.code,id:player.id,token:player.token,pose:packPlayer(player.pose),state:snapshot(room)})
 }
 function updatePlayer(player,room,data){
  if(!Array.isArray(data)||data.length!==11)return
  const p=unpackPlayer(data)
  if(!between(p.x,-36,26)||!between(p.z,-102,59)||!between(p.y,-.5,2)||!between(p.face,-Math.PI,Math.PI)||
   !between(p.speed,0,16)||(p.jump!==null&&!between(p.jump,0,1))||!between(p.land,0,1)||
   typeof p.visible!=='boolean'||!between(p.crouch,0,1)||!between(p.reach,0,1)||(p.side!==0&&!isSide(p.side)))return
  if(player.car){
   const car=room.cars[player.car]
   if(Math.hypot(p.x-car.x,p.z-car.z)>3)return
   if(isSide(p.side))player.side=p.side
  }else{
   p.visible=true;p.crouch=p.reach=p.side=0
  }
  player.pose=p
 }
 function updateVehicle(ws,player,room,data,now){
  const car=room.cars[player.car]
  if(!car||car.owner!==player.id||!Array.isArray(data)||data.length!==8)return
  const v=unpackVehicle(data)
  const elapsed=Math.min(1,Math.max(.02,(now-car.lastMove)/1000))
  const valid=between(v.x,-36,26)&&between(v.z,-102,59)&&between(v.heading,-Math.PI,Math.PI)&&
   between(v.speed,-car.reverse-.2,car.top+.2)&&between(v.steer,-.75,.75)&&between(v.accel,-15,15)&&
   typeof v.braking==='boolean'&&between(v.door,-1,1)
  if(!valid)return
  const next={...car,...v}
  if(Math.hypot(car.x-v.x,car.z-v.z)>car.top*elapsed+.55||
   Math.abs(wrapAngle(v.heading-car.heading))>2.7*elapsed+.19||
   (!clearPose(next,[])&&clearPose(car,[]))||
   Object.values(room.cars).some(other=>other!==car&&overlapsCar(next,other)&&!overlapsCar(car,other))){
   send(ws,{t:'correction',car:player.car,pose:packVehicle(car)});return
  }
  Object.assign(car,v,{lastMove:now})
 }
 function handle(ws,data,binary){
  const state=clients.get(ws),now=Date.now()
  state.budget=Math.min(45,state.budget+(now-state.rateAt)*.036);state.rateAt=now
  if(--state.budget<0||binary){ws.close(1008,'Invalid traffic');return}
  let msg
  try{msg=JSON.parse(data.toString())}catch{ws.close(1007,'Invalid JSON');return}
  if(!msg||typeof msg.t!=='string')return
  if(['create','join','resume'].includes(msg.t)){join(ws,state,msg,now);return}
  const {room,player}=state
  if(!room)return
  if(msg.t==='leave'){depart(ws,false);ws.close(1000);return}
  if(msg.t==='move'){
   if(msg.v)updateVehicle(ws,player,room,msg.v,now)
   updatePlayer(player,room,msg.p);return
  }
  if(msg.t==='seat'){
   const car=typeof msg.car==='string'&&Object.hasOwn(room.cars,msg.car)?room.cars[msg.car]:null
   if(player.car||!car||car.owner!==null||!isSide(msg.side)||
    Math.hypot(player.pose.x-doorPoint(car,msg.side).x,player.pose.z-doorPoint(car,msg.side).z)>1.85){
    send(ws,{t:'seat',car:msg.car,ok:false});return
   }
   car.owner=player.id;car.lastMove=now
   player.car=msg.car;player.side=msg.side
   send(ws,{t:'seat',car:msg.car,ok:true,pose:packVehicle(car)})
  }else if(msg.t==='release'){
   updatePlayer(player,room,msg.p)
   removeSeat(room,player,false)
  }
 }
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!==ROOM_PATH||!isOriginAllowed(req.headers.origin,origins)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
  const address=req.socket.remoteAddress,now=Date.now()
  const source=sources.get(address)??{count:0,attempts:0,reset:now+60000}
  if(source.count>=24||clients.size>=512){socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');return}
  wss.handleUpgrade(req,socket,head,ws=>{
   sources.set(address,source);source.count++
   clients.set(ws,{source,rateAt:now,budget:45,lastJoin:0,joinedAt:now,alive:true})
   ws.on('error',()=>{})
   ws.on('pong',()=>{const state=clients.get(ws);if(state)state.alive=true})
   ws.on('message',(data,binary)=>handle(ws,data,binary))
   ws.once('close',()=>{depart(ws,true);clients.delete(ws);source.count--})
  })
 })
 const tick=setInterval(()=>{
  const now=Date.now()
  for(const room of rooms.values()){
   for(const player of room.players.values())if(!player.ws&&player.expires<=now)room.players.delete(player.token)
   if(!room.players.size){rooms.delete(room.code);continue}
   const peers=active(room)
   if(peers.length){const state=snapshot(room);for(const p of peers)send(p.ws,state)}
  }
 },TICK_MS)
 const heartbeat=setInterval(()=>{
  const now=Date.now()
  for(const [ws,state] of clients){
   if(!state.alive||(!state.room&&now-state.joinedAt>10000)){ws.terminate();continue}
   state.alive=false;ws.ping()
  }
  for(const [address,source] of sources)if(!source.count&&source.reset<now)sources.delete(address)
 },5000)
 const close=()=>{
  clearInterval(tick);clearInterval(heartbeat)
  for(const ws of clients.keys())ws.terminate()
  wss.close()
  return new Promise(resolve=>server.close(resolve))
 }
 return {server,close}
}
