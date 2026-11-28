import {cargoPier,cargoPlatform,inBounds} from './chapter-sites.js'
// Metres in the existing Portside coordinate system. +X leads out to sea.
export const seaLevel=-1.18
export const coastExtent=[26.15,200,-90,269]
export const shoreNorth=102,shoreSouth=253
export const beachGate={z:146.5,half:2.35}
export const shoal={x:154,z:204,rx:15,rz:11}
export const dock={west:62,east:106,z:146.5,half:1.65,height:.12}
export const swimLadder={x:96.0,z:dock.z+dock.half+.43,deckZ:dock.z+dock.half-.52}
export const cargoLadder={x:119.3,z:188.58,deckZ:189.55}
export const coastLadders=[swimLadder,cargoLadder]
export const coastalRocks=[
 {x:57,z:112,rx:4.4,rz:4.1,h:3.1},{x:65,z:115,rx:5.2,rz:3.3,h:4.05},{x:73,z:118,rx:3.8,rz:2.7,h:2.1},
 {x:51,z:228,rx:5.1,rz:6.4,h:7.1},{x:58,z:229,rx:4.8,rz:5.2,h:8.1},{x:65,z:231,rx:4.9,rz:5.3,h:6.7},
 {x:71,z:234,rx:4.1,rz:4.7,h:4.8},{x:77,z:236,rx:3.2,rz:3.5,h:3.3},
 {x:101,z:108,rx:4.3,rz:3.1,h:3.2},{x:111,z:114,rx:5.6,rz:3.7,h:4.25},{x:108,z:121,rx:2.9,rz:4.1,h:2.4},
 {x:129,z:224,rx:6.7,rz:4.6,h:4.9},{x:139,z:230,rx:4.1,rz:3.6,h:2.5},
 {x:155,z:193,rx:4.1,rz:3.7,h:3.2},{x:166,z:200,rx:3.2,rz:2.4,h:2.25},{x:156,z:216,rx:5.2,rz:2.9,h:3.9}
]
export const coastalBoats=[
 {id:'skiff',name:'Harbor Skiff',x:103.45,z:143.3,heading:Math.PI/2,length:4.7,width:1.65,top:9.2,power:3.1,draft:.40,turn:1.09,color:0x4e7c74},
 {id:'launch',name:'Tern Sport',x:103.55,z:150.25,heading:Math.PI/2,length:5.7,width:1.78,top:15.7,power:4.3,draft:.32,turn:.87,color:0xc75c3d}
]
export const coastSights=[
 {x:44,z:146.5,title:'Meridian Beach',tag:'SEA',name:'해안 안내',body:'산책로 동쪽에서 모래사장과 수영 구역으로 내려갈 수 있어. 부표 안쪽을 사용하고, 선착장에서 E를 눌러 스키프나 스포츠 보트에 탑승해.'}
]
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v))
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)}
export function shoreX(z){
 const t=clamp((z-shoreNorth)/(shoreSouth-shoreNorth),0,1)
 const envelope=Math.sin(t*Math.PI)
 return 26+envelope*(53+9*Math.sin(t*10)+3.25*Math.sin(t*23))
}
export const shoalDistance=(x,z)=>1-Math.hypot((x-shoal.x)/shoal.rx,(z-shoal.z)/shoal.rz)
export const offBeach=(x,z)=>x>shoreX(z)
export function seabed(x,z){
 const bank=shoreX(z)-x,island=shoalDistance(x,z)*12
 const delta=Math.max(bank,island)
 const slope=delta<0?.145:.128
 const dry=smooth(9,18,bank)*smooth(42,50,x)*(1-smooth(67,76,x))
 const corridor=smooth(5,13,Math.abs(z-beachGate.z))*smooth(120,134,z)*(1-smooth(201,220,z))
 const dunes=.29*dry*corridor*(.55+.28*Math.sin(x*.41+z*.25)+.17*Math.cos(x*.57-z*.31))
 return seaLevel+clamp(delta*slope,-8.5,1.263)+(delta>11?.10*Math.sin((x-27)*.25)*Math.sin(z*.12):0)+dunes
}
export function beachGround(x,z){
 if(inPier(x,z))return dock.height
 if(isGate(x,z)&&x<39)return .083
 return seabed(x,z)
}
export function isGate(x,z,r=0){
 return x>=24+r&&x<=40-r&&Math.abs(z-beachGate.z)<=beachGate.half-r
}
export function inPier(x,z,r=0){
 return x>=dock.west+r&&x<=dock.east-r&&Math.abs(z-dock.z)<=dock.half-r||
  [cargoPier,cargoPlatform].some(([w,e,n,s])=>inBounds([w+r,e-r,n+r,s-r],x,z))||
  x>=cargoPier[0]+r&&x<=cargoPlatform[1]-r&&z>=cargoPier[2]+r&&z<=cargoPier[3]-r
}
export function inCoast(x,z,r=0){
 return x>=coastExtent[0]+r&&x<=coastExtent[1]-r&&z>=coastExtent[2]+r&&z<=coastExtent[3]-r
}
export const coastFloor=(x,z)=>inCoast(x,z)||isGate(x,z)
export function coastalLand(x,z,r=0){
 if(isGate(x,z,r)||inPier(x,z,r))return true
 return inCoast(x,z,r)&&beachGround(x,z)>=seaLevel-.54&&(x>34||z>=120&&z<=221)
}
// The same irregular footprint produces the rock mesh and the low-cost water collision.
export function rockRadius(index,angle){
 return 1+.115*Math.cos(angle*3+index*.82)+.12*Math.sin(angle*5-index*.74)+.042*Math.cos(angle*7+index)
}
export function rockSolid(x,z,r=0){
 for(let i=0;i<coastalRocks.length;i++){
  const k=coastalRocks[i],dx=(x-k.x)/(k.rx+r),dz=(z-k.z)/(k.rz+r)
  if(dx*dx+dz*dz>1.63)continue
  if(Math.hypot(dx,dz)<rockRadius(i,Math.atan2(dz,dx))*.89)return true
 }
 return false
}
export function boatWater(x,z,draft){
 return inCoast(x,z,.13)&&seabed(x,z)<seaLevel-draft&&!inPier(x,z,-.30)&&!rockSolid(x,z,.16)
}
// Shared coefficients keep the rendered surface and buoyancy in phase.
const waves=[{x:.17,z:.22,speed:1.14,amplitude:.081},{x:.33,z:-.13,speed:-1.62,amplitude:.032}]
export function swellAt(x,z,t){
 return seaLevel+waves.reduce((height,w)=>height+w.amplitude*Math.sin(w.x*x+w.z*z+w.speed*t),0)
}
const decimal=value=>value.toFixed(5)
const phase=w=>`dot(p,vec2(${decimal(w.x)},${decimal(w.z)}))+t*(${decimal(w.speed)})`
export const waveSource=`
 float swell(vec2 p,float t){return ${waves.map(w=>`${decimal(w.amplitude)}*sin(${phase(w)})`).join('+')};}
 vec2 swellSlope(vec2 p,float t){return ${waves.map(w=>
  `vec2(${decimal(w.x*w.amplitude)},${decimal(w.z*w.amplitude)})*cos(${phase(w)})`).join('+')};}`
