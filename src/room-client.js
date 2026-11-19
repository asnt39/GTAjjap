import {ROOM_PATH,TICK_MS,wrapAngle,unpackPlayer,unpackVehicle} from './room-protocol.js'

const errors={
 invalid_code:'12자리 방 코드를 확인해',room_missing:'이 코드의 방을 찾을 수 없어',
 room_full:'방이 가득 찼어 (최대 4명)',server_full:'서버가 혼잡해. 잠시 후 다시 시도해',
 expired:'재접속 시간이 지났어',try_again:'잠시 후 다시 시도해'
}
export const defaultRoomEndpoint=import.meta.env?.VITE_HARBORLINE_WS||
 (location.protocol==='http:'?'ws://'+location.hostname+':8787'+ROOM_PATH:'')

export function roomEndpoint(raw){
 const url=new URL(raw.trim())
 if(!['ws:','wss:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||
  (location.protocol==='https:'&&url.protocol!=='wss:'))throw new Error('이 페이지에서 사용할 수 있는 WebSocket 주소를 입력해')
 if(url.pathname==='/')url.pathname=ROOM_PATH
 return url.href
}

export function createRoomClient(events){
 let socket=null,attempt=null,session=null,phase='offline',timer=null,retry=null
 let lastSend=-Infinity,lastPacket=0,host=null,roster=[],message='',history=[]
 const update=(next,label='')=>{phase=next;message=label;events.change()}
 const send=msg=>{
  if(socket?.readyState!==WebSocket.OPEN||socket.bufferedAmount>8192)return false
  socket.send(JSON.stringify(msg));return true
 }
 const stopTimers=()=>{clearTimeout(timer);clearTimeout(retry);timer=retry=null}
 function clearFrames(){history=[];roster=[];host=null}
 function finish(label=''){
  stopTimers()
  const prior=socket,wasOnline=!!session
  socket=attempt=session=null
  clearFrames()
  if(prior&&prior.readyState<WebSocket.CLOSING)prior.close()
  if(wasOnline)events.leave()
  update('offline',label)
 }
 function acceptSnapshot(msg){
  const now=performance.now()
  host=msg.host
  const next=msg.players.map(([id,number,car,pose])=>({id,number,car,pose:unpackPlayer(pose)}))
  const changed=next.length!==roster.length||next.some((p,i)=>p.id!==roster[i].id)
  roster=next
  history.push({time:now,players:new Map(next.map(p=>[p.id,p])),
   cars:new Map(msg.cars.map(([id,owner,pose])=>[id,{owner,...unpackVehicle(pose)}]))})
  if(history.length>8)history.shift()
  return changed
 }
 function connect(){
  let ws
  try{ws=new WebSocket(attempt.endpoint)}catch{finish('서버 주소를 열 수 없어');return}
  socket=ws
  timer=setTimeout(()=>lost(ws),3300)
  ws.addEventListener('open',()=>{if(socket===ws)send(attempt.request)})
  ws.addEventListener('message',({data})=>{
   if(socket!==ws)return
   let msg
   try{msg=JSON.parse(data)}catch{return}
   if(!msg)return
   lastPacket=performance.now()
   if(msg.t==='welcome'){
    clearTimeout(timer);timer=null
    const resumed=!!session
    session={id:msg.id,code:msg.code,token:msg.token,endpoint:attempt.endpoint}
    lastSend=-Infinity
    acceptSnapshot(msg.state)
    events.join(unpackPlayer(msg.pose),resumed)
    update('connected',resumed?'방에 다시 연결됐어':'')
   }else if(msg.t==='error'){
    const label=errors[msg.code]??'서버 연결 오류'
    if(session&&msg.code==='try_again')lost(ws)
    else finish(label)
   }else if(phase==='connected'&&msg.t==='snapshot'){
    const previous=host,changed=acceptSnapshot(msg)
    if(changed||host!==previous)events.change()
   }else if(phase==='connected'&&msg.t==='seat'){
    events.seat(msg.car,msg.ok?unpackVehicle(msg.pose):null)
   }else if(phase==='connected'&&msg.t==='correction'){
    events.correction(msg.car,unpackVehicle(msg.pose))
   }
  })
  ws.addEventListener('close',()=>lost(ws))
 }
 function lost(ws){
  if(!ws||socket!==ws)return
  socket=null;clearTimeout(timer);timer=null
  if(ws.readyState<WebSocket.CLOSING)ws.close()
  if(!session){finish('서버에 연결할 수 없어. 주소와 서버 상태를 확인해');return}
  if(phase!=='reconnecting'){
   clearFrames()
   attempt={endpoint:session.endpoint,request:{t:'resume',code:session.code,token:session.token},deadline:performance.now()+23000}
   events.suspend()
   update('reconnecting','연결이 끊겼어. 다시 연결하는 중…')
  }
  if(performance.now()+1600>=attempt.deadline){finish('재접속에 실패했어');return}
  retry=setTimeout(connect,1000)
 }
 function start(endpoint,request){
  if(phase!=='offline')return
  try{attempt={endpoint:roomEndpoint(endpoint),request}}catch{update('offline','유효한 ws:// 또는 wss:// 서버 주소를 입력해');return}
  update('connecting','서버에 연결하는 중…');connect()
 }
 function leave(){
  if(phase==='connected')send({t:'leave'})
  finish()
 }
 function tick(now,move){
  if(phase!=='connected')return
  if(now-lastPacket>4800){lost(socket);return}
  if(now-lastSend<TICK_MS)return
  if(send({t:'move',...move()}))lastSend=now
 }
 function sample(now){
  const latest=history.at(-1)
  if(!latest)return null
  const target=now-TICK_MS*2
  let index=history.findIndex(frame=>frame.time>=target)
  if(index<0)index=history.length-1
  const b=history[index],a=history[Math.max(0,index-1)]
  const fraction=a===b?1:Math.max(0,Math.min(1,(target-a.time)/(b.time-a.time)))
  return {latest,a,b,fraction}
 }
 return {start,leave,tick,sample,send,interrupt:()=>lost(socket),get phase(){return phase},get message(){return message},
  get session(){return session},get roster(){return roster},get host(){return host}}
}

const lerp=(a,b,t)=>a+(b-a)*t
export function blendPose(a,b,t,angle,fields){
 if(!a||Math.hypot(a.x-b.x,a.z-b.z)>5)return b
 const pose={...b}
 for(const field of fields)pose[field]=lerp(a[field],b[field],t)
 pose[angle]=a[angle]+wrapAngle(b[angle]-a[angle])*t
 return pose
}
