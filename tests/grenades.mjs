import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Vector3} from 'three'
import {grenadeFlight,grenadeBlast,kickVehicle} from '../src/grenade-flight.js'
import {newDrive,clearPose} from '../src/driving.js'

test('a thrown grenade bounces off a wall and detonates only once',()=>{
 const wall=[[-3,3,-3,-2.8,2.8]]
 const flight=grenadeFlight({origin:new Vector3(0,1.3,0),heading:0,pitch:0,boxes:wall})
 let count=0,x=0
 for(let i=0;i<180;i++)if(flight.update(1/60)){count++;x=flight.position.x}
 assert.equal(count,1)
 assert.equal(x,0)
 assert(flight.position.z>-2.8)
 assert(flight.position.y>=.08)
})

test('cover blocks the blast and vehicle displacement stays on clear ground',()=>{
 const center=new Vector3(0,.12,0)
 const target=new Vector3(0,1,-3)
 assert(grenadeBlast([])(center,target)>0)
 assert.equal(grenadeBlast([[-1,1,-2,-1.8,2]])(center,target),0)
 assert.equal(grenadeBlast([])(center,new Vector3(0,0,-20)),0)
 const car=newDrive({x:1.4,z:0,heading:0,width:2,length:4,height:1.4})
 const wall=[[2.67,3.1,-3,3,2]]
 kickVehicle(car,center,.85,wall,[car])
 assert(car.dents)
 assert(car.x>1.4&&car.x<=1.67)
 assert(clearPose(car,wall,true,true))
})

test('indoor throws ricochet from the ceiling and blasts on furniture still reach the room',()=>{
 const flight=grenadeFlight({origin:new Vector3(0,1.6,0),heading:0,pitch:-.5,boxes:[],ceiling:()=>2.5})
 let peak=0
 for(let i=0;i<120;i++){flight.update(1/60);peak=Math.max(peak,flight.position.y)}
 assert(peak>2.2&&peak<=2.42)
 const cover=[[-1,1,-1,1,.85,true]]
 assert(grenadeBlast(cover)(new Vector3(0,.93,0),new Vector3(0,1.2,-2))>0)
})

test('preview and actual landing use the same fixed step and the expanded damage limit',async()=>{
 const {grenadePreview,blastRadius}=await import('../src/grenade-flight.js')
 const options={origin:new Vector3(1,1.54,7),heading:.24,pitch:-.38,boxes:[[-6,6,-2.9,-2.4,2.2]]}
 const points=[]
 const end=grenadePreview(options,p=>points.push(p.clone()))
 const actual=grenadeFlight(options)
 for(let i=0;i<600&&!actual.update(1/120);i++){}
 assert(end.distanceTo(actual.position)<1e-10)
 assert(points.length>35&&points.length<=42)
 assert.equal(blastRadius,6)
 assert(grenadeBlast([])(new Vector3(0,.15,0),new Vector3(5,.15,0))>0)
 assert.equal(grenadeBlast([])(new Vector3(0,.15,0),new Vector3(blastRadius,.15,0)),0)
})
