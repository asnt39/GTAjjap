import {CanvasTexture,Group,Sprite,SpriteMaterial} from 'three'
import {createCharacter} from './character.js'
import {blendPose} from './room-client.js'

export function roomPresence(scene){
 const avatars=new Map()
 function remove(id){
  const view=avatars.get(id)
  avatars.delete(id)
  scene.remove(view.root)
  view.marker.material.map.dispose()
  view.marker.material.dispose()
  view.character?.dispose()
 }
 function create(peer){
  const root=new Group()
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=48
  const ctx=canvas.getContext('2d')
  ctx.fillStyle='#1b2d34';ctx.fillRect(0,0,128,48)
  ctx.fillStyle='#ffe3b7';ctx.textAlign='center';ctx.font='bold 25px sans-serif';ctx.fillText('P'+peer.number,64,33)
  const marker=new Sprite(new SpriteMaterial({map:new CanvasTexture(canvas),depthWrite:false}))
  marker.position.y=2.15;marker.scale.set(.8,.3,1)
  root.add(marker);scene.add(root)
  const view={root,marker};avatars.set(peer.id,view)
  createCharacter().then(character=>{
   if(avatars.get(peer.id)!==view){character.dispose();return}
   view.character=character;root.add(character.root)
  }).catch(err=>console.error('Remote character failed to load',err))
  return view
 }
 return {
  clear(){for(const id of avatars.keys())remove(id)},
  update(frame,self,dt){
   if(!frame)return false
   const {latest,a,b,fraction}=frame
   let shadows=false
   for(const id of avatars.keys())if(!latest.players.has(id)){remove(id);shadows=true}
   for(const peer of latest.players.values()){
    if(peer.id===self)continue
    const earlier=a.players.get(peer.id),later=b.players.get(peer.id)??peer
    const p=blendPose(earlier?.pose,later.pose,fraction,'face',['x','z','y','speed','crouch','reach','land'])
    const view=avatars.get(peer.id)??create(peer)
    shadows ||= p.speed>.05||p.jump!==null||p.crouch>.01||view.root.visible!==p.visible
    view.root.visible=p.visible
    view.root.position.set(p.x,p.y,p.z);view.root.rotation.y=p.face
    if(p.visible)view.character?.update(dt,p.speed,{jump:p.jump,land:p.land,
     vehicle:p.side?{side:p.side,crouch:p.crouch,reach:p.reach}:null})
   }
   return shadows
  }
 }
}
