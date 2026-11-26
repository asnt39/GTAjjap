import * as T from 'three'
import {terraceRooms} from './terrace-plan.js'

export function terraceSigns(){
 const c=document.createElement('canvas');c.width=1024;c.height=512
 const p=c.getContext('2d'),schemes=[['#315956','#efe3be'],['#814733','#f2dfbb'],['#343e47','#d9c49a'],['#d3bc96','#383e39']]
 terraceRooms.forEach((r,i)=>{
  const x=i%2*512,y=Math.floor(i/2)*64,[bg,ink]=schemes[i%4]
  p.fillStyle=bg;p.fillRect(x,y,512,64);p.fillStyle=ink;p.fillRect(x+10,y+6,492,2);p.fillRect(x+10,y+56,492,2)
  p.textAlign='center';p.font=r.use==='workshop'?'bold 34px sans-serif':'bold 36px Georgia, serif';p.fillText(r.title.toUpperCase(),x+256,y+44,474)
 })
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4
 return new T.MeshStandardMaterial({map:tex,roughness:.65,emissiveMap:tex,emissive:0xe5ba86,emissiveIntensity:.25})
}

export function detailTerrace({i,width:w,height:h,depth:d,part,panels,terrace,group,x,z,angle,rotate,batch,signs,materials}){
 const {iron,stone,trim,wood,roof,atlas,facade,lamp}=materials
 const back=-d/2,front=d/2,industrial=terrace?.use==='workshop'||i>=42,home=terrace?.use==='home'||(!terrace&&i%3===1)
 if(terrace){
  const tile=terraceRooms.indexOf(terrace),g=new T.PlaneGeometry(w-.76,.72),uv=g.attributes.uv
  for(let j=0;j<uv.count;j++)uv.setXY(j,(tile%2+.004+uv.getX(j)*.992)/2,(7-Math.floor(tile/2)+.02+uv.getY(j)*.96)/8)
  part(0,3.48,front+.105,w-.56,.89,.17,wood)
  batch(rotate(x,z,angle,g.translate(0,3.48,front+.196)),signs,group)
 }
 // Service elevations are visible from the gardens and the back lanes.
 const bays=industrial?3:2
 for(let k=0;k<bays;k++){
  const bx=(k+.5-bays/2)*(w-.95)/bays,ww=Math.min((w-1.25)/bays-.18,industrial?2.55:1.81)
  const yy=industrial?2.35:1.66
  part(bx,yy,back-.075,ww+.18,1.46,.15,trim)
  panels(ww,1.29,bx,yy,back-.16,industrial?23:20+(i+k)%4,angle,x,z,Math.PI,group)
  part(bx,yy,back-.18,.062,1.32,.08,iron)
  part(bx,yy-.76,back-.13,ww+.30,.11,.28,stone)
  if(!industrial){
   part(bx,4.85,back-.08,ww+.15,1.62,.18,trim)
   panels(ww,1.45,bx,4.85,back-.18,20+(i+k+2)%4,angle,x,z,Math.PI,group)
  }
 }
 part(-w*.45,h*.47,back-.13,.11,h*.92,.13,iron)
 part(0,.31,back-.04,w,.44,.10,stone)
 if(home){
  part(0,3.88,back-.49,w*.78,.19,.97,stone)
  part(0,4.74,back-.94,w*.78,.073,.073,iron)
  for(let j=0;j<9;j++)part((j/8-.5)*w*.76,4.3,back-.94,.055,.88,.055,iron)
  for(const side of [-1,1])part(side*w*.38,4.73,back-.50,.062,.07,.91,iron)
  part(0,3.11,front+.33,2.3,.095,.68,roof)
 }else if(industrial){
  for(let k=0;k<3;k++){
   const bz=(k-1)*d*.29
   part(0,h+.74,bz,w*.78,.13,d*.31,roof,false,.25)
   part(0,h+.70,bz-d*.15,w*.76,.40,.09,trim)
  }
  for(const side of [-1,1])part(side*w*.34,h+1.13,0,.46,1.56,.46,iron)
 }else{
  part(w*.23,h+.88,-d*.19,1.46,.83,1.04,trim)
  for(let j=0;j<4;j++)part(w*.23,h+.60+j*.15,-d*.19-.53,1.25,.06,.04,iron)
 }
 const wallSide=i%2?1:-1
 part(wallSide*(w/2+.12),1.79,-d*.30,.22,.42,.32,iron)
 part(wallSide*(w/2+.25),1.8,-d*.30,.065,.24,.21,lamp)
}
