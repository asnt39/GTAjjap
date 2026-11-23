import {Vector3} from 'three'

export function fighter(maxHealth){
 return {maxHealth,hp:maxHealth,armor:0,action:'',elapsed:0,duration:0,recovery:0,immune:0,responseWindow:0,side:1,zone:'body',
  previousHand:new Vector3(),handReady:false,connected:false,queued:false,downTime:0}
}
export function swing(f,side=-f.side,{bufferHit=false}={}){
 if(bufferHit&&f.action==='hit'&&f.duration-f.elapsed<=.18){f.queued=true;return false}
 if(f.action==='punch'&&f.elapsed>f.duration*.52){f.queued=true;return false}
 if(f.action||f.recovery>0||f.hp<=0)return false
 Object.assign(f,{action:'punch',side,elapsed:0,duration:side===1?.54:.48,connected:false,handReady:false})
 return true
}
export function injure(f,amount,side,zone,{responseWindow=0,weaponHit=false}={}){
 if(f.hp===0||(!weaponHit&&(f.action==='hit'||f.immune>0)))return false
 const absorbed=Math.min(f.armor??0,amount)
 if(absorbed)f.armor-=absorbed
 f.hp=Math.max(0,f.hp-amount+absorbed)
 Object.assign(f,{action:f.hp?'hit':'down',side,zone,elapsed:0,duration:f.hp?.45:.79,immune:.48,responseWindow,recovery:0,
  queued:false,handReady:false,connected:false,downTime:0})
 return true
}
export function advance(f,dt){
 f.immune=Math.max(0,f.immune-dt);f.recovery=Math.max(0,f.recovery-dt)
 if(!f.action){if(f.queued&&!f.recovery){f.queued=false;swing(f)}return}
 f.elapsed+=dt
 if(f.action==='down'){f.downTime+=dt;return}
 if(f.elapsed>=f.duration){
  if(f.action==='hit')f.immune=Math.max(f.immune,f.responseWindow)
  f.recovery=f.action==='punch'?.135:0
  f.action='';f.elapsed=0
 }
}
export function revive(f){
 const health=f.maxHealth
 Object.assign(f,fighter(health));f.immune=2
}
export function combatPose(f,guard=false){
 return {action:f.action||(guard?'guard':''),phase:guard&&!f.action?1:f.duration?Math.min(1,f.elapsed/f.duration):0,side:f.side,zone:f.zone}
}
const hand=new Vector3(),point=new Vector3()
// Sweep the rendered hand across the victim's vertical capsule during the contact window.
export function contact(f,rig,source,victims,unobstructed,onHit){
 if(f.action!=='punch'||f.connected)return
 rig.handPosition(f.side,hand)
 const phase=f.elapsed/f.duration
 if(phase>=.28&&phase<=.74){
  for(const victim of victims){
   const p=victim.pos
   if(victim.f.hp<=0||Math.hypot(p.x-source.x,p.z-source.z)>1.48||!unobstructed(source,p))continue
   const height=victim.height||1.8,ground=p.y||0
   for(let i=0;i<=3;i++){
    point.copy(f.handReady?f.previousHand:hand).lerp(hand,i/3)
    const centerY=Math.max(ground+.50,Math.min(ground+height*.91,point.y))
    if(Math.hypot(point.x-p.x,point.z-p.z,point.y-centerY)>.37)continue
    f.connected=true;onHit(victim,point.y>ground+height*.79?'upper':'body',point);break
   }
   if(f.connected)break
  }
 }
 f.previousHand.copy(hand);f.handReady=true
}
