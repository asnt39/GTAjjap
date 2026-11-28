import {firstWork,goods,missions,storyContracts} from './episode-data.js'
import {basinPlate} from './south-basin-plan.js'
import {createPrologue,readPrologue} from './prologue.js'
import {createNewBlood,readNewBlood} from './new-blood.js'
import {createChapterArc,readChapterArc} from './chapter-arc.js'

export const EPISODE_SAVE_KEY = 'harborline.episode.v1'
const driveSeconds = 65
const emptyRun=()=>({step:0,status:'available',reason:''})
const initial = () => ({
  index:0, step:0, status:'available', money:5000,
  inventory:Object.fromEntries(goods.map(item=>[item.id,0])), remaining:null, reason:'',
  bank:0, firstJob:emptyRun(), discoveries:[],
  followups:Object.fromEntries(storyContracts.slice(1).map(contract=>[contract.id,emptyRun()]))
})
const storyRun=(state,contract)=>contract===firstWork?state.firstJob:state.followups[contract.id]
const natural = n => Number.isSafeInteger(n) && n >= 0
export const isEpisodeRecord = saved => saved?.version===1 && natural(saved.index) && !!missions[saved.index]
const result = (ok,message,effect) => effect ? {ok,message,effect} : {ok,message}
const wrong = message => result(false,message)
const matchesResident = (goal, resident) => {
  if (!goal.residentId || !resident) return false
  if (resident.id) return goal.residentId === resident.id
  const name = resident.name ?? resident
  return name === goal.resident || name === goal.legacyName
}

function read(raw) {
  try {
    const saved=JSON.parse(raw ?? 'null')
    if (!isEpisodeRecord(saved)) return initial()
    const state=initial()
    state.index=saved.index
    if(saved.equipment?.items&&typeof saved.equipment.items==='object')state.equipment=saved.equipment
    state.status=['available','active','failed','complete'].includes(saved.status) ? saved.status : 'available'
    if (state.status==='complete' && state.index!==missions.length-1) state.status='available'
    if (state.status==='active' && natural(saved.step) && saved.step<missions[state.index].steps.length) state.step=saved.step
    if (natural(saved.money)) state.money=saved.money
    if (natural(saved.bank)) state.bank=saved.bank
    if (saved.wrongDeal) state.wrongDeal=readPrologue(saved.wrongDeal)
    if (saved.newBlood) state.newBlood=readNewBlood(saved.newBlood)
    if (saved.chapterArc) state.chapterArc=readChapterArc(saved.chapterArc)
    if (Array.isArray(saved.discoveries)&&saved.discoveries.includes(basinPlate.id)) state.discoveries.push(basinPlate.id)
    for (const item of goods) {
      if (natural(saved.inventory?.[item.id])) state.inventory[item.id]=saved.inventory[item.id]
    }
    if (typeof saved.reason==='string') state.reason=saved.reason
    if (state.status==='active' && missions[state.index].id==='drive' && state.step>0) {
      state.remaining=Number.isFinite(saved.remaining) ? Math.max(0,saved.remaining) : driveSeconds
    }
    for(const contract of storyContracts){
      const savedRun=contract===firstWork?saved.firstJob:saved.followups?.[contract.id]
      const run=storyRun(state,contract)
      if (['active','failed','complete'].includes(savedRun?.status)) {
        run.status=savedRun.status
        if (run.status==='active'&&natural(savedRun.step)&&savedRun.step<contract.steps.length) run.step=savedRun.step
        if (typeof savedRun.reason==='string') run.reason=savedRun.reason
      }
    }
    const next=storyContracts.find(contract=>storyRun(state,contract).status!=='complete')
    if (next) {
      const run=storyRun(state,next)
      if(run.status==='active'&&state.status==='active') Object.assign(run,{status:'failed',step:0,reason:'다시 시작하려면 의뢰 제공자에게 말을 걸어.'})
      if(run.status==='active'||run.status==='failed'&&saved.selected===next.id&&state.status!=='active') state.selected=next.id
    }
    return state
  } catch { return initial() }
}

export function createEpisode(options={}) {
  let storage=options.storage
  if (storage===undefined) { try { storage=globalThis.localStorage } catch {} }
  let lastSave
  try { lastSave=storage?.getItem(EPISODE_SAVE_KEY) } catch {}
  const state=read(lastSave)
  let savedSecond=Math.ceil(state.remaining ?? 0)
  const selectedStory=()=>state.selected?storyContracts.find(contract=>contract.id===state.selected):null
  const nextStory=()=>storyContracts.find(contract=>storyRun(state,contract).status!=='complete')
  const record=()=>{const selected=selectedStory();return selected?storyRun(state,selected):state}
  const mission=()=>selectedStory()??missions[state.index]
  const step=()=>mission().steps[record().step]
  const canStartOpening=()=>options.canStartOpening?.()??true
  function write(fields){
    if(options.readOnly?.())return wrong('자유 모드에서는 스토리 진행 데이터를 변경할 수 없습니다.')
    if(!storage)return wrong('저장소를 사용할 수 없어.')
    try {
      if(storage.getItem(EPISODE_SAVE_KEY)!==lastSave)return wrong('다른 탭에서 진행 상황이 바뀌었어. 새로고침해 줘.')
      const next=JSON.stringify({version:1,...state,...fields})
      if(next===lastSave)return result(true,'저장 완료')
      storage.setItem(EPISODE_SAVE_KEY,next)
      lastSave=next
    } catch { return wrong('저장할 수 없어.') }
    try { options.onSave?.() } catch {}
    return result(true,'저장 완료')
  }
  let legacy=false
  const prologue=options.mainStory?createPrologue({
    saved:state.wrongDeal,available:canStartOpening,
    commit(wrongDeal,reward){
      const money=state.money+reward
      if(!natural(money))return wrong('보상을 저장할 수 없습니다.')
      const next=write({wrongDeal,money})
      if(next.ok)Object.assign(state,{wrongDeal,money})
      return next
    }
  }):null
  const usePrologue=()=>prologue&&!legacy
  const chapter=prologue&&options.chapterOne?createNewBlood({saved:state.newBlood,available:canStartOpening,club:options.chapterOne,
    commit(newBlood,reward){
      const money=state.money+reward
      if(!natural(money))return wrong('보상을 저장할 수 없습니다.')
      const saved=write({newBlood,money})
      if(saved.ok)Object.assign(state,{newBlood,money})
      return saved
    }
  }):null
  const continuation=chapter&&options.chapterMissions?.length?createChapterArc({
    saved:state.chapterArc,missions:options.chapterMissions,available:canStartOpening,
    commit(chapterArc,reward){
      const money=state.money+reward
      if(!natural(money))return wrong('보상을 저장할 수 없습니다.')
      const saved=write({chapterArc,money})
      if(saved.ok)Object.assign(state,{chapterArc,money})
      return saved
    }
  }):null
  const currentChapter=()=>chapter&&prologue.complete?(continuation&&chapter.snapshot().status==='complete'?continuation:chapter):null
  const activeCampaign=()=>usePrologue()?(currentChapter()??prologue):null
  function save() {
    const saved=write()
    savedSecond=Math.ceil(state.remaining ?? 0)
    return saved
  }
  // Save wallet and equipment in the same write on a purchase. The old
  // equipment record remains readable until the first purchase succeeds.
  function purchaseEquipment(price,equipment){
    if(!natural(price) || !price)return wrong('가격을 확인할 수 없어.')
    if(state.money<price)return wrong('돈이 부족해.')
    const money=state.money-price
    const saved=write({money,equipment})
    if(!saved.ok)return wrong(saved.message+' 돈은 차감되지 않았어.')
    state.money=money
    state.equipment=equipment
    return result(true,'구매 완료')
  }
  function saveEquipment(equipment){
    state.equipment=equipment
    save()
  }
  const discovered=id=>state.discoveries.includes(id)
  function discover(id){
    if(id!==basinPlate.id||discovered(id))return wrong('이미 기록했거나 확인할 수 없는 물건이야.')
    const money=state.money+basinPlate.reward,discoveries=[...state.discoveries,id]
    if(!natural(money))return wrong('보상을 저장할 수 없어.')
    const saved=write({money,discoveries})
    if(!saved.ok)return saved
    Object.assign(state,{money,discoveries})
    return result(true,'도선 신호판을 수첩에 기록했어. 조사 보상 +₩'+basinPlate.reward.toLocaleString('ko-KR'))
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
      if (selectedStory()) {
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
    if (run.status!=='available' || (selectedStory()&&!canStartOpening())) return wrong('현재 이 의뢰를 시작할 수 없어.')
    run.status='active'; run.reason=''
    save()
    return result(true,step().objective)
  }
  function fail(reason='의뢰를 마치지 못했어.') {
    if(usePrologue())return activeCampaign().fail(reason)
    const run=record()
    if (run.status!=='active') return null
    run.status='failed'; run.reason=String(reason); run.step=0
    if (!selectedStory()) state.remaining=null
    save()
    return result(false,run.reason)
  }
  function retry() {
    if(usePrologue())return activeCampaign().retry()
    const run=record()
    if (run.status!=='failed' && !(!selectedStory()&&run.status==='available'&&state.index>0)) return wrong('다시 시도할 의뢰가 없어.')
    if (selectedStory()&&!canStartOpening()) return wrong('싱글플레이에서 이 스토리 의뢰를 다시 시작할 수 있어.')
    run.status='available'
    return start()
  }
  function abandon() {
    if(usePrologue())return activeCampaign().abandon()
    const run=record()
    if (run.status!=='active' && run.status!=='failed') return wrong('중단할 의뢰가 없어.')
    run.status='available'; run.step=0; run.reason=''
    if (selectedStory()) delete state.selected
    else state.remaining=null
    save()
    return result(true,'의뢰를 중단했어. 지금까지 받은 보상은 보관돼.')
  }
  function choices(resident) {
    if(usePrologue())return activeCampaign().choices(resident)
    const matches=goal=>matchesResident(goal,resident)
    if (record().status!=='active') {
      const offers=[],next=nextStory()
      if (state.index===0&&state.status==='available'&&matches(missions[0].steps[0].goal)) offers.push({id:'accept',label:'물때표 배달 맡기'})
      if (next&&matches(next.contact)&&canStartOpening()) offers.push({id:next.id,label:next.title+' 맡기'})
      return offers
    }
    if (!matches(step().goal)) return []
    return (step().choices ?? []).map(({id,label})=>({id,label}))
  }
  function interact({resident, name, choice, sight}={}) {
    if(usePrologue())return activeCampaign().interact({resident,choice})
    const who=resident??name
    const next=nextStory()
    if (next&&choice===next.id&&choices(who).some(option=>option.id===next.id)) {
      state.selected=next.id
      storyRun(state,next).status='available'
      start()
      return result(true,next.brief)
    }
    if (choice==='accept' && choices(who).some(option=>option.id==='accept')) {
      delete state.selected
      start()
      return advance(`${mission().steps[0].goal.label} · 오늘 물때표야. 시장에 있는 ${mission().steps[1].goal.label}에게 봉투를 전해 줘.`)
    }
    if (record().status!=='active') return null
    const current=step()
    if (current.goal.sight && current.goal.sight===(sight?.tag ?? sight)) return advance(current.reply)
    if (!matchesResident(current.goal,who)) return null
    const answer=current.choices?.find(item=>item.id===choice)
    if (!answer) return null
    return answer.advance ? advance(answer.reply) : result(true,answer.reply)
  }
  function update(dt,{x,z,driving,speed=0,inVehicle=driving,onFoot=false}={}) {
    if(usePrologue())return null
    const contract=selectedStory()
    if (contract) {
      if (record().status!=='active') return null
      const current=step(),goal=current.goal
      const movingInMode=contract===firstWork?driving:current.mode==='walk'?onFoot:current.mode==='vehicle'&&inVehicle
      if(!movingInMode)return null
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
  function spend(price){
    if(!natural(price)||!price||state.money<price)return wrong('현금이 부족해.')
    const money=state.money-price,saved=write({money})
    if(!saved.ok)return saved
    state.money=money
    return result(true,'결제 완료')
  }
  function transfer(amount){
    const money=state.money-amount,bank=state.bank+amount
    if(!Number.isSafeInteger(amount)||!amount||!natural(money)||!natural(bank))return wrong('이체할 잔액이 부족해.')
    const saved=write({money,bank})
    if(!saved.ok)return saved
    Object.assign(state,{money,bank})
    return result(true,amount>0?'예금 완료':'출금 완료')
  }
  function buy(id) {
    const item=goods.find(entry=>entry.id===id)
    if (!item) return wrong('판매하지 않는 물건이야.')
    if (state.money<item.price) return wrong('돈이 부족해.')
    const money=state.money-item.price,inventory={...state.inventory,[id]:state.inventory[id]+1}
    const saved=write({money,inventory})
    if(!saved.ok)return saved
    Object.assign(state,{money,inventory})
    return result(true,item.name+' 구매 완료')
  }
  function use(id,{hp,maxHealth,armor=0,repairable=false,reserveSpace=()=>0}={}) {
    const item=goods.find(entry=>entry.id===id)
    if (!item || !state.inventory[id]) return wrong('가방에 이 물건이 없어.')
    let effect,message
    switch(item.type){
      case 'heal':
        if (!Number.isFinite(hp) || !Number.isFinite(maxHealth) || hp<=0 || maxHealth<=hp) return wrong('지금은 체력을 회복할 수 없어.')
        effect={heal:Math.min(maxHealth-hp,item.amount)};message='체력 '+effect.heal+' 회복'
        break
      case 'armor':
        if(armor>0)return wrong('아직 보호 조끼가 남아 있어.')
        effect={armor:item.amount};message='보호 조끼 착용 · 피해 '+item.amount+' 흡수'
        break
      case 'repair':
        if(!repairable)return wrong('싱글플레이에서 파손된 차량을 정차시키거나 그 옆에 서야 해.')
        effect={repair:true};message='차량 수리 완료'
        break
      case 'ammo': {
        const amount=Math.min(item.amount,reserveSpace(item.weapon))
        if(!amount)return wrong('해당 무기가 없거나 예비탄이 가득 찼어.')
        effect={ammo:{weapon:item.weapon,amount}};message=item.name+' +'+amount
        break
      }
      case 'sprint':
        effect={sprintSeconds:item.amount};message='달리기 속도 증가 · '+item.amount+'초'
        break
      case 'permit':
        if (state.status!=='active' || state.remaining===null) return wrong('시간제 운전 중에 사용할 수 있어.')
        state.remaining+=item.amount;effect={driveSeconds:item.amount};message='운행 시간 +'+item.amount+'초'
        break
    }
    state.inventory[id]--
    save()
    return result(true,message,effect)
  }
  function snapshot() {
    const {index,remaining,money}=state
    const {status,reason}=record()
    const current=mission()
    const old={
      title:current.title, missionId:current.id, stage:selectedStory()?storyContracts.indexOf(current)+1:index+1,status,reason,remaining,money,bank:state.bank,
      objective:status==='complete' ? '마지막 교대가 떠났다. 항구를 자유롭게 둘러봐.' : status==='failed' ? reason : step().objective,
      goal:status==='active' ? {...step().goal} : null,
      items:goods.map(item=>({...item,count:state.inventory[item.id]})),
      found:discovered(basinPlate.id)?[basinPlate.title]:[],
      completed:missions.slice(0,state.status==='complete'?missions.length:index).map(item=>item.id),
      firstJobCompleted:state.firstJob.status==='complete',
      storyCompleted:storyContracts.filter(contract=>storyRun(state,contract).status==='complete').map(contract=>contract.id)
    }
    if(!prologue)return old
    const story=prologue.snapshot()
    const previousChapter=chapter&&prologue.complete?chapter.snapshot():null
    const later=currentChapter()===continuation?continuation?.snapshot():null
    return {...old,...(legacy?{}:later??previousChapter??story),
      storyCompleted:[...old.storyCompleted,...story.storyCompleted,...(previousChapter?.storyCompleted??[]),...(later?.storyCompleted??[])]}
  }
  function tracking(){
    if(usePrologue())return activeCampaign().tracking()
    if(record().status!=='active')return null
    const {goal,objective}=step()
    const contract=selectedStory()
    return {goal,objective,stage:state.index+1,step:record().step,title:mission().title,missionId:mission().id,remaining:state.remaining,firstWork:contract===firstWork,storyTitle:contract?.title}
  }
  function openingContact(){
    if(usePrologue())return activeCampaign().offer()
    if(state.status==='active'||record().status==='active'||selectedStory()||!canStartOpening())return null
    const next=nextStory()
    if(!next || next===firstWork&&(state.index!==0||state.status!=='available'))return null
    return {...next.contact,jobTitle:next.title}
  }
  return {snapshot,tracking,openingContact,choices,interact,update,start,retry,abandon,fail,buy,use,spend,transfer,purchaseEquipment,saveEquipment,discovered,discover,save,
    storyComment(resident){return this.chapter?.comment(resident)??null},
    get prologue(){return usePrologue()?prologue:null},
    get chapter(){return usePrologue()?currentChapter():null},
    get showingLegacy(){return legacy},
    switchJournal(){
      if(activeCampaign()?.active)return wrong('진행 중인 임무를 중단한 뒤 이전 의뢰를 확인하십시오.')
      legacy=!legacy
      return result(true,legacy?'이전 항만 의뢰':this.chapter?'새로운 일원':'잘못된 거래')
    },
    get savedEquipment(){return state.equipment},
    get openingActive(){return usePrologue()?activeCampaign().active:!!selectedStory()&&record().status==='active'},
    get roadClosed(){return !usePrologue()&&selectedStory()===firstWork&&this.openingActive&&!!step().roadClosed}}
}
