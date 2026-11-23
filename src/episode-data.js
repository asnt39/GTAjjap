import {sights} from './navigation.js'

import {people} from './resident-profiles.js'

const person = id => {
  const {name, legacyName, x, z} = people.find(n => n.id === id)
  return {residentId:id, resident:name, legacyName, label:name, x, z, radius:2}
}
const sign = tag => {
  const {x,z,name} = sights.find(sight => sight.tag === tag)
  return {sight:tag, label:name, x, z, radius:3}
}
const dock = person('courier')
const shop = person('merchant')
const supervisor = person('foreman')
const engineer = person('engineer')

export const firstWork = {
  id:'first-work', title:'첫 일거리', reward:2500, contact:dock,
  brief:'Jack · 북부 하역장 봉인 상자 하나만 구시가지로 가져다줘. Touring을 써.',
  steps:[
    {goal:{vehicle:true,x:4.92,z:12}, objective:'Touring에 탑승해.', reply:'북부 하역장에 정차해서 봉인 상자를 받아.'},
    {goal:{x:1.5,z:-82,radius:5}, stop:true, objective:'북부 하역장에 정차해 상자를 받아.', reply:'상자를 실었다. 브레이크워터 대로를 타고 구시가지로 가.'},
    {goal:{x:0,z:60,radius:5}, objective:'브레이크워터 구시가지 진입로로 가.', reply:'항만 검문으로 대로가 막혔어. 타이드 마켓 남쪽 진입로로 돌아가.'},
    {goal:{x:-68,z:-22,radius:5}, roadClosed:true, objective:'타이드 마켓을 통해 구시가지에 들어가.', reply:'검문을 우회했어. 구시가지 남쪽 거리에서 차를 세워.'},
    {goal:{x:-52,z:109,radius:4.5}, stop:true, roadClosed:true, objective:'구시가지 남쪽 거리에 정차해 상자를 넘겨.', reply:'첫 일거리 완료. 상자의 봉인 번호가 출항 명부에서 통째로 지워져 있어.'}
  ]
}

const clerk=person('tide-clerk')
export const storyContracts = [
  firstWork,
  {
    id:'missing-manifest', title:'지워진 출항표', reward:3200, contact:clerk,
    brief:'Morgan · 지워진 번호를 항로등 정비소의 야간 기록과 대조해 보시겠어요?',
    steps:[
      {goal:sign('06'), objective:'항로등 정비소에서 야간 점검표를 확인해.', reply:'같은 봉인 번호가 서로 다른 화물 두 건에 찍혀 있다.'},
      {goal:engineer, objective:'서부 부두의 Ellis Torres에게 점검표 내용을 알려 줘.', choices:[
        {id:'compare-seals',label:'같은 봉인 번호가 두 건에 찍혔어요.',reply:'둘 중 하나는 위조예요. 구시가지 시계탑 쪽에 원본 사본이 남아 있을 겁니다.',advance:true}
      ]}
    ]
  },
  {
    id:'clock-court-copy', title:'시계탑의 사본', reward:4200, contact:engineer,
    brief:'Ellis · 구시가지에 사본을 숨겨 뒀어요. 누가 찾기 전에 Jack에게 갖다주세요.',
    steps:[
      {goal:{x:-35,z:56,radius:5}, mode:'vehicle',stop:true,objective:'아무 차량으로 시계탑 동쪽 거리에 가서 정차해.',reply:'여기서 내려. 사본은 시계탑 남쪽 모퉁이에 있어.'},
      {goal:{x:-50,z:55,radius:2.1}, mode:'walk',objective:'내려서 시계탑 남쪽의 출항표 사본을 찾아.',reply:'사본을 찾았다. 새 화물의 인수란에 내 이름이 먼저 적혀 있다.'},
      {goal:dock, objective:'Jack Bennett에게 출항표 사본을 보여 줘.', choices:[
        {id:'deliver-copy',label:'누가 내 이름을 적어 놨어.',reply:'Jack · 네가 항구에 오기 전에 작성된 건데? 이건 미리 준비한 거야.',advance:true}
      ]}
    ]
  }
]

export const missions = [
  {
    id:'delivery', title:'물때표 배달', reward:3500,
    steps:[
      {goal:dock, objective:`배송 기사 ${dock.resident}에게 봉인된 물때표를 받아.`, choices:[
        {id:'collect', label:'물때표 받기', reply:`시장 도장 찍힌 거 보이지? ${shop.resident}한테 그대로 줘.`, advance:true}
      ]},
      {goal:shop, objective:`시장 점원 ${shop.resident}에게 물때표를 전해.`, choices:[
        {id:'deliver', label:'물때표 건네기', reply:`시간 맞춰 오셨네요. 다음 교대 연락은 ${supervisor.resident} 반장님께 부탁드려요.`, advance:true}
      ]}
    ]
  },
  {
    id:'radio', title:'교대 무전', reward:4500,
    steps:[
      {goal:supervisor, objective:`${supervisor.resident} 반장에게 교대 무전 채널을 물어봐.`, choices:[
        {id:'ask-channel', label:'오늘 교대 무전은 몇 번이에요?', reply:`오늘 교대는 7번 채널입니다. 서부 부두 ${engineer.resident} 씨에게도 전달해 주시죠.`, advance:true}
      ]},
      {goal:engineer, objective:`${engineer.resident}에게 오늘 교대 무전 채널을 알려 줘.`, choices:[
        {id:'channel-3', label:'3번 채널이라고 들었어요.', reply:'3번은 어시장 주파수인데요. 반장님이 7번이라고 하지 않으셨어요?'},
        {id:'channel-7', label:'7번 채널로 맞춰 주세요.', reply:'신호 잡혔어요. 서부 부두랑 시장 출구, 두 곳 안내판에서 진입로를 확인해 주세요.', advance:true}
      ]}
    ]
  },
  {
    id:'survey', title:'야간 진입로 답사', reward:5000,
    steps:[
      {goal:sign('02'), objective:'서부 부두 안내판을 읽고 부두 진입로를 확인해.', reply:'서부 부두의 진입로를 기록했다. 다음은 시장 쪽 출구다.'},
      {goal:sign('03'), objective:'시장 교차로 안내판을 읽고 시장 출구를 확인해.', reply:'두 표식을 모두 확인했다. 교대 차량을 북부 하역장으로 보낼 수 있다.'}
    ]
  },
  {
    id:'drive', title:'막차 출항', reward:8000,
    steps:[
      {goal:{label:'Touring 탑승', vehicle:true, x:3.1, z:19.5, radius:3}, objective:'Touring에 탑승해. 탑승하면 65초 운행이 시작돼.'},
      {goal:{label:'북부 하역장', x:2.6,z:-87,radius:5}, objective:'제한 시간 안에 Touring으로 북부 하역장 표식을 통과해.'},
      {goal:{label:'항구 정문', x:2.8,z:19.5,radius:4.5}, objective:'시간이 끝나기 전에 Touring으로 항구 정문 표식에 돌아와.'}
    ]
  }
]

export const goods = [
  {id:'bandage', name:'응급 붕대', price:900, type:'heal', amount:12, description:'체력을 최대 12 회복해.'},
  {id:'medkit', name:'구급팩', price:2500, type:'heal', amount:35, description:'체력을 최대 35 회복해.'},
  {id:'trauma-kit', name:'현장 구급 가방', price:4100, type:'heal', amount:60, description:'체력을 최대 60 회복해.'},
  {id:'armor', name:'보호 조끼', price:1900, type:'armor', amount:35, description:'다음 피격 피해를 합계 35까지 흡수해. 중첩 불가.'},
  {id:'repair-kit', name:'차량 정비 키트', price:1150, type:'repair', description:'싱글플레이에서 가까운 정차 차량의 찌그러짐과 파손 연기를 없애.'},
  {id:'pistol-ammo', name:'권총 예비탄', price:500, type:'ammo', weapon:'pistol', amount:8, description:'보유한 권총에 예비탄을 최대 8발 보충해.'},
  {id:'shotgun-ammo', name:'산탄총 예비탄', price:800, type:'ammo', weapon:'shotgun', amount:4, description:'보유한 산탄총에 예비탄을 최대 4발 보충해.'},
  {id:'coffee', name:'부두 커피', price:1800, type:'sprint', amount:30, description:'30초 동안 더 빠르게 달려.'},
  {id:'permit', name:'추가 운행권', price:3000, type:'permit', amount:20, description:'시간제 운전의 남은 시간을 20초 늘려.'}
]
