import {BufferAttribute,BufferGeometry,Line,LineBasicMaterial,Mesh,MeshBasicMaterial,Vector3} from 'three'
import {blastRadius,grenadePreview} from './grenade-flight.js'
import {equipmentTrace} from './equipment-contact.js'

export function grenadeGuide(scene,boxes){
 const geometry=new BufferGeometry(),positions=new BufferAttribute(new Float32Array(3*42),3)
 geometry.setAttribute('position',positions)
 const path=new Line(geometry,new LineBasicMaterial({color:0xffd291,transparent:true,opacity:.85,depthWrite:false}))
 path.frustumCulled=false
 const count=48
 const directions=Array.from({length:count+1},(_,i)=>{
  const a=i/count*Math.PI*2
  return new Vector3(Math.cos(a),0,Math.sin(a))
 })
 const circle=new BufferGeometry(),areaPoints=new BufferAttribute(new Float32Array((count+2)*3),3)
 const rim=new BufferGeometry(),rimPoints=new BufferAttribute(new Float32Array((count+1)*3),3)
 circle.setAttribute('position',areaPoints)
 circle.setIndex(Array.from({length:count},(_,i)=>[0,i+2,i+1]).flat())
 rim.setAttribute('position',rimPoints)
 const area=new Mesh(circle,new MeshBasicMaterial({color:0xde8750,transparent:true,opacity:.17,depthWrite:false}))
 const ring=new Line(rim,new LineBasicMaterial({color:0xffc083,transparent:true,opacity:.62,depthWrite:false}))
 area.frustumCulled=ring.frustumCulled=false
 area.add(ring)
 scene.add(path,area)
 const trace=equipmentTrace(boxes,[],[])
 const hide=()=>{path.visible=area.visible=false}
 hide()
 let last=-Infinity
 return {
  hide,
  show(now,options){
   if(now-last<78&&path.visible)return
   last=now
   let samples=0
   const endpoint=grenadePreview(options,point=>{positions.setXYZ(samples++,point.x,point.y,point.z)})
   positions.needsUpdate=true;geometry.setDrawRange(0,samples)
   for(const [i,axis] of directions.entries()){
    const radius=trace(endpoint,axis,blastRadius).distance
    areaPoints.setXYZ(i+1,axis.x*radius,0,axis.z*radius)
    rimPoints.setXYZ(i,axis.x*radius,.007,axis.z*radius)
   }
   areaPoints.needsUpdate=rimPoints.needsUpdate=true
   area.position.copy(endpoint);area.position.y+=.028
   path.visible=area.visible=true
  }
 }
}
