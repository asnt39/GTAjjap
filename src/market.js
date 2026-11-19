import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {streamDistrict} from './district-stream.js'
import {insidePremises,marketCollision,roomParts,premises} from './market-plan.js'

export function buildMarket(scene,addCollider){
 marketCollision(addCollider)
 // The low-detail shells and collision boundaries remain available during streaming.
 const shell=new T.Group()
 const walls=[]
 for(const p of premises){
  const parts=[...roomParts(p),[p.x,3.53,-51,11.5,.18,10.6],[p.x,.025,-51,11,.05,10],[p.x,2.98,-46,2,1.08,.24]]
  const tint=new T.Color(p.color)
  for(const [x,y,z,w,h,d] of parts){
   const g=new T.BoxGeometry(w,h,d).translate(x,y,z)
   const colors=new Float32Array(g.attributes.position.count*3)
   for(let k=0;k<colors.length;k+=3)tint.toArray(colors,k)
   g.setAttribute('color',new T.BufferAttribute(colors,3));walls.push(g)
  }
 }
 const envelope=new T.Mesh(mergeGeometries(walls),new T.MeshStandardMaterial({vertexColors:true,roughness:.88}))
 envelope.receiveShadow=true;shell.add(envelope);walls.forEach(g=>g.dispose())
 const ground=new T.Mesh(new T.PlaneGeometry(62,32),new T.MeshStandardMaterial({color:0x706d65}))
 ground.rotation.x=-Math.PI/2;ground.position.set(-66,-.025,-42);shell.add(ground);scene.add(shell)
 const roomLight=new T.PointLight(0xffffff,0,11,2)
 roomLight.visible=false;scene.add(roomLight)
 let detailView,litRoom,signalUntil=0
 const stream=streamDistrict({
  enterDistance:47,leaveDistance:68,
  load:()=>import('./market-detail.js').then(m=>m.marketDetail()),
  attach:detail=>{detailView=detail;detail.signalTest(performance.now()<signalUntil);scene.add(detail.group)},
  detach:detail=>{detailView=null;scene.remove(detail.group)}
 })
 function update(p){
  if(signalUntil && performance.now()>signalUntil){detailView?.signalTest(false);signalUntil=0}
  const room=insidePremises(p.x,p.z)
  if(room!==litRoom){
   litRoom=room
   roomLight.visible=Boolean(room)
   roomLight.intensity=room?16:0
   if(room){roomLight.color.setHex(room.light);roomLight.position.set(room.x,3.05,-51)}
  }
  const range=Math.hypot(Math.max(0,p.x+40,-96-p.x),p.z+39)
  const shadow=range<55,shadowChanged=envelope.castShadow!==shadow
  envelope.castShadow=shadow
  return stream(range)||shadowChanged
 }
 return {update,testSignal(){
  signalUntil=performance.now()+6000
  detailView?.signalTest(true)
 }}
}
