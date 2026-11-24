import {MathUtils,PointLight,RepeatWrapping,SRGBColorSpace,TextureLoader} from 'three'
import {loftFloor,roomGround,rowPoint,rowRoomAt,rowRooms} from './market-row-plan.js'
import {streamDistrict} from './district-stream.js'
import {loadDistrictProps} from './works-detail.js'

const insideProps=[
 [
  ['painted_wooden_cabinet_02',-.98,roomGround,-3.60,1.43,.93,.52,0,true],
  ['painted_wooden_table',-1.79,roomGround,2.40,1.19,.76,.71,0,true],
  ['painted_wooden_chair_02',-2.56,roomGround,2.65,.43,.88,.49,-.38,true],
  ['planter_pot_clay',-1.40,.843,2.45,.28,.28,.28,0]
 ],[
  ['sofa_02',-2.75,roomGround,-.39,1.52,.85,.78,0,true],
  ['painted_wooden_table',-2.29,loftFloor,-2.81,1.37,.76,.79,0,true],
  ['painted_wooden_chair_02',-1.14,loftFloor,-3.19,.46,.88,.52,.40,true],
  ['planter_pot_clay',-3.14,loftFloor,-2.10,.44,.38,.44,0,true]
 ]
]
export const rowStreetProps=[
 ['market-row/planter_pot_clay',-74.85,.083,50.40,.61,.56,.61,0,true],
 ['market-row/planter_pot_clay',-74.85,.083,55.60,.61,.56,.61,0,true],
 ['market-row/water_manhole_cover',-70.5,.005,47.9,.65,.017,.65,.6],
 ['market-row/water_manhole_cover',-65.1,.005,86.4,.64,.017,.64,.2],
 ['market-row/metal_trash_can',-43.7,.083,46.6,.50,.79,.50,.34,true]
]
const quayProps=[
 ['market-row/metal_trash_can',8.55,.083,14.45,.49,.77,.49,.25,true],
 ['market-row/water_manhole_cover',3.36,.005,28.46,.63,.017,.63,0],
 ['works/barrel_03',16.45,.008,-17.3,.59,.89,.59,0,true],
 ['works/barrel_03',16.62,.008,-18.07,.56,.85,.56,.72,true]
]
const yardProps=[
 ['market-row/rollershutter_door',-119.11,.105,42.4,2.86,2.58,.13,Math.PI/2],
 ['works/barrel_03',-118.08,.083,39.37,.54,.83,.54,0,true],
 ['works/barrel_03',-117.95,.083,40.04,.54,.83,.54,.83,true]
]

const floorMaps=['color','normalgl','roughness']
async function loadFloor(name){
 const loader=new TextureLoader()
 const results=await Promise.allSettled(floorMaps.map(key=>loader.loadAsync('/assets/market-row/'+name+'-'+key+'.webp')))
 const maps=results.filter(entry=>entry.status==='fulfilled').map(entry=>entry.value)
 if(maps.length!==floorMaps.length){for(const map of maps)map.dispose();return null}
 maps[0].colorSpace=SRGBColorSpace
 for(const map of maps){map.wrapS=map.wrapT=RepeatWrapping;map.anisotropy=4;map.needsUpdate=true}
 return maps
}

function roomProps(room,index){
 return insideProps[index].map(([file,x,y,z,w,h,d,angle,solid])=>{
  const p=rowPoint(room,x,z)
  // Footprints use world dimensions; turn the model on its existing local front.
  return ['market-row/'+file,p.x,y,p.z,d,h,w,angle+room.turn*Math.PI/2,solid,w,d]
 })
}

export function buildRowDetail(scene,boxes,storeFloor,rowBoards,street){
 const lamp=new PointLight(0xffd8a1,0,7,2)
 lamp.visible=false;scene.add(lamp)
 const roomGroups=rowRooms.map(room=>scene.getObjectByName(room.title+' interior'))
 const surfaces=[storeFloor,rowBoards]
 const fallback=[[street[2],street[3],null],[null,null,null]]
 const pending=new Set(),installed=new Set()
 function setMaps(index,maps){
  const material=surfaces[index]
  const [color,normal,roughness]=maps
  material.map=color;material.normalMap=normal;material.roughnessMap=roughness;material.needsUpdate=true
 }
 const makeStream=(point,items,title,enter,leave,index)=>({point,update:streamDistrict({
  enterDistance:enter,leaveDistance:leave,
  async load(){
   const detail=await loadDistrictProps('/assets/',items,title)
   const maps=index===undefined?null:await loadFloor(index===0?'concrete':'timber')
   return {...detail,maps,dispose(){detail.dispose();for(const tex of maps??[])tex.dispose()}}
  },
  attach(detail){scene.add(detail.group);for(const box of detail.footprints)pending.add(box);if(detail.maps)setMaps(index,detail.maps)},
  detach(detail){
   detail.group.removeFromParent()
   for(const box of detail.footprints){
    pending.delete(box)
    if(installed.delete(box)){const i=boxes.indexOf(box);if(i>=0)boxes.splice(i,1)}
   }
   if(detail.maps)setMaps(index,fallback[index])
  }
 })})
 const streams=[...rowRooms.map((room,index)=>makeStream(room,roomProps(room,index),room.title+' furniture',19,28,index)),
  makeStream({x:-65,z:65},rowStreetProps,'Market Row street fittings',40,54),
  makeStream({x:10,z:5},quayProps,'Breakwater and West Quay street fittings',36,53),
  makeStream({x:-120,z:42},yardProps,'West Bank Works fittings',33,46)]
 return (pos,dt)=>{
  let changed=false
  for(const stream of streams)if(stream.update(Math.hypot(pos.x-stream.point.x,pos.z-stream.point.z)))changed=true
  for(const box of pending){
   if(pos.x>box[0]-.36&&pos.x<box[1]+.36&&pos.z>box[2]-.36&&pos.z<box[3]+.36&&pos.y<(box[4]+.20)&&pos.y+1.8>=(box[6]??0))continue
   pending.delete(box);installed.add(box);boxes.push(box)
  }
  for(const [index,room] of rowRooms.entries()){
   const group=roomGroups[index]
   if(!group)continue
   const visible=Math.hypot(pos.x-room.x,pos.z-room.z)<27
   if(group.visible!==visible){group.visible=visible;changed=true}
  }
  const room=rowRoomAt(pos.x,pos.z)
  const light=room?.id==='lodging'?(pos.y>2?{x:-54.20,y:4.82,z:82.5}:{x:-57.45,y:2.21,z:81.8}):{x:-79.8,y:2.75,z:53}
  lamp.position.set(light.x,light.y,light.z)
  lamp.intensity=MathUtils.damp(lamp.intensity,room?13:0,8,dt)
  lamp.visible=lamp.intensity>.035
  return changed
 }
}
