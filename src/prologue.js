import {detention,extraction,safeHouse,transferFoot,transferYard,worksBay,worksClear} from './prologue-plan.js'

const zone=(x,z,radius,label)=>({x,z,radius,label})
const northExit=zone(0,-14,7,'Breakwater Avenue')
export const wrongDeal=[
 {id:'first-deal',title:'첫 거래',reward:2600,stages:[
  {kind:'drive',goal:transferYard,objective:'Quay Transfer 도착 및 정차'},
  {kind:'walk',goal:transferFoot,objective:'하차 후 화물 인수 지점 확인',line:'Jack · 네 몫은 화물을 건네고 나서야. 차는 가까운 데 세워 둬.'},
  {kind:'fight',set:'quay',goal:transferFoot,checkpoint:zone(14.45,-36.65,0,'Quay Transfer'),objective:'컨테이너 야드의 기습 저지',line:'Jack · 거래가 틀어졌어. 엄폐하고, 일단 살아서 나와.'},
  {kind:'drive',goal:northExit,objective:'차량으로 야드 이탈',line:'Jack · 여기서 멈추지 마. 대로 쪽으로 빠져.'}
 ]},
 {id:'on-our-tail',title:'추격자',reward:3400,brief:'Jack · 뒤에 차가 붙었어. 저 차들을 떼어내고 Clock Street로 와.',stages:[
  {kind:'evade',set:'pursuit',goal:safeHouse,objective:'뒤따라오는 차량 따돌리기'},
  {kind:'drive',goal:safeHouse,objective:'Clock Street 집결지 도착 및 정차',line:'Jack · 무전 잠잠해졌어. Clock Street에서 정차해.'}
 ]},
 {id:'payback',title:'반격',reward:5100,brief:'Jack · Theo가 놈들한테 잡혔어. West Bank Works 생산동에 있어.',stages:[
  {kind:'walk',goal:worksBay,objective:'West Bank Works 정문 진입'},
  {kind:'fight',set:'hall',goal:worksClear,checkpoint:zone(-129,30.75,0,'생산동 입구'),objective:'생산동의 경비 제압',line:'Theo · 안쪽에 있어. 기계 뒤로 움직여, 여긴 통로가 좁아.'},
  {kind:'free',set:'prisoner',goal:detention,checkpoint:zone(-126.75,46.2,0,'생산동'),objective:'Theo Mercer 구출'},
  {kind:'escort',set:'extraction',goal:extraction,checkpoint:zone(-126.75,46.2,0,'생산동'),objective:'Theo와 함께 집결지까지 탈출',line:'Theo · 바깥에서 발소리 들려. 작업문으로 가자.'}
 ]}
]
const jack={residentId:'courier',resident:'Jack Bennett',label:'Jack Bennett',x:7.6,z:16.2,radius:2}
const firstLine='Jack · 오늘 화물 거래 한 번만 같이 가자. 잘 끝나면 네 몫은 확실해.'
const stateOf=(mission=0,step=0,status='available',reason='')=>({mission,step,status,reason})
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)
export function readPrologue(value){
 if(!value||!Number.isInteger(value.mission)||!wrongDeal[value.mission])return stateOf()
 const stages=wrongDeal[value.mission].stages
 const step=Number.isInteger(value.step)&&stages[value.step]?value.step:0
 const status=['available','active','failed','complete'].includes(value.status)?value.status:'available'
 if(status==='complete'&&value.mission!==wrongDeal.length-1)return stateOf()
 return stateOf(value.mission,step,status,typeof value.reason==='string'?value.reason:'')
}

export function createPrologue({saved,commit,available}){
 let state=readPrologue(saved)
 const current=()=>wrongDeal[state.mission], stage=()=>current().stages[state.step]
 const active=()=>state.status==='active'
 function write(next,message,reward=0){
  const result=commit(next,reward)
  if(result.ok)state=next
  return result.ok?{ok:true,message}:result
 }
 function advance(){
  const n=state.step+1,currentMission=current(),next=currentMission.stages[n]
  if(next)return write(stateOf(state.mission,n,'active'),next.line??next.objective)
  const reward=currentMission.reward,m=state.mission+1,upcoming=wrongDeal[m]
  const message=(upcoming?.brief??'Jack · Theo는 무사해. 다음부터 넌 우리와 함께 움직인다.')+
   ' / '+currentMission.title+' 완료 · ₩'+reward.toLocaleString('ko-KR')
  return write(upcoming?stateOf(m,0,'active'):stateOf(state.mission,0,'complete'),message,reward)
 }
 return {
  get active(){return active()},
  get stage(){return active()?stage():null},
  get checkpoint(){return active()?stage().checkpoint:null},
  choices(resident){
   return available()&&state.status==='available'&&resident?.id===jack.residentId?[{id:'wrong-deal-start',label:'첫 거래 수락'}]:[]
  },
  interact({resident,choice}={}){
   if(choice==='wrong-deal-start'&&this.choices(resident).length)return write(stateOf(0,0,'active'),firstLine)
   return null
  },
  offer(){return available()&&state.status==='available'?{...jack,jobTitle:current().title}:null},
  tracking(){
   return active()?{goal:stage().goal,title:current().title,missionId:current().id,step:state.step,objective:stage().objective}:null
  },
  snapshot(){
   const mission=current(),completed=wrongDeal.slice(0,state.status==='complete'?wrongDeal.length:state.mission).map(m=>m.id)
   return {title:mission.title,missionId:mission.id,stage:state.mission+1,status:state.status,reason:state.reason,storyCompleted:completed,
    remaining:null,goal:active()?stage().goal:null,
    objective:state.status==='complete'?'프롤로그 완료 · 자유 탐험':state.status==='failed'?state.reason:state.status==='available'?'Jack Bennett와 만나십시오.':stage().objective}
  },
  fail(reason='임무 실패'){
   return active()?write(stateOf(state.mission,state.step,'failed',reason),reason):null
  },
  retry(){
   return state.status==='failed'&&available()?write(stateOf(state.mission,state.step,'active'),'체크포인트에서 다시 시작합니다.'):
    {ok:false,message:'재시도할 임무가 없습니다.'}
  },
  abandon(){
   return active()||state.status==='failed'?write(stateOf(state.mission,state.step,'failed','임무 중단 · 수첩에서 재개'), '임무 중단 · 수첩에서 재개'):
    {ok:false,message:'중단할 임무가 없습니다.'}
  },
  rescue(pos){
   if(!active()||stage().kind!=='free'||distance(pos,detention)>detention.radius||(pos.y??0)>1.2)return null
   return advance()
  },
  update(frame){
   if(!active()||!available())return null
   const {kind,goal}=stage()
   if(kind==='fight'&&frame.cleared||kind==='evade'&&frame.evaded||
    kind==='escort'&&frame.rescued&&frame.onFoot&&distance(frame,goal)<goal.radius)return advance()
   if(kind==='walk'&&frame.onFoot&&distance(frame,goal)<goal.radius)return advance()
   if(kind==='drive'&&frame.driving&&distance(frame,goal)<goal.radius&&
    (goal===northExit||Math.abs(frame.speed)<.85))return advance()
   return null
  }
 }
}
