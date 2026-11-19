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
   if(result?.message){reply=result.message;toast(reply)}
   previous=''
  }
  choices.append(button)
 }
 function dialogue() {
  const npc=game.crowd.talking
  if(npc!==speaker){speaker=npc;shopping=false;reply='';previous=''}
  if(!npc)return
  const state=episode.snapshot(), options=episode.choices(npc.name)
  const line=conversation.querySelector('span')
  if(reply)line.textContent=reply
  else if(npc.name==='도현'&&state.status==='available')line.textContent='출항표에서 마지막 교대가 빠졌어. 시장에 봉투 하나 전해 줄래?'
  else if(state.status==='complete'&&npc.name==='윤서')line.textContent='교대는 무사히 떠났어. 그런데 봉투에 찍힌 도장은 우리 사무실 게 아니야.'
  const key=[npc.name,state.stage,state.status,state.money,shopping,...options.map(o=>o.id)].join('/')
  if(key===previous)return
  previous=key;choices.replaceChildren()
  for(const item of options)option(item.label,()=>episode.interact({resident:npc.name,choice:item.id}))
  if(npc.name==='윤서'){
   option(shopping?'물건 접기':'상품 보기',()=>{shopping=!shopping})
   if(shopping){
    line.textContent='소지금 ₩'+state.money.toLocaleString()
    for(const item of state.items)option(item.name+' · ₩'+item.price+' · '+item.description,()=>episode.buy(item.id))
   }
  }
  option('대화 마치기',()=>game.crowd.endTalk())
 }
 function goal(driving) {
  const state=episode.snapshot(), goal=state.goal
  if(!goal)return game.mission.goal(driving)
  const point=goal.vehicle?game.car:game.crowd.all.find(n=>n.name===goal.resident)?.pos
  return {...goal,x:point?.x??goal.x,z:point?.z??goal.z,label:state.stage+'/4 · '+state.objective+(state.remaining===null?'':' · '+Math.ceil(state.remaining)+'초')}
 }
 return {dialogue,goal}
}
