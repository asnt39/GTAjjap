const point=(x,z,label,y=.083)=>({x,z,y,label})
export const chapterLand=[[-146,-99,136,209]]
export const chapterRoads=[[-143,-94.5,140,149],[-143,-94.5,176,185]]
export const parking={
 bounds:[-138,-111,149.5,174],entry:point(-134,174.6,'Spire Parking 남쪽 진입로'),
 lookout:point(-121,171.8,'Spire Parking · 옥상',6.483),recovery:point(-130,174.8,'주차타워 입구'),
 getaway:[point(-114.55,170.3,'옥상',6.10),point(-114.55,159,'동쪽 경사로',4.28),point(-114.9,154.4,'동쪽 램프 출구',3.54),
  point(-118.2,152.36,'2층 동쪽',3.283),point(-124.05,152.37,'2층 중앙',3.283),
  point(-130.5,152.44,'2층 서쪽',3.283),point(-133.6,154.35,'서쪽 램프 입구',3.04),
  point(-134.4,160,'서쪽 경사로',2.125),point(-134.4,171.6,'서쪽 경사로',.26),point(-134.4,178.0,'주차타워 출구'),
  point(-131,180.5,'Garden Crossing'),point(-95,180.5,'Spire Street'),
  point(-90.2,176.4,'Spire Street'),point(-90.2,148.5,'Basin Crossing'),
  point(-95,144.6,'Basin Crossing'),point(-135.6,144.6,'정비소 진입로')]
}
export const workshop={bounds:[-110,-101,150,166],bay:point(-105.4,152.8,'Keel Motor Works 정비 구역'),
 desk:point(-104.4,162.6,'정비 기록대'),entry:point(-105.5,149.6,'Keel Motor Works')}
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
