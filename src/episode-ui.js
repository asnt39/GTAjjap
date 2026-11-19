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
 function dialogue() {
  const npc=game.crowd.talking
  if(npc!==speaker){speaker=npc;shopping=false;reply='';previous=''}
  if(!npc)return
  const state=episode.snapshot(), options=episode.choices(npc.name)
  const line=conversation.querySelector('.spoken')
  if(reply)line.textContent=reply
  else if(npc.id==='courier'&&state.status==='available')line.textContent='출항표에서 마지막 교대가 빠졌어. 시장에 봉투 하나 전해 줄래?'
  else if(state.status==='complete'&&npc.id==='merchant')line.textContent='교대 배는 제시간에 떠났어요. 그런데 이 도장 좀 보세요. 우리 사무실 것이 아니에요.'
  const key=[npc.name,state.stage,state.status,state.money,shopping,...options.map(o=>o.id)].join('/')
  if(key===previous)return
  previous=key;choices.replaceChildren()
  for(const item of options)option(item.label,()=>episode.interact({resident:npc.name,choice:item.id}))
  if(npc.id==='merchant'){
   option(shopping?'물건 접기':'상품 보기',()=>{shopping=!shopping})
   if(shopping){
    line.textContent='소지금 ₩'+state.money.toLocaleString()
    for(const item of state.items)option(item.name+' · ₩'+item.price+' · '+item.description,()=>{const sale=episode.buy(item.id);return {...sale,message:sale.ok?item.name+' 여기 있어요. 조심히 다녀오세요.':'잔액이 조금 모자라세요.'}})
   }
  }
  option('대화 마치기',()=>game.crowd.endTalk())
 }
 function goal(driving) {
  const state=episode.snapshot(), goal=state.goal
  if(!goal)return game.mission.goal(driving)
  const point=goal.vehicle?game.cars.find(vehicle=>vehicle.id==='touring'):game.crowd.all.find(n=>n.name===goal.resident)?.pos
  return {...goal,x:point?.x??goal.x,z:point?.z??goal.z,label:state.stage+'/4 · '+state.objective+(state.remaining===null?'':' · '+Math.ceil(state.remaining)+'초')}
 }
 return {dialogue,goal}
}
