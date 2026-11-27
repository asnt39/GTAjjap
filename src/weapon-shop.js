import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {insideWeaponShop,localShopParts,weaponShopCollision,shopSite,shopApron,oldShopWorkshop} from './weapon-shop-plan.js'

export function buildWeaponShop(scene,addCollider){
 weaponShopCollision(addCollider)
 const sign=document.createElement('canvas')
 sign.width=640;sign.height=84
 const pen=sign.getContext('2d')
 pen.fillStyle='#223130';pen.fillRect(0,0,640,84)
 pen.fillStyle='#ebce96';pen.font='bold 47px sans-serif';pen.textAlign='center'
 pen.fillText('BREAKWATER ARMS',320,60)
 const lettering=new T.CanvasTexture(sign);lettering.colorSpace=T.SRGBColorSpace
 const paint={
  wall:{color:0x555d57},metal:{color:0x252d2a},floor:{color:0xa39d8e},wood:{color:0x764c34},
  glass:{color:0x385653,metalness:.6},sign:{map:lettering},light:{color:0xf4daa4,emissive:0xffc677,emissiveIntensity:1.1}
 }
 const parts=[...localShopParts,[-56.96,1.34,-46,.11,2.61,.22,'metal'],[-55.04,1.34,-46,.11,2.61,.22,'metal']]
 // Low-poly display silhouettes frame the aisle without blocking the counter.
 for(const x of [-58.12,-53.88]){
  for(const z of [-51.1,-50.1,-49.1]){
   parts.push([x,1.42,z,.28,.095,.63,'metal'],[x,1.33,z+.15,.18,.14,.15,'metal'])
   parts.push([x,1.33,z-.26,.09,.08,.18,'wood'])
  }
 }
 const shelf=new T.Group();shelf.name='Breakwater Arms'
 for(const [kind,options] of Object.entries(paint)){
  const batch=parts.filter(p=>p[6]===kind).map(([x,y,z,w,h,d])=>new T.BoxGeometry(w,h,d).translate(x,y,z))
  const mesh=new T.Mesh(mergeGeometries(batch),new T.MeshStandardMaterial({roughness:.83,...options}))
  mesh.receiveShadow=true;shelf.add(mesh)
  batch.forEach(g=>g.dispose())
 }
 shelf.rotation.y=shopSite.angle;shelf.position.set(shopSite.x+51,0,shopSite.z-56)
 const [left,right,north,south]=shopApron
 const apron=new T.Mesh(new T.BoxGeometry(right-left,.072,south-north),new T.MeshStandardMaterial({color:0x8e897d,roughness:.96}))
 apron.position.set((left+right)/2,.044,(north+south)/2);apron.receiveShadow=true;scene.add(apron)
 const workshop=new T.Group(),old=oldShopWorkshop,materials=new Map()
 function workshopPart(x,y,z,w,h,d,color){
  const list=materials.get(color)??[]
  list.push(new T.BoxGeometry(w,h,d).translate(x,y,z));materials.set(color,list)
 }
 workshopPart(old.x,1.69,old.z,6.04,3.38,10.24,0x706c5c)
 workshopPart(old.x,3.43,old.z,6.3,.13,10.56,0x4b5551)
 workshopPart(old.x,1.36,old.front+.03,3.65,2.52,.18,0x4b5754)
 for(let i=0;i<11;i++)workshopPart(old.x,.25+i*.21,old.front+.13,3.63,.039,.022,0x71817b)
 workshopPart(old.x,2.86,old.front+.16,4.35,.53,.25,0x545849)
 workshopPart(old.x,2.51,old.front+.54,5.65,.12,.99,0x7a7357)
 for(const [color,parts] of materials){
  const mesh=new T.Mesh(mergeGeometries(parts),new T.MeshStandardMaterial({color,roughness:.91}))
  mesh.receiveShadow=true;workshop.add(mesh);parts.forEach(g=>g.dispose())
 }
 scene.add(workshop)
 const light=new T.PointLight(0xffdeb0,16,9,2)
 light.position.set(shopSite.x,3,shopSite.z);light.visible=false
 scene.add(shelf,light)
 return p=>{
  const visible=insideWeaponShop(p.x,p.z)
  if(visible===light.visible)return false
  light.visible=visible
  return true
 }
}
