// Choices live in the existing conversation. Leaving its range closes the shop too.
export function episodeUI(game,voice) {
 const episode=game.episode, conversation=document.querySelector('#conversation')
 const choices=conversation.querySelector('.episode-choices'),line=conversation.querySelector('.spoken')
 let previous='', shopping=false, speaker=null, reply=''
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
  if(!npc){voice.stop();return}
  const state=episode.snapshot(), options=episode.choices(npc)
  let text=defaultLine
  if(reply)text=reply
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
  if(npc.id==='merchant'){
   option('shop',shopping?'물건 접기':'상품 보기',()=>{shopping=!shopping;reply=''})
   if(shopping){
    for(const item of state.items)option('buy-'+item.id,item.name+' · ₩'+item.price.toLocaleString('ko-KR'),()=>{
     const sale=episode.buy(item.id)
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
  if(practice)return practice
  const offer=!state&&episode.openingContact()
  if(!state&&!offer)return null
  const reboard=state?.firstWork&&!driving&&!state.goal.vehicle
  const goal=reboard?{...state.goal,vehicle:true}:state?.goal??offer
  const npc=goal.residentId&&game.crowd.all.find(n=>n.id===goal.residentId)
  const point=goal.vehicle?game.cars.find(vehicle=>vehicle.id==='touring'):npc?.pos
  const label=offer?offer.jobTitle+' · '+offer.resident+'에게 가기':state.storyTitle?
   state.storyTitle+' · '+(reboard?'Touring에 다시 탑승해.':state.objective):
   state.stage+'/4 · '+state.objective+(state.remaining===null?'':' · '+Math.ceil(state.remaining)+'초')
  return {...goal,markerHeight:npc?npc.height+.31:goal.vehicle?1.85:goal.sight?1.95:.8,
   y:goal.residentId?point?.y:undefined,x:point?.x??goal.x,z:point?.z??goal.z,label}
 }
 return {dialogue,goal}
}
