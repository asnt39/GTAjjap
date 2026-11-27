import {residentRounds,walkingGraph} from './resident-routes.js'

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
const socialPlaces=[
 {x:-49.2,z:54.7,radius:3.0},{x:15.8,z:197.8,radius:3.2},
 {x:54.4,z:157.8,radius:3.1},{x:58.5,z:184,radius:3.4}
]
const quiet=n=>!n.f.action&&!n.alert&&n.f.hp>0&&!n.policeOrder&&!['talk','look','guard','flee','watch','react'].includes(n.state)
export function residentLife(residents,staticLink,liveLink){
 const {points,path}=walkingGraph(staticLink)
 const routines=new Map(residents.filter(n=>residentRounds[n.id]).map(n=>[n,{
  next:0,route:[],stop:null,wait:0,retry:0,stall:0,pause:n.wait,socialAfter:0
 }]))
 const reservations=new Map(), greeted=new Map(), lastPair=new Map()
 let time=0,socialScan=0
 function endGreeting(n){
  const chat=greeted.get(n)
  if(!chat)return
  greeted.delete(chat.a);greeted.delete(chat.b)
 }
 function reserve(n,state){
  const stops=residentRounds[n.id]
  for(let i=0;i<stops.length;i++){
   const [id,dwell,activity]=stops[state.next]
   state.next=(state.next+1)%stops.length
   if(reservations.has(id))continue
   reservations.set(id,n)
   state.stop={id,dwell,activity}
   return
  }
 }
 function abandon(state){
  if(state.stop)reservations.delete(state.stop.id)
  state.stop=null;state.route=[];state.stall=0;state.wait=0
 }
 function join(pos,goal){
  const anchors=Object.keys(points).filter(id=>dist(pos,points[id])<14&&staticLink(pos,points[id]))
   .sort((a,b)=>dist(pos,points[a])-dist(pos,points[b]))
  for(const anchor of anchors){
   const route=path(anchor,goal)
   if(route.length)return route
  }
  return []
 }
 return {
  has:n=>routines.has(n),
  cancelGreeting:endGreeting,
  social(dt,player,isBlocked){
   time+=dt;socialScan-=dt
   for(const [n,chat] of greeted){
    if(time>=chat.end||!quiet(n)||dist(n.pos,player)<2.22||isBlocked(n))endGreeting(n)
   }
   if(socialScan>0)return
   socialScan=.28
   const eligible=[...routines.keys()].filter(n=>quiet(n)&&!greeted.has(n)&&routines.get(n).socialAfter<=time&&dist(n.pos,player)<23&&dist(n.pos,player)>2.45&&!isBlocked(n))
   for(const [i,a] of eligible.entries()){
    const b=eligible.slice(i+1).find(b=>{
     const key=[a.id,b.id].sort().join('|')
     return time>=(lastPair.get(key)??0)&&dist(a.pos,b.pos)>.72&&dist(a.pos,b.pos)<1.92&&liveLink(a.pos,b.pos)
    })
    if(!b)continue
    const calm=a.state==='dwell'&&b.state==='dwell'
    const hasSpace=socialPlaces.some(p=>dist(a.pos,p)<p.radius&&dist(b.pos,p)<p.radius)&&
     !eligible.some(n=>n!==a&&n!==b&&(dist(n.pos,a.pos)<1.14||dist(n.pos,b.pos)<1.14))
    const kind=calm&&hasSpace?'chat':'greet'
    const chat={a,b,start:time,end:time+(kind==='chat'?5.1:1.9),kind}
    lastPair.set([a.id,b.id].sort().join('|'),time+75)
    for(const n of [a,b]){
     greeted.set(n,chat);routines.get(n).socialAfter=time+26
    }
    break
   }
  },
  greeting(n){
   const chat=greeted.get(n)
   if(!chat)return null
   const partner=n===chat.a?chat.b:chat.a
   const phase=(time-chat.start)/(chat.end-chat.start)
   const start=n===chat.a?.17:.39
   const nod=chat.kind==='chat'
    ?.68*Math.pow(Math.max(0,Math.sin((phase+(n===chat.a?.10:.34))*Math.PI*5)),2)
    :Math.sin(Math.PI*Math.max(0,Math.min(1,(phase-start)/.30)))
   return {partner,nod,kind:chat.kind}
  },
  suspend(n){
   const state=routines.get(n)
   if(!state)return
   state.route=[];state.retry=0
   // A long interruption releases the reserved spot for other residents.
   if(n.alert>0||n.f.action||state.wait>0)abandon(state)
  },
  next(n,dt){
   const state=routines.get(n)
   state.pause=Math.max(0,state.pause-dt)
   if(state.pause>0)return null
   state.retry=Math.max(0,state.retry-dt)
   if(!state.stop){
    if(state.retry>0)return null
    reserve(n,state)
    if(!state.stop){state.retry=2;return null}
   }
   const stop=state.stop, point=points[stop.id]
   if(dist(n.pos,point)<.47||state.wait>0){
    state.wait+=dt
    if(state.wait>=stop.dwell){abandon(state);return null}
    return {activity:stop.activity,look:point.look}
   }
   if(!state.route.length){
    if(state.retry>0)return null
    state.route=join(n.pos,stop.id)
    if(!state.route.length){abandon(state);state.retry=2;return null}
   }
   while(state.route.length>1&&dist(n.pos,state.route[0])<.37)state.route.shift()
   // A road vehicle can temporarily take a crossing out of service. Stay on the
   // approach and retry; after a bounded wait, pick another round.
   const change=state.previous?dist(n.pos,state.previous):0
   state.previous={x:n.pos.x,z:n.pos.z}
   state.stall=change>dt*.10?0:state.stall+dt
   if(state.stall>12){abandon(state);state.retry=1.8;return null}
   return {target:state.route[0],activity:'travel'}
  }
 }
}
