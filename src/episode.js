import {firstWork,goods,missions} from './episode-data.js'

const saveKey = 'harborline.episode.v1'
const driveSeconds = 65
const initial = () => ({
  index:0, step:0, status:'available', money:5000,
  inventory:{medkit:0,coffee:0,permit:0}, remaining:null, reason:'',
  firstJob:{step:0,status:'available',reason:''}
})
const natural = n => Number.isSafeInteger(n) && n >= 0
const result = (ok,message,effect) => effect ? {ok,message,effect} : {ok,message}
const wrong = message => result(false,message)
const matchesResident = (goal, resident) => {
  if (!goal.residentId || !resident) return false
  if (resident.id) return goal.residentId === resident.id
  const name = resident.name ?? resident
  return name === goal.resident || name === goal.legacyName
}

function read(storage) {
  try {
    const saved=JSON.parse(storage?.getItem(saveKey) ?? 'null')
    if (!saved || saved.version!==1 || !natural(saved.index) || !missions[saved.index]) return initial()
    const state=initial()
    state.index=saved.index
    state.status=['available','active','failed','complete'].includes(saved.status) ? saved.status : 'available'
    if (state.status==='complete' && state.index!==missions.length-1) state.status='available'
    if (state.status==='active' && natural(saved.step) && saved.step<missions[state.index].steps.length) state.step=saved.step
    if (natural(saved.money)) state.money=saved.money
    for (const item of goods) {
      if (natural(saved.inventory?.[item.id])) state.inventory[item.id]=saved.inventory[item.id]
    }
    if (typeof saved.reason==='string') state.reason=saved.reason
    if (state.status==='active' && missions[state.index].id==='drive' && state.step>0) {
      state.remaining=Number.isFinite(saved.remaining) ? Math.max(0,saved.remaining) : driveSeconds
    }
    const opening=saved.firstJob
    if (['active','failed','complete'].includes(opening?.status)) {
      state.firstJob.status=opening.status
      if (opening.status==='active' && natural(opening.step) && opening.step<firstWork.steps.length) state.firstJob.step=opening.step
      if (typeof opening.reason==='string') state.firstJob.reason=opening.reason
      if (state.firstJob.status==='active' && state.status==='active') {
        state.firstJob.status='failed'
        state.firstJob.step=0
      }
    }
    if (state.firstJob.status==='active' ||
        saved.selected===firstWork.id && state.firstJob.status==='failed' && state.status!=='active') state.selected=firstWork.id
    return state
  } catch { return initial() }
}

export function createEpisode(options={}) {
  let storage=options.storage
  if (storage===undefined) { try { storage=globalThis.localStorage } catch {} }
  const state=read(storage)
  let savedSecond=Math.ceil(state.remaining ?? 0)
  const firstSelected=()=>state.selected===firstWork.id
  const record=()=>firstSelected()?state.firstJob:state
  const mission=()=>firstSelected()?firstWork:missions[state.index]
  const step=()=>mission().steps[record().step]
  const canStartOpening=()=>options.canStartOpening?.()??true
  function save() {
    try { storage?.setItem(saveKey,JSON.stringify({version:1,...state})) } catch {}
    savedSecond=Math.ceil(state.remaining ?? 0)
  }
  function advance(message) {
    const run=record()
    if (run.step+1<mission().steps.length) {
      run.step++
    } else {
      const finished=mission()
      state.money+=finished.reward
      message+=' +₩'+finished.reward.toLocaleString('ko-KR')
      run.step=0
      if (firstSelected()) {
        run.status='complete'
        delete state.selected
      } else {
        state.remaining=null
        if (state.index===missions.length-1) state.status='complete'
        else state.index++
      }
    }
    save()
    return result(true,message)
  }
  function start() {
    const run=record()
    if (run.status!=='available' || (firstSelected()&&!canStartOpening())) return wrong('현재 이 의뢰를 시작할 수 없어.')
    run.status='active'; run.reason=''
    save()
    return result(true,step().objective)
  }
  function fail(reason='의뢰를 마치지 못했어.') {
    const run=record()
    if (run.status!=='active') return null
    run.status='failed'; run.reason=String(reason); run.step=0
    if (!firstSelected()) state.remaining=null
    save()
    return result(false,run.reason)
  }
  function retry() {
    const run=record()
    if (run.status!=='failed' && !(!firstSelected()&&run.status==='available'&&state.index>0)) return wrong('다시 시도할 의뢰가 없어.')
    if (firstSelected()&&!canStartOpening()) return wrong('싱글플레이에서 첫 일거리를 다시 시작할 수 있어.')
    run.status='available'
    return start()
  }
  function abandon() {
    const run=record()
    if (run.status!=='active' && run.status!=='failed') return wrong('중단할 의뢰가 없어.')
    run.status='available'; run.step=0; run.reason=''
    if (firstSelected()) delete state.selected
    else state.remaining=null
    save()
    return result(true,'의뢰를 중단했어. 지금까지 받은 보상은 보관돼.')
  }
  function choices(resident) {
    const matches=goal=>matchesResident(goal,resident)
    if (record().status!=='active' && matches(firstWork.contact)) {
      const offers=[]
      if (state.index===0 && state.status==='available') offers.push({id:'accept',label:'물때표 배달 맡기'})
      if (state.firstJob.status!=='complete' && canStartOpening()) offers.push({id:firstWork.id,label:'첫 일거리 맡기'})
      return offers
    }
    if (state.status!=='active' || !matches(step().goal)) return []
    return (step().choices ?? []).map(({id,label})=>({id,label}))
  }
  function interact({resident, name, choice, sight}={}) {
    const who=resident??name
    if (choice===firstWork.id && choices(who).some(option=>option.id===firstWork.id)) {
      state.selected=firstWork.id
      state.firstJob.status='available'
      start()
      return result(true,'Jack · 북부 하역장 봉인 상자 하나만 구시가지로 가져다줘. Touring을 써.')
    }
    if (choice==='accept' && choices(who).some(option=>option.id==='accept')) {
      delete state.selected
      start()
      return advance(`${mission().steps[0].goal.resident} · 오늘 물때표야. 시장에 있는 ${mission().steps[1].goal.resident}에게 봉투를 전해 줘.`)
    }
    if (record().status!=='active') return null
    const current=step()
    if (current.goal.sight && current.goal.sight===(sight?.tag ?? sight)) return advance(current.reply)
    if (!matchesResident(current.goal,who)) return null
    const answer=current.choices?.find(item=>item.id===choice)
    if (!answer) return null
    return answer.advance ? advance(answer.reply) : result(true,answer.reply)
  }
  function update(dt,{x,z,driving,speed=0}={}) {
    if (firstSelected()) {
      if (record().status!=='active'||!driving) return null
      const current=step(),goal=current.goal
      const reached=goal.vehicle||Math.hypot(x-goal.x,z-goal.z)<=goal.radius
      return reached&&(!current.stop||Math.abs(speed)<=.65)?advance(current.reply):null
    }
    if (state.status!=='active' || mission().id!=='drive') return null
    if (state.step===0) {
      if (!driving) return null
      state.remaining=driveSeconds
      return advance('탑승 확인. 북부 하역장을 거쳐 항구 정문으로 돌아와.')
    }
    if (Number.isFinite(dt) && dt>0) state.remaining=Math.max(0,state.remaining-dt)
    if (state.remaining<=0) return fail('출항 시간이 지났어. 운전 의뢰를 다시 시도할 수 있어.')
    const goal=step().goal
    if (driving && Math.hypot(x-goal.x,z-goal.z)<=goal.radius) {
      return advance(state.step===1 ? '북부 하역장 확인. 항구 정문으로 돌아와.' : '항구 정문에 도착했다. 마지막 교대가 출항 시간에 맞춰 도착했어.')
    }
    if (Math.ceil(state.remaining)!==savedSecond) save()
    return null
  }
  function buy(id) {
    const item=goods.find(entry=>entry.id===id)
    if (!item) return wrong('판매하지 않는 물건이야.')
    if (state.money<item.price) return wrong('돈이 부족해.')
    state.money-=item.price
    state.inventory[id]++
    save()
    return result(true,item.name+' 구매 완료')
  }
  function use(id,{hp,maxHealth}={}) {
    const item=goods.find(entry=>entry.id===id)
    if (!item || !state.inventory[id]) return wrong('가방에 이 물건이 없어.')
    let effect,message
    if (id==='medkit') {
      if (!Number.isFinite(hp) || !Number.isFinite(maxHealth) || hp<=0 || maxHealth<=hp) return wrong('지금은 체력을 회복할 수 없어.')
      effect={heal:Math.min(maxHealth-hp,35)}
      message='체력 '+effect.heal+' 회복'
    } else if (id==='coffee') {
      effect={sprintSeconds:30};message='달리기 속도 증가 · 30초'
    } else {
      if (state.status!=='active' || state.remaining===null) return wrong('시간제 운전 중에 사용할 수 있어.')
      state.remaining+=20;effect={driveSeconds:20}; message='운행 시간 +20초'
    }
    state.inventory[id]--
    save()
    return result(true,message,effect)
  }
  function snapshot() {
    const {index,remaining,money}=state
    const {status,reason}=record()
    const current=mission()
    return {
      title:current.title, missionId:current.id, stage:firstSelected()?1:index+1,status,reason,remaining,money,
      objective:status==='complete' ? '마지막 교대가 떠났다. 항구를 자유롭게 둘러봐.' : status==='failed' ? reason : step().objective,
      goal:status==='active' ? {...step().goal} : null,
      items:goods.map(item=>({...item,count:state.inventory[item.id]})),
      completed:missions.slice(0,state.status==='complete'?missions.length:index).map(item=>item.id),
      firstJobCompleted:state.firstJob.status==='complete'
    }
  }
  function tracking(){
    if(record().status!=='active')return null
    const {goal,objective}=step()
    return {goal,objective,stage:state.index+1,remaining:state.remaining,firstWork:firstSelected()}
  }
  function openingContact(){
    return state.index===0&&state.status==='available'&&state.firstJob.status==='available'&&canStartOpening()?firstWork.contact:null
  }
  return {snapshot,tracking,openingContact,choices,interact,update,start,retry,abandon,fail,buy,use,
    get openingActive(){return firstSelected()&&record().status==='active'},
    get roadClosed(){return this.openingActive&&!!step().roadClosed}}
}
