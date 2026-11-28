export const chapterIds=['stolen-wheels','silence-the-witness','black-waters','declaration-of-war']
const statuses=['available','active','failed','complete']

export function readChapterArc(saved){
 const mission=Number.isInteger(saved?.mission)&&saved.mission>=0&&saved.mission<chapterIds.length?saved.mission:0
 const status=statuses.includes(saved?.status)&&!(saved.status==='complete'&&mission!==chapterIds.length-1)?saved.status:'available'
 return {mission,step:Number.isInteger(saved?.step)&&saved.step>=0&&saved.step<16?saved.step:0,status,
  reason:typeof saved?.reason==='string'?saved.reason.slice(0,240):'',lead:saved?.lead==='intercepted'?'intercepted':saved?.lead==='escaped'?'escaped':null}
}

export function createChapterArc({saved,missions,available,commit}){
 let state=readChapterArc(saved)
 if(state.mission>=missions.length&&state.status!=='available')state={...state,step:0,status:'available'}
 if(state.step>=(missions[state.mission]?.stages.length??0))state.step=0
 const mission=()=>missions[state.mission]
 const stage=()=>mission()?.stages[state.step]
 const current=()=>state.status==='active'&&!!stage()
 const pending=()=>state.status==='available'&&!!mission()&&available()
 const write=(next,message,reward=0)=>{
  if(!commit(next,reward).ok)return {ok:false,message:'챕터 진행을 저장하지 못했습니다.'}
  state=next
  return {ok:true,message}
 }
 const fail=reason=>current()?write({...state,status:'failed',reason},reason):null
 const lineText=line=>line&&line.join(' · ')
 function journal(){
  const completed=missions.slice(0,state.mission).flatMap(job=>[job.brief,...job.stages.map(beat=>beat.line),job.finish])
  const job=mission()
  if(!job)return completed.filter(Boolean)
  const beats=state.status==='complete'?job.stages:job.stages.slice(0,state.step+1)
  const current=[job.brief,...beats.map(beat=>beat.line),state.status==='complete'?job.finish:null]
  return [...completed,...current].filter(Boolean)
 }
 return {
  get active(){return current()},
  get stage(){return current()?stage():null},
  get checkpoint(){return current()?stage().checkpoint:null},
  get complete(){return state.status==='complete'},
  offer(){return pending()?{...mission().contact,brief:mission().brief[1],briefSpeaker:mission().brief[0],jobTitle:mission().title}:null},
  choices(resident){
   return pending()&&resident?.id===mission().contact.residentId?[{id:'chapter-accept',label:mission().title+' 수락'}]:[]
  },
  comment(resident){return state.status==='complete'?missions.at(-1)?.epilogue?.[resident?.id]??null:null},
  interact({resident,choice}={}){
   if(choice!=='chapter-accept'||!this.choices(resident).length)return null
   return write({...state,status:'active',step:0,reason:''},lineText(mission().stages[0].line)??mission().stages[0].objective)
  },
  snapshot(){
   const job=mission()
   return {title:job?.title??'새로운 일원',missionId:job?.id,chapter:'New Blood',stage:5+state.mission,
    status:state.status,reason:state.reason,remaining:null,goal:current()?stage().goal:null,
    objective:state.status==='failed'?state.reason:state.status==='complete'?'Chapter 1 완료 · 작업실 이용 가능':
     current()?stage().objective:job?job.contact.label+'에게 말을 거십시오.':'다음 항만 연락 대기 중',
    storyCompleted:chapterIds.slice(0,state.mission+(state.status==='complete'?1:0)),journal:journal(),lead:state.lead}
  },
  tracking(){return current()?{missionId:mission().id,title:mission().title,step:state.step,goal:stage().goal,objective:stage().objective}:null},
  fail,abandon(){return fail('임무를 중단했습니다.')??{ok:false,message:'진행 중인 임무가 없습니다.'}},
  retry(){
   return state.status==='failed'&&available()?write({...state,status:'active',reason:''},'체크포인트에서 다시 시작합니다.'):
    {ok:false,message:'재시작할 임무가 없습니다.'}
  },
  update(events){
   if(!current()||!available()||!events[stage().event])return null
   const lead=stage().event==='adrianLead'&&['intercepted','escaped'].includes(events.adrianLead)?events.adrianLead:state.lead
   const next=mission().stages[state.step+1]
   if(next){
    const report=stage().event==='adrianLead'?
     (lead==='intercepted'?'Jack · 운행장부 확보. 안전하게 돌아가자.':'Jack · 마지막 합류 좌표를 표시했어. Victor에게 알려.') : null
    return write({...state,step:state.step+1,lead},report??lineText(next.line)??next.objective)
   }
   const job=mission(),complete=state.mission===chapterIds.length-1
   return write({mission:state.mission+(complete?0:1),status:complete?'complete':'available',step:0,reason:'',lead},
    lineText(job.finish)+' · 보상 ₩'+job.reward.toLocaleString('ko-KR'),job.reward)
  }
 }
}
