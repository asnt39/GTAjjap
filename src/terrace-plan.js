import {westBankFrontages} from './west-bank-plan.js'
// Each frontage faces the street. Leave the gap at Clock Court and the
// passages at z=67 and z=96 open to pedestrians.
export const rows=[
 [-79.7,37,7.6,8.4,8.5,0,Math.PI/2],[-79.8,53,7,7.2,8.4,1,Math.PI/2],[-80.1,72,8,8.8,8.2,2,Math.PI/2],
 [-79.9,91,8,6.8,8.6,1,Math.PI/2],[-79.4,110,8,8.6,8.2,0,Math.PI/2],
 [-56.8,47,7.1,7.8,7.2,2,-Math.PI/2],[-56.7,65,7.4,7.2,7.5,0,-Math.PI/2],
 [-56.9,83,7.7,8.2,7.8,1,-Math.PI/2],[-57.1,96,7.2,6.5,7.5,2,-Math.PI/2],
 [-45.8,65,6.1,8,6.8,1,Math.PI/2],[-45.7,88,6.2,7.4,6.6,0,Math.PI/2],
 [-25.4,34.5,7.2,7.1,4.2,2,-Math.PI/2],[-25.3,52,7.6,8.5,4.4,0,-Math.PI/2],
 [-23.2,68.5,7.8,7.0,8.2,1,-Math.PI/2],[-23.3,101.6,7.8,7.1,8.0,2,-Math.PI/2],
 [-68,120,10,6.8,7.7,1,Math.PI],[-53.3,120,10.1,7.6,7.8,0,Math.PI],[-37.2,120,10.8,6.4,8.1,2,Math.PI],
 ...westBankFrontages
]

const conversions=[
 [0,'Gull Street Bakery','cafe','hinge'],[2,'Northlight Books','shop','pair'],[3,'Pilots’ Rest','home','hinge'],
 [6,'Clockmaker','shop','hinge'],[9,'The Reading Room','office','slide'],[15,'South Row Kitchen','cafe','auto'],
 [19,'Letterpress Studio','workshop','slide'],[23,'West Bank Grocer','shop','auto'],
 [28,'Foundry Flats','home','hinge'],[29,'Pump House Café','cafe','pair'],
 [30,'Parcel Office','office','auto'],[34,'Coopers’ Rooms','home','hinge'],
 [37,'Ferry Surveyors','office','pair'],[5,'Clock Court Cooperative','shop','pair'],[8,'South Row Social Club','cafe','hinge'],
 [10,'Clock Street Dispatch','office','auto'],[11,'Lantern Corner Café','cafe','pair'],[12,'Clock Row Tailors','shop','hinge'],[31,'West Bank Service Office','office','slide'],
 [42,'Yard Stores','workshop','slide'],[43,'Canvas Loft','workshop','pair']
]
export const terraceRooms=conversions.map(([index,title,use,door])=>{
 const [x,z,width,height,depth,,angle]=rows[index]
 return {index,title,use,door,x,z,width,height,depth,angle,cos:Math.round(Math.cos(angle)),sin:Math.round(Math.sin(angle))}
})
export function terracePoint(r,x,z){return {x:r.x+x*r.cos+z*r.sin,z:r.z-x*r.sin+z*r.cos}}
export function terraceBounds(r,x,z,w,d,bottom,top){
 const p=terracePoint(r,x,z),rx=(Math.abs(r.cos)*w+Math.abs(r.sin)*d)/2,rz=(Math.abs(r.sin)*w+Math.abs(r.cos)*d)/2
 return [p.x-rx,p.x+rx,p.z-rz,p.z+rz,top,false,bottom]
}
export const terraceCeiling=3.22
export function insideTerrace(x,z){
 return terraceRooms.some(r=>Math.abs((x-r.x)*r.cos-(z-r.z)*r.sin)<r.width/2&&Math.abs((x-r.x)*r.sin+(z-r.z)*r.cos)<r.depth/2)
}
