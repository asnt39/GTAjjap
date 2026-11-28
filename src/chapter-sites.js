const point=(x,z,label,y=.083,yaw)=>({x,z,y,label,yaw})
export const chapterLand=[[-146,-99,136,209]]
export const chapterRoads=[[-143,-94.5,140,149],[-143,-94.5,176,185]]
export const parking={
 bounds:[-138,-111,149.5,174],entry:point(-134,174.6,'Spire Parking 남쪽 진입로'),
 lookout:point(-121,171.8,'Spire Parking · 옥상',6.483),recovery:point(-130,174.8,'주차타워 입구',.083,-.72),
 getaway:[point(-114.55,170.3,'옥상',6.10),point(-114.55,159,'동쪽 경사로',4.28),point(-114.9,154.4,'동쪽 램프 출구',3.54),
  point(-118.2,152.36,'2층 동쪽',3.283),point(-124.05,152.37,'2층 중앙',3.283),
  point(-130.5,152.44,'2층 서쪽',3.283),point(-133.6,154.35,'서쪽 램프 입구',3.04),
  point(-134.4,160,'서쪽 경사로',2.125),point(-134.4,171.6,'서쪽 경사로',.26),point(-134.4,178.0,'주차타워 출구'),
  point(-131,180.5,'Garden Crossing'),point(-95,180.5,'Spire Street'),
  point(-90.2,176.4,'Spire Street'),point(-90.2,148.5,'Basin Crossing'),
  point(-95,144.6,'Basin Crossing'),point(-135.6,144.6,'정비소 진입로')]
}
export const workshop={bounds:[-110,-101,150,166],bay:point(-105.4,152.8,'Keel Motor Works 정비 구역'),
 desk:point(-104.4,162.6,'정비 기록대'),entry:point(-105.5,149.6,'Keel Motor Works',.083,Math.PI)}
const deckRise=3.2
export const parkingFloors=[.083,.083+deckRise,.083+deckRise*2]
export const parkingRamps=[
 {bounds:[-137.6,-131.2,152.8,172.7],bottom:0,northHigh:true},
 {bounds:[-117.2,-111.3,152.8,172.7],bottom:1,northHigh:false}
]
export const inBounds=([w,e,n,s],x,z)=>x>=w&&x<=e&&z>=n&&z<=s
export function rampHeight(ramp,z){
 const [,,n,s]=ramp.bounds
 const fraction=Math.max(0,Math.min(1,(z-n)/(s-n)))
 return parkingFloors[ramp.bottom]+deckRise*(ramp.northHigh?1-fraction:fraction)
}
export function parkingLevel(x,z,feet,up=.24){
 if(!inBounds(parking.bounds,x,z))return null
 const ramp=parkingRamps.find(r=>x>=r.bounds[0]&&x<=r.bounds[1])
 if(!ramp)return parkingFloors.filter(y=>y<=feet+up).at(-1)??parkingFloors[0]
 const rise=rampHeight(ramp,z)
 if(ramp.bottom>0&&feet<parkingFloors[ramp.bottom]-.22)return parkingFloors[0]
 return rise<=feet+up?rise:parkingFloors[0]
}
export const parkingInterior=(x,z)=>inBounds(parking.bounds,x,z)

const upper=3.083
export const hotel={
 bounds:[-141,-118,188,206],floor:upper,
 stairs:[{bounds:[-139.7,-136.3,191.8,200.8],northHigh:false},
  {bounds:[-122.5,-119.1,191.8,200.8],northHigh:false}],
 entry:point(-130.3,187.5,'Brine Hotel 정문',.083,Math.PI),
 lobby:point(-130.3,192.6,'Brine Hotel 접수대'),
 room:point(-127.75,193.6,'Brine Hotel · 205호',upper),
 witness:point(-127.75,194.7,'운송업자',upper),
 alley:point(-115.8,191.35,'Brine Hotel 직원 골목'),
 shelter:point(-114.2,202.7,'호텔 뒤편 하역 출입구')
}
hotel.route=[
 point(-127.75,196.35,'205호 문',upper),point(-127.75,199.93,'2층 복도',upper),
 point(-120.8,201.45,'직원 계단 상단',upper),point(-120.8,200.65,'직원 계단',upper),
 point(-120.8,192.10,'직원 계단 하단'),point(-120.8,190.97,'직원 출입구'),
 point(-117.46,190.97,'직원 골목'),hotel.alley
]
const stairNodes=hotel.stairs.flatMap(stair=>Array.from({length:7},(_,i)=>{
 const [w,e,n,s]=stair.bounds,z=n+(s-n)*i/6
 return point((w+e)/2,z,'계단',stairRise(stair,z,3))
}))
hotel.nav=[...stairNodes,hotel.entry,hotel.lobby,point(-134,191.35,'계단 연결 통로'),
 point(-138,191.35,'서쪽 계단 아래'),point(-138,201.45,'서쪽 계단 위',upper),
 point(-135.25,201.4,'2층 서쪽 홀',upper),...hotel.route,hotel.shelter,
 point(-115.65,199.3,'서비스 골목'),point(-114.2,197.1,'야외 엄폐물')]

function stairRise(stair,z,height){
 const [,,n,s]=stair.bounds
 const t=Math.max(0,Math.min(1,(z-n)/(s-n)))
 return .083+height*(stair.northHigh?1-t:t)
}

export function buildingLevel(site,x,z,feet,up=.24){
 if(!inBounds(site.bounds,x,z))return null
 const stair=site.stairs.find(s=>inBounds(s.bounds,x,z))
 const height=site.floor-.083
 const y=stair?stairRise(stair,z,height):site.floor
 return y<=feet+up+.001?y:.083
}
export const facilityFloor=(x,z,feet,up=.24)=>parkingLevel(x,z,feet,up)??buildingLevel(hotel,x,z,feet,up)

export const marina={
 meetup:point(100.1,146.5,'Meridian Marina 대합 부두',.12,Math.PI/2),
 berth:point(118.3,190.6,'Salt Quay 하역 부두',.12,Math.PI/2),
 storage:point(131.1,194.05,'Salt Quay 화물 보관소',.12),
 check:point(98.6,146.7,'마리나 화물 확인대',.12)
}
export const cargoPier=[114,124,189,192.6]
export const cargoPlatform=[123.5,138.9,187.9,199.6]
