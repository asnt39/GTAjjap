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
 {id:'north-patrol',name:'Hugo Clarke',role:'북부 하역장 순찰',x:7.7,z:-82,patrol:[{x:8.4,z:-91}]},
 {id:'south-patrol',name:'Leah Morgan',role:'대로 남쪽 순찰',x:7.6,z:41.5,patrol:[{x:8.4,z:47}]},
 {id:'crossing-post',name:'Miles Ford',role:'시장 교차로 경비',x:-29,z:-32,station:true},
 {id:'market-patrol',name:'Avery Brooks',role:'선용품 거리 순찰',x:-57,z:-44.4,patrol:[{x:-69,z:-44.4}]},
 {id:'signal-post',name:'Inez Ward',role:'항로등 정비소 경비',x:-83,z:-29,station:true}
]
people.push(...districtPolice.map(person=>({
 ...person,officer:true,variant:6,pace:1.18,temper:'defend',
 lines:person.station?['이 구역은 제가 지키고 있습니다. 통행로만 비워 주세요.']:['순찰 중입니다. 작업 차량이 지나갈 때는 인도에서 기다려 주세요.']
})))

export const residentHealth = { civilian:108, officer:132, guard:144 }
