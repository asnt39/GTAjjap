const point=(x,z)=>({x,z})

export const clubPlan={
 title:'The Lantern Room',
 bounds:{west:-180,east:-156,north:82.4,south:92.6},
 entry:point(-168,94.25),
 vip:point(-159.8,90.5),
 recovery:point(-160.88,90.87),
 exit:point(-160.2,80.9),
 street:point(-170.2,94.55),
 bar:point(-175.2,88.30),
 dance:point(-168.2,88.7),
 toilets:point(-157.4,84.75),
 utility:point(-176.69,83.73),
 actors:{
  jack:point(-170.95,94.15),
  reception:point(-170,91.35),
  victor:point(-158.7,90.5),
  ambushCover:[point(-165.0,88.3),point(-169.6,87.8),point(-165.0,91.1)],
  streetAmbush:[point(-146,98.1),point(-180.2,98.1),point(-153.15,91)]
 },
 routes:{
  vip:[point(-168,91),point(-166.7,89.5),point(-163.8,90.35),point(-161.4,90.35),point(-159.8,90.5)],
  rear:[point(-160.2,89.2),point(-160.2,86),point(-160.2,83.8),point(-160.2,80.9)],
  street:[
   [point(-148.25,94.65),point(-154.05,93.40),point(-154.43,82.17),point(-156.82,80.85)],
   [point(-181.36,94.78),point(-181.23,82.04),point(-175.92,81.29),point(-164.35,81.10)],
   [point(-153.15,84.4),point(-154.3,81),point(-158.4,80.9)]
  ]
 }
}

const {west,east,north,south}=clubPlan.bounds
const door=(x,z,angle,cos,title,style)=>({x,z:z-cos*.90,width:1.8,depth:1.96,cos,sin:0,angle,title,door:style})

export const clubDoors=[
 door(clubPlan.entry.x,south,0,1,clubPlan.title,'pair'),
 door(clubPlan.exit.x,north,Math.PI,-1,'The Lantern Room · 서비스 출구','auto')
]

export const clubGround=.09
export const clubStage={west:-173.1,east:-165.7,north:north+.18,rear:84.50,front:85.26,height:.34,steps:3}
export const clubService={west:-163.2,east:east-.18,north:north+.18,south:87.55}

export function insideClub(x,z){
 return x>west&&x<east&&z>north-.11&&z<south+.11
}

export function clubFloorAt(x,z){
 const {west,east,north,rear,front,height,steps}=clubStage
 if(x<west||x>east||z<north||z>=front)return clubGround
 if(z<rear)return height
 const progress=(front-z)/(front-rear)
 return clubGround+(height-clubGround)*Math.ceil(progress*steps)/steps
}

export function clubCeilingAt(x,z){
 return x>=clubService.west&&z<=clubService.south?3.16:4.11
}
