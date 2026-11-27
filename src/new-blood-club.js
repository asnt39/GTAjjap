import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {clubGround,clubPlan,clubService,clubStage,insideClub} from './new-blood-club-plan.js'

const surface=(color,roughness=.78,options={})=>new T.MeshStandardMaterial({color,roughness,...options})
const mapped=(map,color,roughness=.84)=>surface(color,roughness,map?{map}:{})
const glow=(color,intensity=.72)=>surface(color,.44,{emissive:color,emissiveIntensity:intensity})

export function buildNewBloodClub(scene,addCollider,maps={}){
 const {west,east,north,south}=clubPlan.bounds
 const width=east-west,depth=south-north,xCenter=(west+east)/2,zCenter=(north+south)/2
 const ceiling=4.11, wall=.24, roof=4.35
 const building=new T.Group(), outside=new T.Group(), interior=new T.Group()
 building.name=clubPlan.title;outside.name='The Lantern Room frontage';interior.name='The Lantern Room interior'
 building.add(outside,interior);scene.add(building)
 const brick=mapped(maps.architecture?.[0],0x827273),plaster=mapped(maps.architecture?.[1],0x827778)
 const tile=mapped(maps.street?.[2],0x827578,.49), stone=surface(0x797875),iron=surface(0x292d31,.52,{metalness:.42})
 const brass=surface(0xb79a64,.32,{metalness:.52}),wood=surface(0x594035,.43),woodLight=surface(0x734b37,.42)
 const oak=surface(0x3b242c,.52),leather=surface(0x602433,.53),curtain=surface(0x492136,.98)
 const porcelain=surface(0xbeb9aa,.27),black=surface(0x14161a,.59),glass=surface(0x254d49,.30,{metalness:.31})
 const amber=glow(0xffb766,.85),citrus=glow(0xf2c076,.55),aqua=glow(0x53b8aa,.76),red=glow(0xba536e,.66)
 const trims=new Map(),unit=new T.BoxGeometry()
 const materialRepeats=new Set([brick,plaster,tile])
 function piece(geometry,material,group=interior){
  const materials=trims.get(group)??new Map(),parts=materials.get(material)??[]
  parts.push(geometry);materials.set(material,parts);trims.set(group,materials)
 }
 function box(material,x,y,z,w,h,d,group=interior){
  const mesh=unit.clone()
  if(materialRepeats.has(material)){
   const uv=mesh.attributes.uv
   for(let i=0;i<uv.count;i++){
    const face=Math.floor(i/4),horizontal=face<2?d:w,vertical=face===2||face===3?d:h
    uv.setXY(i,uv.getX(i)*horizontal/2.8,uv.getY(i)*vertical/2.8)
   }
  }
  piece(mesh.scale(w,h,d).translate(x,y,z),material,group)
 }
 function cylinder(material,x,y,z,top,bottom,height,segments=10,group=interior){
  piece(new T.CylinderGeometry(top,bottom,height,segments).translate(x,y,z),material,group)
 }
 function segment(material,a,b,height,radius,group=interior){
  const start=new T.Vector3(a[0],height,a[1]),end=new T.Vector3(b[0],height,b[1])
  const delta=end.clone().sub(start)
  const geometry=new T.CylinderGeometry(radius,radius,delta.length(),6)
  geometry.applyQuaternion(new T.Quaternion().setFromUnitVectors(T.Object3D.DEFAULT_UP,delta.normalize()))
  piece(geometry.translate(...start.lerp(end,.5).toArray()),material,group)
 }
 function volume(material,left,right,back,front,top,bottom=0,group=interior){
  box(material,(left+right)/2,(top+bottom)/2,(back+front)/2,right-left,top-bottom,front-back,group)
  addCollider(left,right,back,front,top,false,bottom)
 }
 function floor(material,left,right,back,front,top){
  box(material,(left+right)/2,top-.023,(back+front)/2,right-left,.046,front-back)
 }
 function sign(group,line,x,y,z,w,h,{reverse=false,ink='#f4d49b',base='#27262c',decoration=false}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*h/w)
  const ctx=canvas.getContext('2d'),mid=canvas.height*.5
  ctx.fillStyle=base;ctx.fillRect(0,0,768,canvas.height)
  ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.strokeRect(7,7,754,canvas.height-14)
  ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle'
  ctx.font=`${decoration?600:700} ${Math.round(canvas.height*.45)}px ${decoration?'Georgia, serif':'sans-serif'}`
  ctx.fillText(line,384,mid+1,decoration?614:690)
  if(decoration){
   for(const x of [55,713]){
    ctx.beginPath();ctx.moveTo(x,mid-16);ctx.lineTo(x+13,mid);ctx.lineTo(x,mid+16);ctx.lineTo(x-13,mid);ctx.closePath();ctx.stroke()
   }
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace
  const panel=new T.Mesh(new T.PlaneGeometry(w,h),surface(0xffffff,.65,{map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.36}))
  panel.position.set(x,y,z);panel.rotation.y=reverse?Math.PI:0;group.add(panel)
 }

 // Street wall, service lane, and roof. Door cuts meet the same anchors as the animated leaves.
 for(const [left,right] of [[west,west+wall],[east-wall,east]]){
  volume(brick,left,right,north,south,roof,0,outside)
 }
 const entryX=clubPlan.entry.x,exitX=clubPlan.exit.x
 for(const [z,doorX] of [[south,entryX],[north,exitX]]){
  for(const [left,right] of [[west+wall,doorX-.90],[doorX+.90,east-wall]]){
   volume(brick,left,right,z-wall/2,z+wall/2,roof,0,outside)
  }
  volume(brick,doorX-.90,doorX+.90,z-wall/2,z+wall/2,roof,2.68,outside)
  for(const side of [-1,1]){
   box(iron,doorX+side*.947,1.37,z,.095,2.63,.31,outside)
   box(brass,doorX+side*.955,1.37,z+(z===south?.16:-.16),.039,2.60,.032,outside)
  }
  box(iron,doorX,2.69,z,2.08,.095,.30,outside)
 }
 volume(iron,west-.15,east+.15,north-.17,south+.19,roof+.06,ceiling,outside)
 box(stone,xCenter,4.46,south+.05,width+.46,.21,.50,outside)
 box(iron,xCenter,4.69,south-.18,width,.39,.31,outside)
 box(iron,xCenter,4.81,south-.16,width+.22,.12,.38,outside)
 for(const x of [-175.7,-161.2]){
  box(iron,x,4.66,84.35,2.42,.60,1.41,outside)
  box(stone,x,4.98,84.35,2.52,.13,1.51,outside)
  for(let i=0;i<9;i++)box(black,x-.87+i*.217,4.68,85.07,.119,.28,.029,outside)
 }

 // A narrow brass marquee and the brick pilasters mark the public entrance from the road.
 box(black,entryX,3.52,south+.25,7.32,1.00,.30,outside)
 box(brass,entryX,3.04,south+.41,7.51,.06,.11,outside)
 box(brass,entryX,4.00,south+.41,7.51,.06,.11,outside)
 sign(outside,clubPlan.title.toUpperCase(),entryX,3.53,south+.41,7.18,.88,{decoration:true})
 box(iron,entryX,2.92,south+.61,5.74,.17,1.35,outside)
 box(brass,entryX,2.898,south+1.29,5.78,.062,.058,outside)
 box(amber,entryX,2.876,south+1.24,5.22,.032,.062,outside)
 for(const x of [-178.75,-174.8,-172.05,-163.95,-161.2,-157.25]){
  box(plaster,x,2.24,south+.115,.29,4.09,.18,outside)
  box(stone,x,.37,south+.19,.44,.52,.31,outside)
  box(stone,x,4.26,south+.18,.45,.19,.33,outside)
 }
 for(const x of [-176.85,-173.42,-162.58,-159.15]){
  box(iron,x,2.19,south+.145,1.92,1.66,.15,outside)
  box(glass,x,2.19,south+.225,1.73,1.47,.045,outside)
  box(citrus,x,2.75,south+.252,1.53,.036,.04,outside)
  for(const dx of [-.48,0,.48])box(iron,x+dx,2.19,south+.26,.042,1.47,.056,outside)
  box(stone,x,1.32,south+.24,1.99,.14,.30,outside)
 }
 for(const dx of [-1.35,1.35]){
  box(black,entryX+dx,1.96,south+.22,.30,.88,.21,outside)
  box(amber,entryX+dx,1.96,south+.335,.128,.62,.037,outside)
 }
 for(const x of [-174.6,-172.5,-163.2,-161.1]){
  cylinder(iron,x,.54,93.69,.045,.05,.90,9,outside)
  cylinder(brass,x,1.01,93.69,.055,.069,.07,9,outside)
  addCollider(x-.055,x+.055,93.64,93.74,1.05)
 }
 for(const [left,right] of [[-174.6,-172.5],[-163.2,-161.1]]){
  segment(curtain,[left,93.69],[right,93.69],.83,.026,outside)
  addCollider(left,right,93.65,93.73,1.05)
 }
 sign(outside,'SERVICE EXIT',exitX,2.90,north-.136,1.72,.263,{reverse:true,ink:'#bee1c7',base:'#243733'})
 box(aqua,exitX,2.72,north-.185,1.12,.051,.07,outside)
 box(iron,exitX,3.04,north-.40,2.52,.17,.73,outside)
 volume(iron,-158.53,-156.95,81.62,82.18,.91,0,outside)
 box(stone,-157.74,.94,81.90,1.68,.10,.65,outside)

 // Patron circulation runs straight through the lobby and around the dance floor.
 floor(tile,west+wall*.5,east-wall*.5,north-wall*.5,south+wall*.5,clubGround)
 floor(wood,xCenter-3.4,xCenter+2.8,90.85,south+.08,clubGround+.006)
 for(let row=0;row<8;row++)for(let col=0;col<12;col++){
  const x=-172.53+col*.76,z=85.37+row*.69
  if(x+.75>-163.24||z+.68>90.91)continue
  floor((row+col)%2?wood:woodLight,x,x+.748,z,z+.678,clubGround+.008)
 }
 for(const x of [-172.6,-163.35])box(brass,x,clubGround+.013,88.19,.043,.012,5.69)
 for(const z of [85.34,91.04])box(brass,-167.97,clubGround+.013,z,9.25,.012,.045)
 for(const z of [89.25,91.12])box(iron,xCenter,4.01,z,12.4,.12,.14)
 for(const x of [-171.9,-169.9,-167.9,-165.9,-163.9]){
  box(iron,x,3.79,89.25,.26,.31,.28)
  box(x===-167.9?amber:aqua,x,3.62,89.25,.17,.038,.17)
 }
 const reception=clubPlan.actors.reception
 volume(wood,reception.x-.62,reception.x+.54,91.85,92.42,1.08,clubGround)
 box(brass,reception.x-.04,1.12,92.13,1.25,.07,.63)
 box(amber,reception.x-.39,1.31,92.13,.11,.29,.11)
 box(black,reception.x+.25,1.2,92.16,.29,.11,.21)
 for(const [x,z] of [[-165.70,88.25],[-170.25,87.10]]){
  volume(iron,x-.19,x+.19,z-.19,z+.19,ceiling,clubGround)
  box(brass,x,.94,z,.44,.042,.44)
  box(amber,x,2.55,z,.08,.46,.42)
 }

 // Walnut counter, glazed shelves and upholstered seats at the bar.
 volume(wood,-178.85,-172.15,86.01,86.73,1.04,clubGround)
 box(black,-175.5,1.09,86.37,6.91,.09,.92)
 box(brass,-175.5,.98,86.763,6.82,.05,.05)
 box(brass,-175.5,.30,86.86,6.35,.045,.047)
 for(let i=0;i<16;i++)box(i%2===0?oak:woodLight,-178.52+i*.40,.58,86.741,.127,.70,.024)
 volume(oak,-179.78,-179.28,83.02,86.43,2.91,clubGround)
 for(const [left,right] of [[-179.08,-177.55],[-175.82,-172.82]]){
  const x=(left+right)/2,span=right-left
  volume(iron,left,right,84.82,85.10,2.79,1.39)
  box(glass,x,2.08,85.116,span-.16,1.23,.03)
  for(const y of [1.52,1.96,2.4]){
   box(woodLight,x,y,85.16,span-.12,.073,.21)
   box(amber,x,y+.063,85.27,span-.19,.038,.038)
   for(let i=0;i<Math.floor(span/.34);i++){
    const x=left+.21+i*.34,h=.19+.035*((i*3+Math.round(y*10))%4),z=85.185
    const material=[glass,leather,citrus,aqua,plaster][(i+Math.round(y*6))%5]
    cylinder(material,x,y+.048+h/2,z,.054,.071,h,7)
    cylinder(brass,x,y+h+.065,z,.041,.046,.047,7)
   }
  }
 }
 for(const x of [-178.15,-176.75,-174.95,-173.25]){
  cylinder(iron,x,.211,87.17,.19,.22,.22)
  cylinder(iron,x,.53,87.17,.044,.051,.53)
  cylinder(leather,x,.81,87.17,.214,.212,.11,12)
  addCollider(x-.20,x+.20,86.97,87.37,.86)
 }

 // The stage has three shallow treads and a dark backdrop with art-deco lighting.
 const stage=clubStage,run=(stage.front-stage.rear)/stage.steps,rise=(stage.height-clubGround)/stage.steps
 floor(black,stage.west,stage.east,stage.north,stage.rear,stage.height)
 const riserTop=stage.height-.045
 box(oak,(stage.west+stage.east)/2,(riserTop+clubGround)/2,(stage.north+stage.rear)/2,
  stage.east-stage.west,riserTop-clubGround,stage.rear-stage.north)
 for(let i=0;i<stage.steps;i++){
  const z=stage.front-i*run,y=clubGround+rise*(i+1)
  box(oak,(stage.west+stage.east)/2,(y+clubGround)/2,z-run/2,stage.east-stage.west,y-clubGround,run)
  box(brass,(stage.west+stage.east)/2,y+.003,z-.022,stage.east-stage.west,.012,.028)
 }
 for(const x of [stage.west,stage.east])addCollider(x-.018,x+.018,stage.north,stage.rear,stage.height,false,clubGround)
 for(let i=0;i<26;i++){
  const x=stage.west+.16+i*.284
  box(curtain,x,2.13,north+.29,.35,3.52,i%2?.17:.25)
 }
 box(brass,(stage.west+stage.east)/2,3.91,north+.43,stage.east-stage.west,.07,.11)
 for(const x of [-172.82,-166.04]){
  volume(iron,x-.21,x+.21,83,83.62,1.67,.34)
  for(const y of [.71,1.23])box(black,x,y,83.63,.33,.31,.026)
 }
 volume(wood,-172.05,-169.58,82.90,83.44,1.27,stage.height)
 box(iron,-170.82,1.30,83.17,2.57,.07,.63)
 for(const x of [-171.52,-170.07]){
  cylinder(black,x,1.35,83.18,.18,.18,.048,16)
  cylinder(red,x,1.38,83.18,.048,.048,.012,12)
 }

 // Cut-throughs from the VIP to the dance floor and the service corridor are kept clear.
 const vipWall=-162.77,serviceWall=clubService.west,serviceSouth=clubService.south,wcWall=-158.63
 for(const [back,front] of [[87.55,88.82],[91.85,92.47]]){
  volume(oak,vipWall-.085,vipWall+.085,back,front,ceiling,clubGround)
  for(let z=back+.13;z<front;z+=.24)box(brass,vipWall-.095,2.16,z,.034,3.88,.034)
 }
 for(const [left,right] of [[vipWall,-161.13],[-159.28,east-wall*.5]]){
  volume(plaster,left,right,serviceSouth-.10,serviceSouth+.10,ceiling,clubGround)
 }
 volume(plaster,serviceWall-.11,serviceWall+.11,north+wall*.5,86.38,ceiling,clubGround)
 volume(black,serviceWall,clubService.east,north+wall*.5,serviceSouth,3.24,3.16)
 floor(oak,vipWall+.13,east-.12,serviceSouth+.11,south-.11,clubGround+.005)
 for(const [left,right,back,front] of [[-162.12,-156.91,91.92,92.45],[-157.02,-156.19,88.58,89.96]]){
  volume(leather,left,right,back,front,.53,clubGround)
  box(leather,(left+right)/2,.77,front-.08,right-left,.53,.17)
 }
 volume(wood,-157.80,-156.80,88.26,89.14,.69,clubGround)
 box(brass,-157.30,.714,88.70,1.09,.065,.97)
 cylinder(amber,-157.44,.92,88.62,.086,.069,.31,9)
 box(black,-159.09,2.92,91.98,3.24,.41,.14)
 sign(interior,'PRIVATE LOUNGE',-159.09,2.92,91.897,3.18,.37,{reverse:true})

 // Utility shelves, marked exit corridor and an open, screened restroom.
 volume(plaster,-179.8,-177.48,84.64,84.81,ceiling,clubGround)
 volume(plaster,-175.90,-174.65,84.64,84.81,ceiling,clubGround)
 volume(plaster,-174.77,-174.56,82.55,84.81,ceiling,clubGround)
 volume(iron,-179.10,-178.27,83.04,84.45,1.9,clubGround)
 for(const y of [.73,1.20,1.68])box(woodLight,-178.68,y,83.74,.95,.081,1.40)
 volume(plaster,wcWall-.085,wcWall+.085,82.52,83.78,3.16,clubGround)
 volume(plaster,wcWall-.085,wcWall+.085,85.72,serviceSouth,3.16,clubGround)
 volume(tile,-157.27,-157.10,82.55,83.59,2.13,clubGround)
 floor(tile,wcWall+.085,east-.12,82.52,serviceSouth-.105,clubGround+.006)
 volume(porcelain,-156.81,-156.30,84.25,85.44,.88,clubGround)
 box(glass,-156.276,1.56,84.85,.04,1.04,1.14)
 for(const z of [84.53,85.12])box(iron,-156.48,.96,z,.18,.052,.061)
 cylinder(porcelain,-157.67,.398,83.09,.22,.16,.62,12)
 box(porcelain,-157.67,.61,82.83,.45,.61,.22)
 addCollider(-157.91,-157.43,82.71,83.36,.92,false,clubGround)
 sign(interior,'WC',-158.25,2.21,85.71,.63,.31,{reverse:true})
 sign(interior,'EXIT',exitX,2.91,82.584,1.44,.30,{ink:'#c4e0cd',base:'#254139'})
 for(const z of [83.54,86.04])box(aqua,exitX,3.14,z,.14,.037,1.32)

 for(const [group,materials] of trims)for(const [material,geometries] of materials){
  const combined=mergeGeometries(geometries)
  const mesh=new T.Mesh(combined,material)
  mesh.castShadow=group===outside;mesh.receiveShadow=true;group.add(mesh)
  for(const geometry of geometries)geometry.dispose()
 }
 unit.dispose()

 function lamp(x,y,z,color,intensity,range){
  const light=new T.PointLight(color,intensity,range,2)
  light.position.set(x,y,z);light.visible=false;building.add(light)
  return light
 }
 const entrance=lamp(entryX,2.56,93.24,0xffc384,19,5)
 const bar=lamp(-175.1,2.69,86.95,0xffad79,42,10)
 const dance=lamp(-168.1,3.01,88.12,0x8ccfc1,56,12)
 const lounge=lamp(-159.11,2.45,90.46,0xff958e,29,8)
 const corridor=lamp(exitX,2.66,85.42,0x8dd7bf,16,7)
 function show(node,visible){
  if(node.visible===visible)return false
  node.visible=visible;return true
 }
 interior.visible=false
 return (player,elapsed=0,low=false)=>{
  const entered=insideClub(player.x,player.z)
  const gap=Math.hypot(Math.max(west-player.x,player.x-east,0),Math.max(north-player.z,player.z-south,0))
  const near=gap<11,lit=entered||gap<3
  const pulse=1+.12*Math.sin(elapsed*2.2)+.055*Math.sin(elapsed*4.6)
  dance.intensity=56*pulse;red.emissiveIntensity=.65*pulse;aqua.emissiveIntensity=.72*pulse
  let changed=show(interior,near)
  changed=show(entrance,!low&&gap<20)||changed
  changed=show(bar,lit)||changed
  changed=show(dance,lit)||changed
  changed=show(lounge,lit&&!low)||changed
  return show(corridor,lit&&!low)||changed
 }
}
