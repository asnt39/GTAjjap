import {SplineCurve,Vector2} from 'three'
import {within} from './street-plan.js'

// The north wing fits between the houses and the existing shop frontage.
export const foundryGardenPlots=[[-181,-158.1,38.1,57.85],[-172.4,-158.1,28.8,38.1]]
export const foundryPicnicTerrace=[-171.9,-167.23,30.65,36.65]
export const foundryPlayCourt=[-164.94,-158.45,30.15,37.55]
export const foundryFountain={x:-167.8,z:48.5,radius:3.16}
export const foundryAmenities=[
 {id:'foundry-picnic-seat',x:-169.25,z:32.25,seatZ:32.96,seatY:.55,seatFace:0,fromZ:-1,title:'Foundry Garden',label:'피크닉 테이블에 앉기',pose:'sit'},
 {id:'foundry-garden-seat',x:-174.27,z:55.6,seatZ:56.29,seatY:.63,fromZ:-1,title:'Foundry Garden',label:'텃밭 옆 벤치에 앉기',pose:'sit'},
 {id:'foundry-water',x:-174.73,z:46.85,title:'Foundry Garden',label:'음수대에서 물 마시기',targetY:1.13,pose:'drink',heal:8,range:1.2}
]

const alignments=[
 [2.18,[[-166.15,28.8],[-166.15,33],[-166.15,37],[-165.9,41.2],[-163.3,45.4],[-163.3,49.5],[-161.3,54],[-161.7,57.85]]],
 [2.22,[[-181,46.1],[-177.1,46.1],[-173.6,45.65],[-169.3,45.65],[-166.15,46.15],[-163.3,47],[-160.8,47.5],[-158.1,47.5]]],
 [1.62,[[-173.6,45.65],[-174.1,49],[-174.1,52.8],[-172.64,55.65],[-168.4,56],[-165.33,54.18],[-161.3,54]]],
 [1.48,[[-177.1,46.1],[-177.1,50],[-177.1,54],[-177.1,57.85]]],
 [1.56,[[-166.15,35.7],[-164.4,35.7],[-163.4,35.7]]],
 [1.64,[[-166.15,31.7],[-167.25,31.7],[-169.25,31.7]]]
]
export const foundryWalks=alignments.map(([width,route])=>{
 const curve=new SplineCurve(route.map(([x,z])=>new Vector2(x,z)))
 return {width,points:curve.getPoints((route.length-1)*8).map(p=>[p.x,p.y])}
})

export const inFoundryGarden=(x,z)=>foundryGardenPlots.some(plot=>within(plot,x,z))

function onWalk(x,z,{width,points}){
 const r=width/2
 for(let i=1;i<points.length;i++){
  const [a,b]=points[i-1],[c,d]=points[i],dx=c-a,dz=d-b
  if(x<Math.min(a,c)-r||x>Math.max(a,c)+r||z<Math.min(b,d)-r||z>Math.max(b,d)+r)continue
  const t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz)))
  if((x-a-t*dx)**2+(z-b-t*dz)**2<=r*r)return true
 }
 return false
}

export function foundryGardenSurface(x,z){
 if(!inFoundryGarden(x,z))return null
 const {x:fx,z:fz,radius}=foundryFountain
 if(within(foundryPicnicTerrace,x,z)||within(foundryPlayCourt,x,z)||
  (x-fx)**2+(z-fz)**2<=radius**2||foundryWalks.some(walk=>onWalk(x,z,walk)))return 'concrete'
 return 'grass'
}
