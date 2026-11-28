import {districtCitizens} from './district-citizens.js'
import {weaponVendor} from './weapon-shop-plan.js'

export const people=[
 {id:'foreman',name:'Daniel Cole',legacyName:'강 반장',role:'부두 반장',x:-7.4,z:21.4,pace:.94,temper:'defend',lines:['지금은 하역 중입니다. 선박을 보시려면 부두길로 돌아가시죠.','교대 명단을 맞춰 보는 중입니다. 무슨 일이십니까?']},
 {id:'merchant',name:'Elena Reed',legacyName:'윤서',model:'crew',height:1.68,epilogue:'교대 배는 제시간에 떠났어요. 그런데 이 도장 좀 보세요. 우리 사무실 것이 아니에요.',purchase:'여기 있어요. 조심히 다녀오세요.',insufficient:'잔액이 조금 모자라세요.',role:'시장 점원',x:-8.9,z:5.4,pace:1.18,temper:'flee',lines:['어서 오세요. 오늘 배에 실을 물건이면 지금 챙겨 드릴게요.','커피는 아직 따뜻해요. 천천히 보고 가세요.']},
 {id:'courier',name:'Jack Bennett',legacyName:'도현',model:'mariner',height:1.77,opening:'출항표에서 마지막 교대가 빠졌어. 시장에 봉투 하나 전해 줄래?',role:'배송 기사',x:7.6,z:16.2,pace:1.43,temper:'avoid',lines:['나 지금 정문 찍고 부두로 가. 같은 방향이면 같이 걷자.','잠깐, 송장 한 장만 찾고. 아까 주머니에 넣었는데.']},
 {id:'engineer',name:'Ellis Torres',legacyName:'미라',role:'설비 담당',x:12.1,z:-13,pace:1.02,temper:'defend',lines:['와이어 소리 들리죠? 바람 바뀌면 저 소리부터 달라져요.','무전은 짧게 주세요. 장갑 끼면 채널 돌리기가 영 불편해서요.']},
 {id:'regular',name:'Arthur Hayes',legacyName:'선우',role:'부두 단골',x:-8.3,z:-47,pace:.78,temper:'flee',lines:['저 창고 턱에 걸터앉아서 낚시도 했지. 지금은 저만큼 물러났네.','조금만 더 있다 가지. 불 켜지는 부두도 볼 만한데.']}
]
people.push(
 {id:'constable',name:'Owen Price',legacyName:'한 순경',role:'항만 순찰',officer:true,patrol:[{x:8.1,z:29.5}],x:8,z:24,lines:['잠시만요. 차량 통로를 비워 주십시오.','정문 순찰 중입니다. 분실물은 시장 쪽 사무실에서 접수합니다.']},
 {id:'sergeant',name:'Marcus Shaw',legacyName:'박 경장',role:'항만 경비',officer:true,station:true,x:-8,z:-30,lines:['교차로 확인 끝. 지나가셔도 됩니다.','작업선 들어옵니다. 노란 선 안쪽으로 서세요.']},
 {id:'tide-clerk',name:'Morgan',role:'조위 기록원',x:-47,z:-51,variant:3,station:true,lines:['기록지를 보시겠어요? 굵은 눈금 하나가 한 시간입니다.','썰물 때 잰 수치라 따로 적어 두었습니다. 다음 관측은 해진 뒤예요.']}
)
for(const person of people.slice(5))Object.assign(person,{pace:1.1,temper:person.officer?'defend':'avoid'})

const districtPolice=[
 {id:'quay-patrol',name:'Nora Finch',role:'서부 부두 순찰',x:12.1,z:-24,patrol:[{x:12.2,z:-19}]},
 {id:'north-patrol',model:'patrol',name:'Hugo Clarke',role:'북부 하역장 순찰',x:7.7,z:-82,patrol:[{x:8.4,z:-91}]},
 {id:'south-patrol',name:'Leah Morgan',role:'대로 남쪽 순찰',x:7.6,z:41.5,patrol:[{x:8.4,z:47}]},
 {id:'crossing-post',model:'patrol',name:'Miles Ford',role:'시장 교차로 경비',x:-29,z:-32,station:true},
 {id:'market-patrol',name:'Avery Brooks',role:'선용품 거리 순찰',x:-57,z:-44.4,patrol:[{x:-69,z:-44.4}]},
 {id:'signal-post',name:'Inez Ward',role:'항로등 정비소 경비',x:-83,z:-29,station:true}
]
people.push(...districtPolice.map(person=>({
 ...person,officer:true,variant:6,pace:1.18,temper:'defend',
 lines:person.station?['이 구역은 제가 지키고 있습니다. 통행로만 비워 주세요.']:['순찰 중입니다. 작업 차량이 지나갈 때는 인도에서 기다려 주세요.']
})))

people.push(
 {id:'clock-keeper',spawnWait:2,name:'Martha Bell',role:'시계탑 관리인',model:'crew',variant:2,height:1.71,x:-50.2,z:56.9,pace:.91,temper:'avoid',
  lines:['시계가 1분 늦네요. 내가 오늘은 먼저 올라가 봐야겠어요.','정각에 울리는 소리는 건너편 골목에서도 들을 수 있어요.']},
 {id:'west-courier',spawnWait:4,name:'Theo Mercer',role:'서편 배송 기사',model:'mariner',variant:4,x:-116.55,z:46.8,pace:1.35,temper:'flee',
  lines:['박스는 정비소에 두고 왔어. 이제 남쪽 거리만 돌면 끝이야.','이쪽 차도에 차를 세우면 아래쪽 길로 빙 둘러 가야 해.']},
 {id:'foundry-gardener',spawnWait:2,name:'Clara Webb',role:'정원 관리인',model:'crew',variant:5,height:1.68,x:-163.3,z:49.5,pace:.95,temper:'avoid',
  lines:['분수는 시험 삼아 켜 보셔도 돼요. 금방 꺼지니까 걱정 마세요.','예전엔 여기서 쇳가루가 날렸어요. 요즘은 화단에 물 주는 게 일이죠.']},
 {id:'ferry-keeper',spawnWait:3,name:'Caleb Frost',role:'선착장 시설 담당',model:'mariner',variant:2,x:-212,z:106,pace:1.04,temper:'defend',
  lines:['여객선은 들어오지 않습니다. 안쪽 신호등은 아직 작동해요.','창문 두 장은 내일 갈 겁니다. 바람 불 때 안쪽까진 들어가지 마세요.']},
 {id:'west-patrol',spawnWait:1,name:'Iris Walsh',role:'서편 거리 순찰',model:'patrol',variant:6,officer:true,x:-151.7,z:73,pace:1.16,temper:'defend',
  patrol:[{x:-151.7,z:89},{x:-153.2,z:96.2}],lines:['교차로 코너에만 차를 세우지 말아 주십시오.','남쪽에서 선착장으로 가는 길은 열려 있습니다.']}
)

people.push(weaponVendor,
 {id:'lantern-host',name:'Ada Fletcher',role:'Lantern Corner 점원',model:'crew',variant:6,x:-26.2,z:34.5,pace:.93,temper:'avoid',
  lines:['창 쪽은 아직 비어 있어요. 커피 마시기 좋은 자리예요.','저녁 배가 끊기면 저도 여기 불을 끄고 집에 가요.']},
 {id:'clock-neighbor',name:'Noah Bell',role:'Clock Row 주민',model:'mariner',variant:2,x:-28.8,z:48.3,pace:1.06,temper:'avoid',
  lines:['Clock Court로 가면 시계탑 아래에 동네 안내도가 있어요.','차는 큰길에 두고 와요. 이 동네는 골목으로 걷는 게 빨라요.']}
)

people.push(
 {id:'basin-host',name:'Leona Pike',role:'Tidelight Café 운영',model:'crew',variant:7,x:-12.3,z:100,pace:.97,temper:'avoid',
  lines:['선창에서 일 나오면 들러요. 네 시만 지나면 자리가 금방 차요.','대로 쪽 유리문으로 들어오세요. 안쪽에는 따뜻한 커피가 있어요.']},
 {id:'basin-clerk',name:'Isaac Dunn',role:'남부 등록소 직원',model:'mariner',variant:6,x:9.6,z:101.5,pace:1.05,temper:'avoid',
  lines:['등록하는 배마다 번호가 있어요. 새로 온 배는 남부 안벽에서 확인하고요.','정원은 안벽 끝에 있어요. 산책로를 끝까지 따라가면 보여요.']},
 {id:'basin-resident',name:'June Adler',role:'Cooper House 주민',model:'crew',variant:3,x:-21.2,z:157,pace:.93,temper:'flee',
  lines:['새 아파트 들어오기 전에는 이 길이 온통 철도 창고였어요.','비가 오기 전까지 안벽을 한 바퀴 돌아요. 저 끝 정원에선 바람이 좋아요.']}
)

people.push(...districtCitizens)

people.push(
 {id:'bank-teller',name:'Irene',role:'은행 직원',model:'crew',variant:2,x:-191.65,z:196.78,pace:.9,temper:'avoid',lines:['계좌 상담은 로비 오른쪽 상담실에서 진행합니다.']},
 {id:'bank-customer',name:'Owen',role:'은행 고객',variant:4,x:-185.2,z:192.63,pace:.87,temper:'avoid',lines:['하역장 쪽 지점이 문을 닫아서 여기로 왔어요.']},
 {id:'bank-guard',name:'Hector',role:'은행 경비',variant:23,x:-189.03,z:191.5,pace:1,temper:'defend',lines:['통로를 비워 주십시오. 창구는 로비 왼쪽에 있습니다.']}
)

const givenNames=new Map(people.map(({id,name})=>[id,name.split(' ',1)[0]]))
givenNames.set('wrong-deal-theo',givenNames.get('west-courier'))
givenNames.set('new-blood-jack',givenNames.get('courier'))
givenNames.set('new-blood-victor','Victor')

export function residentDisplayName({id,name}){
 return givenNames.get(id)??name
}

export const residentHealth = { civilian:108, officer:132, guard:144 }
