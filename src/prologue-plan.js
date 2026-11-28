export const transferYard={x:14.5,z:-36,radius:4.4,label:'Quay Transfer'}
export const yardCover=[
 {x:16.7,z:-33.1,w:1.04,d:2.05,h:1.07},
 {x:16.55,z:-25.1,w:.88,d:1.28,h:1.29},
 {x:12.05,z:-46.1,w:.63,d:1.11,h:.86}
]
export const transferFoot={x:14.4,z:-31.6,radius:2.05,label:'화물 인수 지점'}
export const cargoManifest={x:yardCover[0].x,y:yardCover[0].h+.10,z:yardCover[0].z,radius:1.72,label:'화물 명세서'}
export const worksBay={x:-129.05,z:28.1,radius:3.2,label:'West Bank Works'}
export const worksClear={x:-129,z:37.9,radius:5.5,label:'생산동'}
export const worksRear={x:-119.1,z:41.5}
export const worksDoor={x:-129.19,z:worksRear.z,title:'생산동 작업문',width:14,depth:20.02,angle:Math.PI/2,cos:0,sin:1,door:'auto'}
export const worksLoft={west:-138.45,east:-133.55,north:30.3,south:37.8,height:2.24}
export const worksStair={west:-137.55,east:-135.55,north:37.8,south:43.98,steps:12}
export const worksRoof=6.26
export const detention={x:-125.1,z:46.33,radius:2,label:'Theo'}
export const extraction={x:-112,z:47.6,radius:3.8,label:'정비동 집결지'}
export const safeHouse={x:-36.4,z:85.25,radius:6,label:'Clock Street 집결지'}
export function worksUpper(x,z,y,airborne=false){
 const stair=worksStair,loft=worksLoft,h=loft.height
 if(x>=stair.west&&x<=stair.east&&z>=stair.north&&z<=stair.south){
  const rise=h*Math.floor((stair.south-z)*stair.steps/(stair.south-stair.north)+1)/stair.steps
  return !airborne||y>=rise-.03?Math.min(h,rise):.083
 }
 if(x>=loft.west&&x<=loft.east&&z>=loft.north&&z<=loft.south&&y>=h-.22)return h
 return .083
}
