import {foundryGarden} from './foundry-garden.js'
import * as T from 'three'
import {streamDistrict} from './district-stream.js'
import {loadWorksDetail} from './works-detail.js'
import {worksLoft,worksRear,worksRoof,worksStair} from './prologue-plan.js'

export function buildWestBank(scene,addCollider,maps,colliders) {
 const district=new T.Group()
 district.name='West Bank landmarks';scene.add(district)
 const solid=new T.BoxGeometry()
 const stone=new T.MeshStandardMaterial({color:0x9a9383,map:maps.architecture[1],roughness:.86})
 const brick=new T.MeshStandardMaterial({color:0xa07863,map:maps.architecture[0],roughness:.86})
 const steel=new T.MeshStandardMaterial({color:0x4e5c55,metalness:.35,roughness:.65})
 const wood=new T.MeshStandardMaterial({color:0x7e5b43,roughness:.86})
 const paint=new T.MeshStandardMaterial({color:0xc6bb9c,roughness:.8})
 const warm=new T.MeshStandardMaterial({color:0xffdf9e,emissive:0xc88641,emissiveIntensity:.65})
 const glass=new T.MeshStandardMaterial({color:0x8eaaa3,metalness:.32,roughness:.22,transparent:true,opacity:.55})
 const pieces=new Map()
 function box(mat,x,y,z,width,height,depth,rotation=0,pitch=0){
  const batch=pieces.get(mat)??[]
  batch.push([x,y,z,width,height,depth,rotation,pitch]);pieces.set(mat,batch)
 }
 function column(mat,x,z,r,height,y=height/2){
  const mesh=new T.Mesh(new T.CylinderGeometry(r*.82,r,height,10),mat)
  mesh.position.set(x,y,z);mesh.receiveShadow=true;district.add(mesh)
 }
 function sign(text,x,y,z,width=4,angle=0){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=108
  const ctx=canvas.getContext('2d');ctx.fillStyle='#273830';ctx.fillRect(0,0,512,108)
  ctx.strokeStyle='#bd9964';ctx.lineWidth=4;ctx.strokeRect(10,10,492,88)
  ctx.fillStyle='#e9dfc6';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,70,460)
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace
  const mesh=new T.Mesh(new T.PlaneGeometry(width,width*.21),new T.MeshStandardMaterial({map,side:T.DoubleSide}))
  mesh.position.set(x,y,z);mesh.rotation.y=angle;district.add(mesh)
 }
 function clerestory(a,b,n,s,east){
  const x=(a+b)*.5,z=(n+s)*.5
  const lower=4.36,upper=5.47,h=upper-lower
  const along=east?s-n:b-a,start=east?n:a,nBays=Math.max(1,Math.floor(along/2.48))
  const run=(along-.44)/nBays
  for(const [bottom,top] of [[0,lower],[upper,worksRoof]])
   box(brick,x,(bottom+top)/2,z,b-a,top-bottom,s-n)
  for(let i=0;i<=nBays;i++){
   const at=start+.22+i*run
   box(brick,east?x:at,(lower+upper)/2,east?at:z,east?b-a:.37,h,east?.37:s-n)
  }
  for(let i=0;i<nBays;i++){
   const at=start+.22+(i+.5)*run
   box(glass,east?b-.13:at,(lower+upper)/2,east?at:s-.13,east?.11:run-.36,h-.12,east?run-.36:.11)
   for(const y of [lower+.04,upper-.04])
    box(steel,east?b+.006:at,y,east?at:s+.006,east?.087:run-.32,.084,east?run-.32:.087)
   for(const shift of [-run*.22,run*.22])
    box(steel,east?b+.012:at+shift,(lower+upper)/2,east?at+shift:s+.012,east?.078:.058,h,east?.058:.078)
  }
  box(stone,east?b+.028:x,lower-.08,east?z:s+.028,east?.44:along,.15,east?along:.44)
 }
 for(const [a,b,n,s,h] of [
  [-139,-138.7,29,49,worksRoof],[-119.3,-119,29,worksRear.z-.91,worksRoof],
  [-119.3,-119,worksRear.z+.91,49,worksRoof],[-139,-119,48.7,49,worksRoof],
  [-139,-132.2,29,29.32,worksRoof],[-125.8,-119,29,29.32,worksRoof],
  [-137.5,-133.7,47.6,48.65,1.12],[-121.4,-119.32,45.4,48.65,1.8]
 ]){
  addCollider(a,b,n,s,h)
  const mat=h>3?brick:h<.8?wood:steel
  if(a===-119.3||n===48.7&&h===worksRoof)clerestory(a,b,n,s,a===-119.3)
  else box(mat,(a+b)/2,h*.5,(n+s)/2,b-a,h,s-n)
 }
 box(stone,-129,.043,39,19.4,.086,19.2)
 box(steel,-129,worksRoof+.085,39,20.6,.19,20.6)
 box(brick,-129,(3.67+worksRoof)*.5,29.16,6.4,worksRoof-3.67,.32)
 box(brick,-119.16,(2.68+worksRoof)*.5,worksRear.z,.32,worksRoof-2.68,1.82)
 addCollider(-119.32,-119,worksRear.z-.91,worksRear.z+.91,worksRoof,false,2.68)
 for(const x of [-119.38,-118.94])for(const z of [worksRear.z-.94,worksRear.z+.94])box(steel,x,1.40,z,.15,2.70,.13)
 for(const x of [-130.8,-127.2])box(steel,x,1.39,49.25,.18,2.78,.76)
 for(const x of [-137.75,-133.5,-129,-124.5,-120.25])box(stone,x,1.99,49.065,.34,3.98,.27)
 for(const z of [29.85,34.2,38.4,44.45,48.24])box(stone,-118.95,1.99,z,.21,3.98,.34)
 box(stone,-129,.26,49.11,20,.52,.25)
 for(const [n,s] of [[29,worksRear.z-.91],[worksRear.z+.91,49]])box(stone,-118.98,.26,(n+s)/2,.26,.52,s-n)
 box(steel,-118.37,3.05,worksRear.z,1.62,.17,3.1,0,.043)
 box(warm,-118.67,2.95,worksRear.z,.33,.059,1.82)
 for(const z of [worksRear.z-1.27,worksRear.z+1.27])box(steel,-118.58,2.72,z,.86,.078,.058,0,0)
 for(const z of [30.4,36.7,44.7,48.1]){
  box(steel,-129,5.6,z,19.24,.27,.24)
  box(steel,-129,6.03,z,19.24,.14,.14)
  for(const x of [-135.9,-131.4,-126.6,-122.1])box(steel,x,5.82,z,.11,.64,.12,.24)
  for(const x of [-135.7,-122.2])box(warm,x,5.44,z,1.94,.075,.17)
 }
 for(const x of [-134.7,-123.3]){
  box(steel,x,6.72,37.9,5.3,1.00,1.8)
  box(warm,x,6.81,36.984,4.68,.49,.041)
  box(steel,x,7.26,37.8,5.51,.18,2.26,.04)
  for(let i=-2;i<3;i++)box(steel,x+i*.92,6.79,36.953,.071,.63,.06)
 }
 const catwalk=worksLoft,stair=worksStair,platformHeight=catwalk.height
 const platformX=(catwalk.west+catwalk.east)*.5,platformZ=(catwalk.north+catwalk.south)*.5
 box(steel,platformX,platformHeight-.10,platformZ,catwalk.east-catwalk.west,.20,catwalk.south-catwalk.north)
 addCollider(catwalk.west,catwalk.east,catwalk.north,catwalk.south,platformHeight,true,platformHeight-.20)
 const run=(stair.south-stair.north)/stair.steps,stepWidth=stair.east-stair.west
 for(let i=0;i<stair.steps;i++){
  const z=stair.south-(i+.5)*run,y=(i+1)*platformHeight/stair.steps
  box(steel,(stair.west+stair.east)*.5,y-.055,z,stepWidth,.11,run+.015)
  box(paint,(stair.west+stair.east)*.5,y,z+.242,stepWidth-.18,.02,.05)
 }
 for(const side of [stair.west,stair.east]){
  for(let i=0;i<=6;i+=1)box(steel,side,.52+platformHeight*i/6,stair.south-(stair.south-stair.north)*i/6,.061,1.10,.065)
  box(steel,side,1.04+platformHeight*.5,(stair.north+stair.south)*.5,.074,.069,Math.hypot(stair.south-stair.north,platformHeight),0,Math.atan2(platformHeight,stair.south-stair.north))
 }
 box(steel,catwalk.east,platformHeight+1.04,platformZ,.075,.085,catwalk.south-catwalk.north)
 for(let z=catwalk.north+.20;z<catwalk.south;z+=1.7)box(steel,catwalk.east,platformHeight+.52,z,.075,1.10,.075)
 addCollider(catwalk.east-.039,catwalk.east+.039,catwalk.north,catwalk.south,platformHeight+1.1,false,platformHeight)
 for(const [a,b] of [[catwalk.west,stair.west],[stair.east,catwalk.east]]){
  box(steel,(a+b)*.5,platformHeight+1,catwalk.south,b-a,.085,.075)
  addCollider(a,b,catwalk.south-.04,catwalk.south+.04,platformHeight+1.1,false,platformHeight)
 }
 // Retired machinery remains as cover in the production aisle.
 for(const [x,z,w,d,h] of [[-132.94,35.0,1.74,2.6,1.38],[-124.25,35.75,2.56,1.63,1.24],[-132,42.45,1.75,1.25,1.2],[-125.4,44.1,1.25,.8,1.31]]){
  box(steel,x,.19,z,w+.14,.37,d+.14)
  box(steel,x,h*.54,z,w,h*.84,d)
  box(wood,x,h,z,w+.06,.15,d+.06)
  box(warm,x+w*.31,.86,z-d*.51,.15,.11,.04)
  addCollider(x-w/2,x+w/2,z-d/2,z+d/2,h+.09)
 }
 for(let x=-118.7;x<-116.15;x+=.43)box(paint,x,.095,worksRear.z-1.12,.17,.013,.05)
 for(let x=-118.7;x<-116.15;x+=.43)box(paint,x,.095,worksRear.z+1.12,.17,.013,.05)
 sign('FABRICATION HALL',-129,4.77,28.93,5.4)
 sign('SERVICE EXIT',-118.92,2.96,worksRear.z,1.68,Math.PI/2)
 box(stone,-129,3.51,29.15,6.4,.39,.35)
 for(const x of [-132.32,-125.68])box(steel,x,1.67,29.08,.18,3.34,.22)
 for(let i=0;i<5;i++)box(steel,-129,3.15+i*.081,29.18,6.3,.059,.20)
 box(warm,-129,3.53,35,3,.06,.15)
 box(warm,-134.5,3.53,44,2.8,.06,.15)
 box(wood,-135.65,1.17,48.1,4.05,.12,1.12)
 box(steel,-135.3,1.39,48.1,1.21,.39,.58)
 box(paint,-120.4,.98,47.6,1.78,1.96,1.38)
 box(steel,-121.25,1.29,47.51,.05,.33,.06)
 for(const x of [-130,-127.9])box(paint,x,.09,42,.095,.01,5.2)
 sign('WEST BANK WORKS',-129,3.38,28.94,5)
 sign('NIGHT SERVICE LOG',-135.7,1.88,48.52,2.65)
 for(const x of [-140.8,-117.4])box(paint,x,.091,31,.07,.012,3.3)

 const garden=foundryGarden(district,maps,addCollider)

 // Former ferry shed and gantry frame, with a walk-in viewing platform.
 for(const [a,b,n,s,h] of [[-221,-220.7,100,111,4.7],[-220.7,-204,110.72,111,4.7],[-204.25,-204,105,111,4.7]]){
  addCollider(a,b,n,s,h);box(brick,(a+b)/2,h/2,(n+s)/2,b-a,h,s-n)
 }
 // Ferry hall roof lantern and riveted cross-braced steel frame.
 const truss=[]
 function girder(ax,ay,az,bx,by,bz,w,d){
  const start=new T.Vector3(ax,ay,az),end=new T.Vector3(bx,by,bz),v=end.clone().sub(start)
  const m=new T.Matrix4().compose(start.lerp(end,.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.clone().normalize()),new T.Vector3(w,v.length(),d))
  truss.push(m)
 }
 for(const side of [-1,1]){
  girder(-212.5,6.74,105.5,-212.5,4.80,105.5+side*6,17.95,.15)
  for(const x of [-220.6,-216.5,-212.5,-208.5,-204.4]){
   girder(x,4.82,105.5+side*5.86,x,6.64,105.5,.13,.17)
   girder(x,4.71,105.5+side*5.8,x,4.71,105.5,.11,.16)
   girder(x,4.75,105.5+side*3,x,6.48,105.5,.09,.1)
  }
 }
 const beams=new T.InstancedMesh(solid,steel,truss.length);truss.forEach((m,i)=>beams.setMatrixAt(i,m))
 beams.receiveShadow=true;district.add(beams)
 for(const x of [-220.6,-216.55,-212.5,-208.45,-204.4]){
  box(paint,x,4.34,99.63,.11,.65,.15)
  box(wood,x,.62,110.19,2.64,.15,.59);addCollider(x-1.32,x+1.32,109.89,110.49,.71,true)
 }
 box(steel,-212.5,4.72,99.63,17.8,.28,.21)
 for(let i=0;i<12;i++){
  const ax=-220.2+i*1.39
  girder(ax,6.75,98,ax+.68,7.13,98,.072,.10)
  girder(ax+.68,7.13,98,ax+1.37,6.75,98,.072,.10)
 }
 const lattice=new T.InstancedMesh(solid,steel,24);truss.slice(-24).forEach((m,i)=>lattice.setMatrixAt(i,m));district.add(lattice)
 box(steel,-212.6,7.16,98,17.0,.12,.20)
 for(const x of [-217.5,-212.5,-207.5]){
  box(steel,x,4.32,101.1,.045,.74,.045)
  box(warm,x,3.92,101.1,.58,.15,.42)
 }
 for(const x of [-218.4,-207.1]){
  box(steel,x,2.39,100.4,.29,4.78,.36);addCollider(x-.15,x+.15,100.2,100.6,4.78)
 }
 for(const x of [-219,-206.4]){
  box(steel,x,3.35,98,.38,6.7,.38)
  addCollider(x-.20,x+.20,97.78,98.22,6.7)
 }
 box(steel,-212.7,6.72,98,13.4,.53,.45)
 sign('WEST FERRY YARD',-212.5,3.45,99.45,6.1,Math.PI)
 const beacon=new T.Mesh(new T.SphereGeometry(.19,12,9),new T.MeshStandardMaterial({color:0xe68d41,emissive:0x9a3c14,emissiveIntensity:.4}))
 beacon.position.set(-207.1,2.6,100.14);district.add(beacon)
 sign('NORTH SERVICE YARD',-208.0,1.53,32.1,3.3)
 for(const [x,z] of [[-204.7,34.25],[-210.3,34.25]]){
  box(steel,x,.52,z,.19,1,.19);addCollider(x-.095,x+.095,z-.095,z+.095,1.02)
 }

 // Street lighting and masonry perimeter along the irregular edge.
 for(const [x,z] of [[-118,31],[-102.8,68],[-181.55,54],[-197,71],[-209,51],[-209,79],[-177,119],[-140,112],[-135,6]]){
  column(steel,x,z,.11,3.7);box(steel,x+.28,3.55,z,.66,.18,.20);box(warm,x+.49,3.48,z,.29,.08,.2)
  addCollider(x-.125,x+.125,z-.125,z+.125,3.73)
 }
 const stamp=new T.Object3D(),batches=[]
 for(const [mat,parts] of pieces){
  const mesh=new T.InstancedMesh(solid,mat,parts.length)
  mesh.receiveShadow=true;mesh.castShadow=false
  parts.forEach(([x,y,z,w,h,d,ry,rx],i)=>{
   stamp.position.set(x,y,z);stamp.rotation.set(rx,ry,0);stamp.scale.set(w,h,d);stamp.updateMatrix();mesh.setMatrixAt(i,stamp.matrix)
  })
  district.add(mesh);batches.push(mesh)
 }
 let signal=0,shadows=false
 const stream=streamDistrict({load:loadWorksDetail,enterDistance:62,leaveDistance:88,
  attach(detail){district.add(detail.group);colliders?.push(...detail.footprints)},
  detach(detail){
   detail.group.removeFromParent()
   if(colliders)for(const bounds of detail.footprints){const i=colliders.indexOf(bounds);if(i>=0)colliders.splice(i,1)}
  }})
 return {
  operate(tag){if(tag==='PARK')garden.operate();if(tag==='WEST')signal=8},
  update(dt,elapsed,pos,low=false){
   const gardenChanged=garden.update(dt,elapsed,pos,low)
   const changed=stream(Math.hypot(pos.x+166,(pos.z??44)-58))
   signal=Math.max(0,signal-dt)
   beacon.material.emissiveIntensity=signal?(Math.sin(elapsed*10)>.1?2.6:.15):.4
   const near=pos.x<-92
   if(near===shadows)return changed||gardenChanged
   shadows=near;for(const mesh of batches)mesh.castShadow=near
   return true
  }
 }
}
