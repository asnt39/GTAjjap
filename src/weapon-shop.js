import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {insideWeaponShop,shopParts,weaponShopCollision} from './weapon-shop-plan.js'

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
 const parts=[...shopParts]
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
 const light=new T.PointLight(0xffdeb0,16,9,2)
 light.position.set(-56,3,-51);light.visible=false
 scene.add(shelf,light)
 return p=>{
  const visible=insideWeaponShop(p.x,p.z)
  if(visible===light.visible)return false
  light.visible=visible
  return true
 }
}
