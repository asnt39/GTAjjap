function nearbyDirections(pos){
 if(pos.x<-148)return 'Foundry Garden에서 쉬어 가. 서쪽 끝엔 West Ferry Yard가 있어.'
 if(pos.x<-93)return 'West Bank Works 정비장은 Clock Street 너머 서편에 있어. 남쪽 마당으로 차를 가져가면 돼.'
 if(pos.z>57)return 'Clock Court 시계탑을 찾아봐. 광장에 안내도와 ATM이 있어.'
 if(pos.x<-35)return '조위 관측소는 이 시장 북쪽에 있어. 무기 상점은 차고지에서 대로를 따라 남쪽으로 가면 나와.'
 return '대로를 따라 북쪽으로 가면 하역장이고, Market Crossing에서 서쪽으로 가면 시장이야.'
}
// Choices live in the existing conversation. Leaving its range closes the shop too.
export function episodeUI(game,voice,sound=()=>{}) {
 const episode=game.episode, conversation=document.querySelector('#conversation')
 const choices=conversation.querySelector('.episode-choices'),line=conversation.querySelector('.spoken')
 let previous='', shopping=false, speaker=null, reply='',announcement=null
 function announce(message){
  const split=message?.indexOf(' · ')??-1
  if(split>0&&split<18)announcement={speaker:message.slice(0,split),text:message.slice(split+3),until:performance.now()+6500}
 }
 function option(id,label,action,description='') {
  const button=document.createElement('button')
  button.type='button';button.dataset.choice=id;button.textContent=label
  if(description){
   const detail=document.createElement('small')
   detail.textContent=description
   button.append(detail)
  }
  button.onclick=()=>{
   if(!game.crowd.talking||game.crowd.talking!==speaker)return
   const result=action()
   if(result?.message){reply=result.message}
  }
  choices.append(button)
 }
 function dialogue(defaultLine) {
  const npc=game.crowd.talking
  if(npc!==speaker){speaker=npc;shopping=false;reply='';previous=''}
  if(!npc){
   if(announcement&&performance.now()<announcement.until)voice.say(announcement.speaker,announcement.text)
   else{announcement=null;voice.stop()}
   return
  }
  announcement=null
  const state=episode.snapshot(),options=episode.choices(npc),offer=episode.openingContact(),comment=episode.storyComment(npc)
  let text=defaultLine
  if(reply)text=reply
  else if(offer?.residentId===npc.id&&offer.brief)text=offer.brief
  else if(comment)text=comment
  else if(npc.opening&&state.missionId==='delivery'&&state.stage===1&&state.status==='available')text=npc.opening
  else if(state.status==='complete'&&npc.epilogue)text=npc.epilogue
  const key=[npc.name,state.stage,state.status,state.money,shopping,...options.map(o=>o.id)].join('/')
  if(shopping)text=(reply?reply+'  ':'')+'잔액 ₩'+state.money.toLocaleString('ko-KR')
  if(line.textContent!==text)line.textContent=text
  if(shopping)voice.stop();else voice.say(npc.id,text)
  if(key===previous)return
  const focused=choices.contains(document.activeElement)?document.activeElement.dataset.choice:null
  previous=key;choices.replaceChildren()
  for(const item of options)option(item.id,item.label,()=>episode.interact({resident:npc,choice:item.id}))
  if(!shopping){
   option('greet','인사하기',()=>({message:npc.lines?.[0]??defaultLine}))
   option('directions','가까운 장소 묻기',()=>({message:nearbyDirections(npc.pos)}))
  }
  if(npc.id==='merchant'){
   option('shop',shopping?'물건 접기':'상품 보기',()=>{shopping=!shopping;reply=''})
   if(shopping){
    for(const item of state.items)option('buy-'+item.id,item.name+' · ₩'+item.price.toLocaleString('ko-KR'),()=>{
     const sale=episode.buy(item.id)
     if(sale.ok)sound('buy')
     return {...sale,message:sale.ok?item.name+' '+npc.purchase:npc.insufficient}
    },item.description)
   }
  }
  choices.hidden=!choices.childElementCount
  if(focused){
   const matching=[...choices.children].find(button=>button.dataset.choice===focused)
   const next=matching??choices.firstElementChild??conversation.querySelector('#dialogue-close')
   next.focus()
  }
 }
 function goal(driving) {
  const state=episode.tracking()
  const practice=!state&&game.mission.goal(driving)
  if(practice)return {...practice,title:'FIRST DRIVE',missionId:'first-drive'}
  const offer=!state&&episode.openingContact()
  if(!state&&!offer)return null
  const reboard=state?.firstWork&&!driving&&!state.goal.vehicle
  const goal=reboard?{...state.goal,vehicle:true}:game.storyFocus?.(state)??state?.goal??offer
  const npc=goal.residentId&&game.crowd.all.find(n=>n.id===goal.residentId)
  const point=goal.vehicle?game.cars.find(vehicle=>vehicle.id==='touring'):npc?.pos
  const label=offer?(offer.label??offer.resident)+'에게 가기':reboard?'Touring에 다시 탑승해':state.objective
  return {...goal,title:offer?.jobTitle??state?.title,step:state?.step,missionId:state?.missionId,
   remaining:state?.remaining,markerHeight:npc?npc.height+.31:goal.vehicle?1.85:goal.sight?1.95:.8,
   y:goal.residentId?point?.y:goal.y,x:point?.x??goal.x,z:point?.z??goal.z,label}
 }
 return {dialogue,goal,announce}
}
