import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {station, stationColliders, atStation} from './custody.js'

export function buildPoliceStation(scene,addCollider){
 const {x,left,right,front,back,ceiling}=station
 stationColliders(addCollider)
 const root=new T.Group(),inside=new T.Group(),outside=new T.Group(),batches=new Map()
 root.name='Tide Market police post'
 root.add(inside,outside);scene.add(root)
 const mat=(color,extra)=>new T.MeshStandardMaterial({color,roughness:.79,...extra})
 const maps=new T.TextureLoader()
 const brick=mat(0xa4adb0),concrete=mat(0x989c96),plaster=mat(0xb1b5a3)
 for(const [skin,path] of [[brick,'architecture/factory_brick'],[concrete,'street/concrete_pavement_02-Diffuse']]){
  maps.load('/assets/'+path+'.webp',tex=>{
   tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,1)
   skin.map=tex;skin.needsUpdate=true
  },undefined,()=>{})
 }
 const iron=mat(0x27383a,{metalness:.56}),wood=mat(0x624c36),linen=mat(0x8e9181)
 const light=mat(0xf0dec3,{emissive:0xffdfb5,emissiveIntensity:1.2})
 const glass=mat(0x536969,{metalness:.38,roughness:.28})
 function mesh(part,group,material,x,y,z){
  const key=batches.get(group)??new Map(),list=key.get(material)??[]
  list.push(part.translate(x,y,z));key.set(material,list);batches.set(group,key)
 }
 const box=(group,material,x,y,z,w,h,d)=>mesh(new T.BoxGeometry(w,h,d),group,material,x,y,z)
 const wall=(x,z,w,d)=>box(outside,brick,x,ceiling*.5,z,w,ceiling,d)
 wall(left+.11,(front+back)/2,.22,10);wall(right-.11,(front+back)/2,.22,10)
 wall(x,back+.12,6.4,.24)
 for(const side of [-1,1]){
  wall(x+side*2.07,front-.09,2.26,.18)
  box(outside,iron,x+side*2.05,1.8,front+.018,1.77,1.01,.06)
  box(outside,glass,x+side*2.05,1.8,front+.06,1.58,.83,.045)
  for(const dx of [-.38,0,.38])box(outside,iron,x+side*2.05+dx,1.8,front+.092,.045,.86,.04)
  box(outside,concrete,x+side*2.05,1.31,front+.1,1.87,.09,.28)
 }
 box(outside,concrete,x,2.94,front-.09,1.88,.76,.18)
 box(outside,concrete,x,ceiling+.098,-51,6.63,.196,10.32)
 box(outside,iron,x,2.61,front+.44,3.52,.11,.97)
 box(outside,light,x,2.536,front+.22,1.45,.035,.18)
 box(outside,concrete,x,.045,-51,6.4,.09,10)
 box(outside,concrete,x,.041,front+.33,1.93,.082,.77)
 const badge=document.createElement('canvas')
 badge.width=512;badge.height=128
 const ctx=badge.getContext('2d')
 ctx.fillStyle='#263d45';ctx.fillRect(0,0,512,128);ctx.fillStyle='#cfbc8e';ctx.fillRect(14,13,484,3)
 ctx.fillStyle='#f1e5cd';ctx.font='bold 43px sans-serif';ctx.textAlign='center';ctx.fillText('HARBOR POLICE',256,72)
 ctx.font='600 18px sans-serif';ctx.fillText('TIDE MARKET POST',256,103)
 const tex=new T.CanvasTexture(badge);tex.colorSpace=T.SRGBColorSpace
 mesh(new T.PlaneGeometry(3.13,.78),outside,mat(0xffffff,{map:tex}),x,3.02,front+.018)
 // A steel partition with a distinct sliding grille and a recessed bench.
 for(let i=0;i<30;i++){
  const gx=left+.28+i*.198
  mesh(new T.CylinderGeometry(.018,.018,2.98,8),inside,iron,gx,1.55,-51.73)
 }
 for(const y of [.15,1.17,3.04])box(inside,iron,x,y,-51.73,6.16,.056,.065)
 for(const off of [-.71,.71])box(inside,iron,x+off,1.55,-51.60,.07,2.98,.075)
 box(inside,iron,x+.66,1.13,-51.53,.18,.25,.066)
 for(const dx of [left+.24,right-.24])box(inside,plaster,dx,1.49,-51,.035,2.82,9.55)
 box(inside,plaster,x,1.49,back+.248,5.95,2.82,.025)
 for(const z of [-49.3,-54.2]){
  box(inside,iron,x,3.21,z,1.84,.14,.33);box(inside,light,x,3.125,z,1.7,.03,.23)
 }
 box(inside,iron,-95.33,.38,-54.15,1.05,.17,2.78)
 box(inside,linen,-95.33,.50,-54.15,1.015,.118,2.69)
 box(inside,plaster,-95.33,.59,-55.15,.65,.10,.43)
 for(const z of [-55.46,-52.84])box(inside,iron,-95.33,.26,z,1.05,.39,.055)
 box(inside,wood,-95.33,.96,-49.66,1.25,.13,1.96)
 box(inside,iron,-95.61,.47,-49.66,.65,.85,1.77)
 for(const z of [-50.2,-49.75,-49.30])box(inside,iron,-95.24,.9,z,.04,.072,.28)
 box(inside,linen,-95.15,1.037,-49.8,.34,.022,.48)
 box(inside,iron,-95.62,1.12,-50.19,.33,.23,.23)
 for(const [group,materials] of batches)for(const [material,parts] of materials){
  const item=new T.Mesh(mergeGeometries(parts),material)
  item.castShadow=item.receiveShadow=true
  group.add(item);parts.forEach(g=>g.dispose())
 }
 const lamp=new T.PointLight(0xffe0b5,13,8,2)
 lamp.visible=false;root.add(lamp)
 return p=>{
  const inRoom=atStation(p.x,p.z)
  const nearby=Math.hypot(p.x-x,p.z+51)<32
  const changed=inside.visible!==nearby||lamp.visible!==inRoom
  inside.visible=nearby;lamp.visible=inRoom
  if(inRoom)lamp.position.set(x,3,p.z<-51.73?-54:-49.4)
  return changed
 }
}
