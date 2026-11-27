const id='uninvited-guests',title='불청객',reward=5600
const jack={residentId:'courier',resident:'Jack',label:'Jack',x:7.6,z:16.2,radius:2,
 jobTitle:title,brief:'Theo 일은 Victor도 들었어. 클럽에서 직접 얘기하고 싶대. 앞에서 만나 같이 들어가자.'}
const statuses=['available','active','failed','complete']

export function readNewBlood(saved){
 const status=statuses.includes(saved?.status)?saved.status:'available'
 const step=Number.isInteger(saved?.step)&&saved.step>=0&&saved.step<5?saved.step:0
 return {step:status==='active'||status==='failed'?step:0,status,reason:typeof saved?.reason==='string'?saved.reason:''}
}

export function createNewBlood({saved,available,commit,club}){
 const stages=[
  {set:'entry',event:'arrived',goal:club.entry,objective:'Lantern Room 앞에서 Jack과 합류해 입장'},
  {set:'meeting',event:'met',goal:club.vip,checkpoint:club.entry,objective:'VIP룸에서 Victor와 대화'},
  {set:'ambush',event:'cleared',goal:club.vip,checkpoint:club.recovery??club.vip,armed:true,objective:'Jack과 함께 클럽 안의 습격 저지',
   line:'Victor · 정문은 위험해. 바 뒤쪽으로 길을 뚫어.'},
  {set:'evacuation',event:'escaped',goal:club.exit,checkpoint:club.recovery??club.vip,armed:true,objective:'Victor와 함께 후문으로 대피',
   line:'Jack · 내가 뒤를 볼게. Victor를 직원 통로로 데려가.'},
  {set:'street',event:'cleared',goal:club.street,checkpoint:club.exit,armed:true,objective:'클럽 밖에 남은 위협 제압',
   line:'Victor · 뒤쪽 도로에도 놈들이 있어. 행인에게 쏘지 마.'}
 ]
 let state=readNewBlood(saved)
 const active=()=>state.status==='active'
 const pending=()=>state.status==='available'&&available()
 const stage=()=>stages[state.step]
 const write=(next,message,amount=0)=>{
  const result=commit(next,amount)
  if(result.ok)state=next
  return result.ok?{ok:true,message}:result
 }
 const fail=reason=>active()?write({...state,status:'failed',reason},reason):null

 return {
  get active(){return active()},
  get stage(){return active()?stage():null},
  get checkpoint(){return active()?stage().checkpoint:null},
  offer:()=>pending()?jack:null,
  comment(resident){
   if(resident?.id!==jack.residentId)return null
   if(state.status==='complete')return 'Victor가 오늘 일은 잊지 않겠다더라. 나도 그래. 다음 연락 올 때까진 좀 쉬어.'
   if(state.status==='failed')return 'Lantern Room엔 아직 할 일이 남았어. 마음 정리되면 다시 가자.'
   return null
  },
  choices:resident=>pending()&&resident?.id===jack.residentId?[{id:'new-blood-start',label:'Jack과 클럽에 가기'}]:[],
  interact({resident,choice}={}){
   if(choice==='new-blood-start'&&pending()&&resident?.id===jack.residentId)
    return write({step:0,status:'active',reason:''},'Jack · 내가 먼저 갈게. Lantern Room 정문에서 보자.')
   return null
  },
  snapshot(){
   return {title,missionId:id,chapter:'New Blood',stage:4,status:state.status,reason:state.reason,remaining:null,
    storyCompleted:state.status==='complete'?[id]:[],goal:active()?stage().goal:null,
    objective:active()?stage().objective:state.status==='failed'?state.reason:state.status==='complete'?'불청객 완료 · 자유 탐험':'Jack에게 말을 거십시오.'}
  },
  tracking(){return active()?{title,missionId:id,step:state.step,goal:stage().goal,objective:stage().objective}:null},
  fail,
  abandon(){return fail('임무 중단 · 수첩에서 재개')??{ok:false,message:'중단할 임무가 없어요.'}},
  retry(){
   if(state.status==='failed'&&available())return write({...state,status:'active',reason:''},'체크포인트에서 다시 시작합니다.')
   return {ok:false,message:'재시도할 임무가 없어요.'}
  },
  update(events){
   if(!active()||!available()||!events[stage().event])return null
   const next=stages[state.step+1]
   if(next)return write({...state,step:state.step+1},next.line??next.objective)
   return write({step:0,status:'complete',reason:''},'Victor · 오늘 네가 우리를 살렸어. 다음 일은 내가 연락할게. · 보상 ₩'+reward.toLocaleString('ko-KR'),reward)
  }
 }
}
