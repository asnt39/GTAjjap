// Choices live in the existing conversation. Leaving its range closes the shop too.
export function episodeUI(game, toast) {
 const episode=game.episode, conversation=document.querySelector('#conversation')
 const choices=document.createElement('div')
 choices.className='episode-choices'
 conversation.append(choices)
 let previous='', shopping=false, speaker=null, reply=''
 function option(label, action) {
  const button=document.createElement('button')
  button.type='button';button.textContent=label
  button.onclick=()=>{
   if(!game.crowd.talking||game.crowd.talking!==speaker)return
   const result=action()
   if(result?.message){reply=result.message}
   previous=''
  }
  choices.append(button)
 }
 function dialogue(defaultLine) {
  const npc=game.crowd.talking
  if(npc!==speaker){speaker=npc;shopping=false;reply='';previous=''}
  if(!npc)return
  const state=episode.snapshot(), options=episode.choices(npc)
  const line=conversation.querySelector('.spoken')
  let text=defaultLine
  if(reply)text=reply
  else if(npc.opening&&state.stage===1&&state.status==='available')text=npc.opening
  else if(state.status==='complete'&&npc.epilogue)text=npc.epilogue
  const key=[npc.name,state.stage,state.status,state.money,shopping,...options.map(o=>o.id)].join('/')
  if(shopping)text=(reply?reply+'  ':'')+'잔액 ₩'+state.money.toLocaleString('ko-KR')
  if(line.textContent!==text)line.textContent=text
  if(key===previous)return
  previous=key;choices.replaceChildren()
  for(const item of options)option(item.label,()=>episode.interact({resident:npc,choice:item.id}))
  if(npc.id==='merchant'){
   option(shopping?'물건 접기':'상품 보기',()=>{shopping=!shopping;reply=''})
   if(shopping){
    for(const item of state.items)option(item.name+' · ₩'+item.price+' · '+item.description,()=>{const sale=episode.buy(item.id);return {...sale,message:sale.ok?item.name+' '+npc.purchase:npc.insufficient}})
   }
  }
  option('대화 마치기',()=>game.crowd.endTalk())
 }
 function goal(driving) {
  const state=episode.tracking()
  if(!state)return game.mission.goal(driving)
  const {goal}=state
  const npc=goal.residentId&&game.crowd.all.find(n=>n.id===goal.residentId)
  const point=goal.vehicle?game.cars.find(vehicle=>vehicle.id==='touring'):npc?.pos
  return {...goal,markerHeight:npc?npc.height+.31:goal.vehicle?1.85:goal.sight?1.95:.8,y:goal.residentId?point?.y:undefined,x:point?.x??goal.x,z:point?.z??goal.z,label:state.stage+'/4 · '+state.objective+(state.remaining===null?'':' · '+Math.ceil(state.remaining)+'초')}
 }
 return {dialogue,goal}
}
