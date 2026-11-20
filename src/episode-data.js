import {sights} from './navigation.js'

import {people} from './resident-profiles.js'

const person = id => {
  const {name, x, z} = people.find(n => n.id === id)
  return {residentId:id, resident:name, label:name, x, z, radius:2}
}
const sign = tag => {
  const {x,z,name} = sights.find(sight => sight.tag === tag)
  return {sight:tag, label:name, x, z, radius:3}
}
const dock = person('courier')
const shop = person('merchant')
const supervisor = person('foreman')
const engineer = person('engineer')

export const missions = [
  {
    id:'delivery', title:'물때표 배달', reward:3500,
    steps:[
      {goal:dock, objective:'배송 기사 도현에게 봉인된 물때표를 받아.', choices:[
        {id:'collect', label:'물때표 받기', reply:'시장 도장 찍힌 거 보이지? 윤서한테 그대로 줘.', advance:true}
      ]},
      {goal:shop, objective:'시장 점원 윤서에게 물때표를 전해.', choices:[
        {id:'deliver', label:'물때표 건네기', reply:'시간 맞춰 오셨네요. 다음 교대 연락은 강 반장님께 부탁드려요.', advance:true}
      ]}
    ]
  },
  {
    id:'radio', title:'교대 무전', reward:4500,
    steps:[
      {goal:supervisor, objective:'강 반장에게 교대 무전 채널을 물어봐.', choices:[
        {id:'ask-channel', label:'오늘 교대 무전은 몇 번이에요?', reply:'오늘 교대는 7번 채널입니다. 서부 부두 미라 씨에게도 전달해 주시죠.', advance:true}
      ]},
      {goal:engineer, objective:'미라에게 오늘 교대 무전 채널을 알려 줘.', choices:[
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
  {id:'medkit', name:'구급팩', price:2500, description:'사용하면 체력을 최대 35 회복해.'},
  {id:'coffee', name:'부두 커피', price:1800, description:'사용하면 30초 동안 더 빠르게 달려.'},
  {id:'permit', name:'추가 운행권', price:3000, description:'시간제 운전 중 사용하면 남은 시간이 20초 늘어나.'}
]
