import * as T from 'three'
import {terracePoint,terraceRooms} from './terrace-plan.js'

const opening=1.8
const clamp=v=>Math.max(0,Math.min(1,v))
export function createTerraceDoors(scene,boxes,sound=()=>{}){
 const doors=terraceRooms.map(r=>({r,at:terracePoint(r,0,r.depth/2-.08),progress:0,target:0,
  direction:1,npcOpened:false,leaves:r.door==='pair'||r.door==='auto'?2:1}))
 const leaves=doors.reduce((n,d)=>n+d.leaves,0),unit=new T.BoxGeometry()
 const frames=new T.InstancedMesh(unit,new T.MeshStandardMaterial({color:0x495854,metalness:.34,roughness:.47}),leaves*6)
 const panes=new T.InstancedMesh(unit,new T.MeshStandardMaterial({color:0x9bb6b0,roughness:.18,metalness:.18,transparent:true,opacity:.31,depthWrite:false}),leaves)
 // Each leaf always remains inside a known world box, even mid-swing.
 const sphere=new T.Sphere(new T.Vector3(-145,1.4,67),125)
 frames.boundingSphere=sphere;panes.boundingSphere=sphere
 frames.receiveShadow=true;scene.add(frames,panes)
 const stamp=new T.Object3D(),temp=[]
 let first=0
 for(const d of doors){
  d.first=first;first+=d.leaves
  d.bounds=Array.from({length:d.leaves*4},()=>[0,0,0,0,2.68,false,.08])

 }
 function pose(d,progress,actors,write){
  const {r}=d,w=opening/d.leaves,g=progress*progress*(3-2*progress)
  const sliding=r.door==='slide'||r.door==='auto'
  for(let i=0;i<d.leaves;i++){
   const side=i===0?1:-1,pivot=side*(-opening/2),angle=sliding?0:d.direction*side*g*Math.PI*.49
   const along=Math.cos(angle)*side,into=-Math.sin(angle)*side
   const shift=sliding?-side*(w+.04)*g:0
   function point(u){return terracePoint(r,pivot+shift+along*u,r.depth/2-.08+into*u)}
   const leaf=d.first+i
   function part(mesh,index,u,y,width,height,depth){
    const p=point(u);stamp.position.set(p.x,y,p.z);stamp.rotation.y=r.angle+angle
    stamp.scale.set(width,height,depth);stamp.updateMatrix();mesh.setMatrixAt(index,stamp.matrix)
   }
   for(let j=0;j<4;j++){
    const a=point(j*w/4),b=point((j+1)*w/4),bounds=write?d.bounds[i*4+j]:temp
    bounds[0]=Math.min(a.x,b.x)-.045;bounds[1]=Math.max(a.x,b.x)+.045
    bounds[2]=Math.min(a.z,b.z)-.045;bounds[3]=Math.max(a.z,b.z)+.045
    if(!write&&actors.some(p=>p.y<2.69&&Math.hypot(p.x-Math.max(bounds[0],Math.min(bounds[1],p.x)),p.z-Math.max(bounds[2],Math.min(bounds[3],p.z)))<.34))return false
   }
   if(write){
    part(panes,leaf,w/2,1.62,w-.08,1.95,.038)
    part(frames,leaf*6,.035,1.38,.07,2.60,.091)
    part(frames,leaf*6+1,w-.035,1.38,.07,2.60,.091)
    part(frames,leaf*6+2,w/2,.34,w,.52,.09)
    part(frames,leaf*6+3,w/2,2.64,w,.09,.09)
    part(frames,leaf*6+4,w/2,1.06,w,.058,.11)
    part(frames,leaf*6+5,w*.79,1.30,.05,.31,.15)
   }
  }
  return true
 }
 for(const d of doors){pose(d,0,[],true);boxes.push(...d.bounds)}
 const near=(d,p,range)=>Math.abs(p.x-d.at.x)<range&&Math.abs(p.z-d.at.z)<range&&
  Math.hypot(p.x-d.at.x,p.z-d.at.z)<range&&(p.y??0)<2.69
 function open(d,p){
  if(!d.progress){const r=d.r;d.direction=(p.x-d.at.x)*r.sin+(p.z-d.at.z)*r.cos>=0?1:-1}
  d.target=1
 }
 function candidate(p){return doors.find(d=>near(d,p,2.15)&&d.r.door!=='auto')}
 return {
  doors,
  prompt(p){const d=candidate(p);return d?d.r.title+' · '+(d.target?'문 닫기':'문 열기'):''},
  toggle(p){const d=candidate(p);if(!d)return false
   if(d.target)d.target=0;else open(d,p)
   d.npcOpened=false;return true
  },
  update(dt,player,residents){
   let changed=false
   for(const d of doors){
    const npc=residents.find(n=>near(d,n.pos,1.65)&&n.f.hp>0)
    const user=d.r.door==='auto'&&near(d,player,2.05)
    if(user||npc){if(!d.target){open(d,user?player:npc.pos);d.npcOpened=true}}
    else if(d.npcOpened&&!near(d,player,2.2)){d.target=0;d.npcOpened=false}
    if(d.progress===d.target)continue
    const previous=d.progress
    const actors=[player,...residents.filter(n=>near(d,n.pos,3)).map(n=>n.pos)]
    // Sweep in short increments even after a long frame. Stop before touching a body.
    const travel=Math.min(Math.abs(d.target-d.progress),dt*1.65),steps=Math.ceil(travel/.035),sign=Math.sign(d.target-d.progress)
    for(let i=0;i<steps;i++){
     const next=clamp(d.progress+sign*travel/steps)
     if(!pose(d,next,actors,false))break
     d.progress=Math.abs(next-d.target)<1e-7?d.target:next;changed=true
    }
    if(previous===0&&d.progress>0)sound('doorOpen',d.at)
    if(previous>0&&d.progress===0)sound('doorClose',d.at)
    if(previous===d.progress)continue
    for(const b of d.bounds)boxes.unindex?.(b)
    pose(d,d.progress,[],true)
    for(const b of d.bounds)boxes.reindex?.(b)
   }
   if(changed){frames.instanceMatrix.needsUpdate=true;panes.instanceMatrix.needsUpdate=true}
   return changed
  }
 }
}
