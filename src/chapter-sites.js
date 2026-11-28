const point=(x,z,label,y=.083,yaw)=>({x,z,y,label,yaw})
export const chapterLand=[[-195,-99,136,209]]
export const chapterRoads=[[-191,-94.5,141,149],[-191,-94.5,176,185],[-191,-184,144,181]]
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
export const parkingStair={bounds:[-141.4,-137.65,152.65,171],bottom:0,northHigh:true}
export const parkingLanding=[-141.4,-137.6,150.7,152.65]
function parkingWalkLevel(x,z,feet,up){
 if(inBounds(parkingStair.bounds,x,z)){
  const rise=rampHeight(parkingStair,z)
  return rise<=feet+up?rise:.083
 }
 if(inBounds(parkingLanding,x,z))return feet+up>=parkingFloors[1]?parkingFloors[1]:.083
 return parkingLevel(x,z,feet,up)
}

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
 const onDeck=!site.decks||site.decks.some(bounds=>inBounds(bounds,x,z))
 const y=stair?stairRise(stair,z,height):onDeck?site.floor:.083
 return y<=feet+up+.001?y:.083
}
export const facilityFloor=(x,z,feet,up=.24)=>parkingWalkLevel(x,z,feet,up)??buildingLevel(hotel,x,z,feet,up)??buildingLevel(factory,x,z,feet,up)

export const marina={
 meetup:point(100.1,146.5,'Meridian Marina 대합 부두',.12,Math.PI/2),
 berth:point(118.3,190.6,'Salt Quay 하역 부두',.12,Math.PI/2),
 storage:point(131.1,194.05,'Salt Quay 화물 보관소',.12),
 check:point(98.6,146.7,'마리나 화물 확인대',.12)
}
export const cargoPier=[114,124,189,192.6]
export const cargoPlatform=[123.5,138.9,187.9,199.6]

export const factory={
 bounds:[-184,-150,151,175.3],
 floor:3.283,
 stairs:[{bounds:[-163.4,-159.4,160.8,171.8],northHigh:false}],
 decks:[[-159.4,-150.05,152.2,173.8],[-163.4,-159.4,171.8,174.5]],
 rally:point(-170.1,149.12,'Rivet Foundry 북측 하역장',.083,Math.PI),
 front:point(-169.4,152.4,'북측 하역문'),
 flank:point(-182.9,163.2,'서쪽 자재 반입구'),
 rear:point(-155.75,174.18,'남쪽 하역문'),
 panel:point(-167.7,165.65,'작업장 배전반'),
 upper:point(-154.1,156.44,'상층 사무실',3.283),
 dispatch:point(-153.25,154.32,'배차실 유선 통신기',3.283),
 getaway:[point(-155.2,179.3,'남쪽 하역장'),point(-140.5,179.3,'Basin Crossing'),
  point(-110,179.3,'Garden Crossing'),point(-96.2,179.4,'Spire Street'),
  point(-90.6,175.5,'Spire Street'),point(-90.6,149.4,'Basin Crossing'),point(-95.2,145.6,'항만 간선도로'),point(-151.2,145.6,'항만 합류로')]
}
const stair=factory.stairs[0]
factory.nav=[factory.rally,factory.front,factory.flank,factory.rear,factory.panel,factory.upper,factory.dispatch,
 point(-178.6,163.0,'자재 반입 통로'),point(-173.5,156.1,'생산실 북쪽'),
 point(-171,166.3,'생산실 중앙'),point(-161.2,158.7,'계단 지상 입구'),
 ...Array.from({length:8},(_,i)=>{
  const z=stair.bounds[2]+(stair.bounds[3]-stair.bounds[2])*i/7
  return point(-161.4,z,'상층 통로 계단',stairRise(stair,z,3.2))
 }),
 point(-161.4,172.7,'상층 계단 입구',3.283),point(-154.4,172.7,'상층 남쪽',3.283),
 point(-154.4,165.4,'상층 동쪽',3.283)
]

export const hideout={
 bounds:[-179,-154,187,205],entry:point(-166.5,185.6,'Breakwater Yard 입구',.083,Math.PI),
 parking:point(-160.2,191.25,'실내 차량 보관 구역'),desk:point(-168.7,194.85,'작전 수첩 및 대화'),
 rest:point(-175.2,199.55,'휴게실 체력 회복'),armory:point(-165.85,201.2,'장비 관리대'),
 meeting:point(-167.6,196.4,'작전 회의실'),maya:point(-161.8,196,'정비 구역'),leon:point(-173.35,195.75,'휴게실 앞')
}

export const chapterSights=[
 {...parking.entry,tag:'PK',title:'Spire Parking',name:'주차타워 안내',body:'서쪽 차로로 2층에 올라간 뒤 북쪽 통로를 건너면 옥상 차로가 이어집니다.'},
 {...workshop.entry,tag:'MW',title:'Keel Motor Works',name:'정비소 안내',body:'정비 구역의 노란 표시 안에 차량을 정차하면 수리할 수 있습니다.'},
 {...hotel.entry,tag:'BH',title:'Brine Hotel',name:'호텔 안내',body:'정문은 접수대와 서쪽 계단, 직원 출입구는 동쪽 골목과 연결됩니다.'},
 {...marina.meetup,tag:'MM',title:'Meridian Marina',name:'마리나 안내',body:'보트는 대합 부두 양쪽에 있습니다. 입수한 경우 노란 사다리를 이용하십시오.'},
 {...marina.berth,tag:'SQ',title:'Salt Quay',name:'하역 부두 안내',body:'북쪽 사다리와 서쪽 하역 부두를 통해 보관소에 진입할 수 있습니다.'},
 {...factory.rally,tag:'RF',title:'Rivet Foundry',name:'공장 안내',body:'북측 하역문 외에 서쪽 자재문과 남쪽 차량 출입구가 있습니다.'},
 {...hideout.entry,tag:'BY',title:'Breakwater Yard',name:'작업실 안내',body:'공장 임무를 완료하면 휴게실, 차량 보관 구역과 장비 관리대를 이용할 수 있습니다.'}
]
