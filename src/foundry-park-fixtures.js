import * as T from 'three'
import {foundryAmenities,foundryFountain} from './foundry-garden-plan.js'

export function foundryParkFixtures(group,addCollider,maps){
 const material=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.81,...options})
 const granite=material(0x9c9382),iron=material(0x43534a,{metalness:.34}),oak=material(0x987354)
 const redwood=material(0x745440),roof=material(0x546566,{metalness:.18}),rubber=material(0x414f4c)
 const sand=material(0xc5b18a),soil=material(0x4b4034),enamel=material(0x64877a,{metalness:.25})
 const lamp=material(0xf5dfad,{emissive:0xe9b162,emissiveIntensity:.7})
 const leaf=new T.MeshStandardMaterial({roughness:.91})
 const brick=material(0xa37d66,{map:maps.architecture[0]})
 const cube=new T.BoxGeometry(),tube=new T.CylinderGeometry(1,1,1,12),petal=new T.IcosahedronGeometry(1,0)
 const batches=new Map(),stamp=new T.Object3D(),up=new T.Vector3(0,1,0),swings=[]
 function part(geometry,mat,matrix,color){
  const parts=batches.get(mat)??[]
  parts.push({geometry,matrix,color});batches.set(mat,parts)
 }
 function place(geometry,mat,x,y,z,w,h,d,tilt=0,turn=0,color){
  stamp.position.set(x,y,z);stamp.rotation.set(tilt,turn,0);stamp.scale.set(w,h,d);stamp.updateMatrix()
  part(geometry,mat,stamp.matrix.clone(),color)
 }
 const box=(mat,...args)=>place(cube,mat,...args)
 const column=(mat,x,y,z,r,h)=>place(tube,mat,x,y,z,r,h,r)
 function beam(mat,from,to,width,depth=width){
  const a=new T.Vector3(...from),b=new T.Vector3(...to),delta=b.clone().sub(a)
  stamp.position.copy(a.lerp(b,.5));stamp.quaternion.setFromUnitVectors(up,delta.clone().normalize())
  stamp.scale.set(width,delta.length(),depth);stamp.updateMatrix()
  part(cube,mat,stamp.matrix.clone())
 }
 const occupied=(x,z,w,d,h,stand=false,bottom)=>addCollider(x-w/2,x+w/2,z-d/2,z+d/2,h,stand,bottom)
 function sign(title,subtitle,x,z,width,turn){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=176
  const draw=canvas.getContext('2d')
  draw.fillStyle='#30463d';draw.fillRect(0,0,512,176)
  draw.strokeStyle='#c1a779';draw.lineWidth=4;draw.strokeRect(11,11,490,154)
  draw.textAlign='center';draw.fillStyle='#eee6ce';draw.font='bold 43px sans-serif';draw.fillText(title,256,78,456)
  draw.fillStyle='#e9d9b7';draw.font='25px sans-serif';draw.fillText(subtitle,256,129,451)
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace
  const panel=new T.Group();panel.position.set(x,0,z);panel.rotation.y=turn;group.add(panel)
  const surface=new T.Mesh(new T.PlaneGeometry(width,width*176/512),new T.MeshStandardMaterial({map,side:T.DoubleSide,roughness:.8}))
  surface.position.set(0,1.25,.048);panel.add(surface)
  const backing=new T.Mesh(cube,iron);backing.scale.set(width+.06,width*176/512+.05,.09);backing.position.y=1.25;panel.add(backing)
  const sideways=Math.abs(Math.sin(turn))>.5
  for(const dx of [-width*.37,width*.37]){
   const post=new T.Mesh(cube,iron);post.scale.set(.075,1.32,.085);post.position.set(dx,.72,0);panel.add(post)
   occupied(x+Math.cos(turn)*dx,z-Math.sin(turn)*dx,.12,.12,1.39)
  }
  occupied(x,z,sideways?.07:width,sideways?width:.07,1.25+width*.181,false,1.25-width*.181)
 }
 function bench(x,z,width=1.88){
  for(const side of [-1,1]){
   const px=x+side*(width/2-.17)
   box(iron,px,.32,z,.10,.47,.49)
   box(iron,px,.80,z+.18,.088,.51,.10,-.09)
  }
  for(let k=0;k<3;k++)box(oak,x,.582,z+(k-1)*.167,width,.085,.146)
  for(let k=0;k<2;k++)box(oak,x,.79+k*.15,z+.245,width,.124,.069,-.09)
  occupied(x,z,width,.51,.625,true)
  occupied(x,z+.23,width,.102,1.02,false,.62)
 }

 // Street entrances stay open between low masonry runs.
 const walls=[[-181,41.12,.38,5.45],[-181,52.38,.38,7.64],[-176.63,38.15,8.4,.35],
  [-170.39,28.85,3.7,.35],[-161.69,28.85,6.67,.35],[-158.14,35.7,.34,12.68],[-158.14,53.36,.34,8.95],
  [-179.33,57.81,3.18,.34],[-169.39,57.81,12.35,.34],[-159.25,57.81,2.14,.34]]
 for(const [x,z,w,d] of walls){
  box(brick,x,.185,z,w,.218,d)
  box(granite,x,.318,z,w+.07,.07,d+.07)
  occupied(x,z,w+.07,d+.07,.353,true)
 }
 sign('FOUNDRY GARDEN','PLAYGROUND  ·  PICNIC SHELTER',-164.05,29.42,2.34,Math.PI)
 sign('FOUNDRY GARDEN','WEST BANK PARKS',-179.25,43.98,2.05,-Math.PI/2)
 sign('COMMUNITY PLOTS','WEST BANK GROWERS',-178.72,55.75,1.7,Math.PI)

 // Open-sided, roofed picnic area with a level apron and room at the table ends.
 for(const x of [-171.6,-167.54])for(const z of [31.2,36.1]){
  box(granite,x,.183,z,.29,.20,.29)
  box(iron,x,1.64,z,.13,3.01,.13)
  occupied(x,z,.29,.29,3.16)
 }
 for(const z of [31.2,33.65,36.1]){
  beam(iron,[-171.82,3.13,z],[-169.57,3.57,z],.145)
  beam(iron,[-167.32,3.13,z],[-169.57,3.57,z],.145)
 }
 for(const x of [-171.68,-167.46])box(iron,x,3.13,33.65,.16,.16,5.18)
 box(roof,-169.57,3.57,33.65,.09,.10,5.84)
 for(const side of [-1,1]){
  const panel=new T.BoxGeometry(2.43,.082,5.84).rotateZ(-side*.193).translate(-169.57+side*1.18,3.35,33.65)
  const cover=new T.Mesh(panel,roof);cover.castShadow=true;cover.receiveShadow=true;group.add(cover)
  for(let i=0;i<22;i++){
   const x=side*(.10+i*.104)
   box(iron,-169.57+x,3.61-Math.abs(x)*.193,33.65,.027,.031,5.80)
  }
  box(iron,-169.57+side*2.39,3.10,33.65,.13,.14,5.89)
 }
 occupied(-169.57,33.65,4.77,5.84,3.63,false,3.045)
 const picnic=foundryAmenities[0],tableZ=33.65
 for(const x of [picnic.x-.93,picnic.x+.93]){
  box(iron,x,.40,tableZ,.12,.61,.20)
  box(iron,x,.30,tableZ,.13,.11,1.69)
 }
 for(let i=-2;i<=2;i++)box(oak,picnic.x,.78,tableZ+i*.16,2.47,.081,.148)
 occupied(picnic.x,tableZ,2.47,.80,.821)
 for(const z of [picnic.seatZ,tableZ+.68]){
  for(const side of [-1,1])box(oak,picnic.x,.518,z+side*.082,2.47,.064,.152)
  occupied(picnic.x,z,2.47,.33,.55,true)
 }

 // Rubber play surface, a two-bay swing frame and standable balance steps.
 for(const x of [-164.08,-159.25]){
  for(const z of [31.1,33.45]){
   beam(iron,[x,.11,z],[x,2.56,32.27],.12)
   column(granite,x,.153,z,.22,.12)
   occupied(x,z,.42,.42,1.53)
  }
  box(iron,x,1.62,32.27,.095,.075,1.03)
 }
 box(enamel,-161.665,2.59,32.27,5.10,.132,.13)
 for(const [i,x] of [-162.81,-160.54].entries()){
  const swing=new T.Group();swing.position.set(x,2.54,32.27);group.add(swing)
  for(const side of [-1,1]){
   const chain=new T.Mesh(cube,iron);chain.scale.set(.026,1.97,.027);chain.position.set(side*.26,-.98,0);swing.add(chain)
  }
  const seat=new T.Mesh(cube,rubber);seat.scale.set(.65,.095,.28);seat.position.y=-1.97;swing.add(seat)
  swings.push({swing,phase:i*1.8})
 }
 for(const [x,z,r,h] of [[-162.52,35.50,.43,.36],[-161.1,35.50,.39,.58],[-159.69,35.50,.42,.76],[-159.11,36.68,.33,.44]]){
  column(redwood,x,(h+.1)/2,z,r,h-.1)
  column(oak,x,h-.034,z,r+.027,.068)
  occupied(x,z,r*1.61,r*1.61,h,true)
 }
 for(const z of [30.38,37.32])box(sand,-161.70,.126,z,6.06,.012,.047)
 for(const x of [-164.70,-158.68])box(sand,x,.126,33.855,.047,.012,6.95)

 // Raised beds with clear aisles. Coastal wildflowers share the reclaimed timber beds.
 for(const [j,[x,z,w,d]] of [[-179.48,51.9,1.65,1.82],[-179.48,54.55,1.65,1.88],[-175.83,51.9,1.22,1.82],[-175.83,54.55,1.22,1.88]].entries()){
  box(soil,x,.405,z,w-.12,.12,d-.13)
  for(const side of [-1,1]){
   box(redwood,x+side*(w/2-.055),.27,z,.11,.35,d)
   box(oak,x+side*(w/2-.055),.457,z,.135,.048,d+.024)
   box(redwood,x,.27,z+side*(d/2-.055),w,.35,.11)
   box(oak,x,.457,z+side*(d/2-.055),w+.025,.048,.136)
  }
  for(let i=0;i<27;i++){
   const px=x+(i%3-1)*(w-.26)/3+.045*Math.sin(i*40),pz=z+(Math.floor(i/3)-4)*(d-.26)/9
   const h=.11+.085*(.5+.5*Math.sin(i*2.37+j))
   const palette=[0x566c47,0x768a52,0x7e8d51,0x59664a]
   place(petal,leaf,px,.46+h*.62,pz,.102,h,.14,0,i*1.7,palette[(i+j)%4])
   if((i+j)%4===0)place(petal,leaf,px,.51+h*1.3,pz,.05,.064,.052,0,i,[0xc38c7d,0xcfa968,0xb38cb0,0xdbceb4][j])
  }
  occupied(x,z,w+.025,d+.024,.481,true)
 }
 const gardenSeat=foundryAmenities[1]
 bench(gardenSeat.x,gardenSeat.seatZ,1.72)
 bench(-169,52.94)
 bench(-160.4,46.7)

 const drink=foundryAmenities[2],drinkZ=drink.z+.62
 box(granite,drink.x,.16,drinkZ,.53,.15,.52)
 box(enamel,drink.x,.60,drinkZ,.34,.89,.32)
 box(iron,drink.x,1.055,drinkZ,.48,.07,.43)
 box(enamel,drink.x,1.097,drinkZ,.37,.029,.33)
 box(iron,drink.x+.14,1.165,drinkZ+.045,.034,.135,.036)
 box(iron,drink.x+.106,1.219,drinkZ+.045,.086,.033,.037)
 occupied(drink.x,drinkZ,.53,.52,1.23)

 for(const [x,z] of [[-172.39,43.02],[-164.31,41.13],[-173.36,53.24],[-159.26,50.63],[-168.05,38.94]]){
  column(granite,x,.17,z,.19,.16)
  column(iron,x,1.30,z,.056,2.41)
  column(lamp,x,2.46,z,.148,.26)
  column(iron,x,2.625,z,.197,.09)
  column(iron,x,2.30,z,.17,.056)
  occupied(x,z,.36,.36,2.67)
 }
 for(const [x,z] of [[-178.9,47.53],[-167.26,35.6],[-160.1,52.2]]){
  column(iron,x,.51,z,.235,.79);column(oak,x,.53,z,.25,.71);column(iron,x,.93,z,.26,.13)
  box(rubber,x,.999,z,.28,.018,.144)
  occupied(x,z,.50,.5,1.0)
 }

 const {x:fx,z:fz}=foundryFountain
 column(granite,fx,.211,fz,1.56,.23)
 const coping=new T.Mesh(new T.TorusGeometry(1.37,.115,7,40),granite)
 coping.rotation.x=Math.PI/2;coping.position.set(fx,.42,fz);group.add(coping)
 const basin=new T.Mesh(new T.CircleGeometry(1.37,40),material(0x658d89,{roughness:.23,metalness:.40}))
 basin.rotation.x=-Math.PI/2;basin.position.set(fx,.40,fz);group.add(basin)
 const roundBed=new T.Mesh(new T.RingGeometry(1.47,1.58,40),granite)
 roundBed.rotation.x=-Math.PI/2;roundBed.position.set(fx,.32,fz);group.add(roundBed)
 column(iron,fx,.89,fz,.38,1.09)
 column(granite,fx,1.42,fz,.67,.16)
 column(iron,fx,1.56,fz,.17,.28)
 for(let k=0;k<8;k++){
  const offset=(k-3.5)*.36,half=Math.sqrt(1.45**2-offset**2)
  occupied(fx,fz+offset,half*2,.36,.48,true)
 }
 occupied(fx,fz,.76,.76,1.7)
 const water=new T.Mesh(new T.CylinderGeometry(.065,.18,.82,10),material(0x9aced5,{roughness:.24,transparent:true,opacity:.72}))
 water.position.set(fx,1.84,fz);water.visible=false;group.add(water)

 const tint=new T.Color(),shadowMeshes=[]
 for(const [mat,parts] of batches){
  const byGeometry=new Map()
  for(const part of parts){
   const same=byGeometry.get(part.geometry)??[];same.push(part);byGeometry.set(part.geometry,same)
  }
  for(const [geometry,parts] of byGeometry){
   const mesh=new T.InstancedMesh(geometry,mat,parts.length)
   mesh.receiveShadow=true
   parts.forEach(({matrix,color},i)=>{
    mesh.setMatrixAt(i,matrix)
    if(color!==undefined)mesh.setColorAt(i,tint.setHex(color))
   })
   group.add(mesh);shadowMeshes.push(mesh)
  }
 }
 let pump=0,shadows=false
 return {
  operate(){pump=8},
  update(dt,time,range){
   pump=Math.max(0,pump-dt)
   water.visible=pump>0;water.scale.y=.72+.26*Math.sin(time*9)
   const near=range<62
   if(near)for(const {swing,phase} of swings)swing.rotation.x=.10*Math.sin(time*1.13+phase)
   if(near===shadows)return false
   shadows=near;for(const mesh of shadowMeshes)mesh.castShadow=near
   return true
  }
 }
}
