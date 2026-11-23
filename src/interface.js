import {gear} from './equipment.js'
import './equipment.css'
import {inOldTown} from './old-town-plan.js'
import {episodeUI} from './episode-ui.js'
import {drawMap} from './cartography.js'
import {defaultRoomEndpoint} from './room-client.js'
import {ROOM_CODE} from './room-protocol.js'
import {sights} from './navigation.js'
const $=q=>document.querySelector(q)
const speaker=(on)=>'<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/>'+ (on?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>')+'</svg>'
function audioBed(){
 let ctx,output,shotNoise,motor,motorGain,roadGain,on=false
 const toggle=async()=>{if(!ctx){
  ctx=new AudioContext();const n=ctx.sampleRate*3,buffer=ctx.createBuffer(1,n,ctx.sampleRate),a=buffer.getChannelData(0);let last=0
  for(let i=0;i<n;i++){last=(last+.035*(Math.random()*2-1))/1.02;a[i]=last*3}
  shotNoise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.2),ctx.sampleRate)
  const noiseData=shotNoise.getChannelData(0)
  for(let i=0;i<noiseData.length;i++)noiseData[i]=Math.random()*2-1
  const wind=ctx.createBufferSource(),filter=ctx.createBiquadFilter();wind.buffer=buffer;wind.loop=true;filter.type='lowpass';filter.frequency.value=620
  output=ctx.createGain();output.gain.value=0;wind.connect(filter).connect(output).connect(ctx.destination);wind.start()
  motor=ctx.createOscillator();motor.type='sawtooth';motorGain=ctx.createGain();motorGain.gain.value=0
  const engineFilter=ctx.createBiquadFilter();engineFilter.type='lowpass';engineFilter.frequency.value=290
  motor.connect(engineFilter).connect(motorGain).connect(output);motor.start()
  roadGain=ctx.createGain();roadGain.gain.value=0;wind.connect(roadGain).connect(output)
  for(const freq of [49,73.5]){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=freq;gain.gain.value=.015;osc.connect(gain).connect(output);osc.start()}
 }
 await ctx.resume();on=!on;output.gain.setTargetAtTime(on?.28:0,ctx.currentTime,.14);return on}
 toggle.hit=()=>{if(!on||!ctx)return
  const now=ctx.currentTime,tone=ctx.createOscillator(),gain=ctx.createGain()
  tone.frequency.setValueAtTime(124,now);tone.frequency.exponentialRampToValueAtTime(48,now+.10)
  gain.gain.setValueAtTime(.34,now);gain.gain.exponentialRampToValueAtTime(.001,now+.13)
  tone.connect(gain).connect(output);tone.start(now);tone.stop(now+.14);tone.onended=()=>{tone.disconnect();gain.disconnect()}
 }
 toggle.shot=id=>{
  if(!on||!ctx)return
  const now=ctx.currentTime,duration=id==='shotgun'?.19:.10
  const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain()
  noise.buffer=shotNoise;filter.type='lowpass';filter.frequency.setValueAtTime(id==='shotgun'?1800:3100,now)
  filter.frequency.exponentialRampToValueAtTime(220,now+duration)
  gain.gain.setValueAtTime(.60,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration)
  noise.connect(filter).connect(gain).connect(output);noise.start();noise.stop(now+duration)
  noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect()}
 }
 toggle.engine=(active,car)=>{
  if(!ctx||!on)return
  const now=ctx.currentTime,speed=Math.abs(car.speed)
  motor.frequency.setTargetAtTime(34+speed*3.8+Math.max(0,car.accel)*2,now,.08)
  motorGain.gain.setTargetAtTime(active?.09+Math.min(.04,speed*.003):0,now,.07)
  roadGain.gain.setTargetAtTime(active?Math.min(1,speed*.056):0,now,.12)
 }
 return toggle
}
export function createUI(game){
 const overlay=$('#overlay'),head=$('#panel-title'),body=$('#panel-body'),interact=$('#interact')
 const toggleAudio=audioBed();let panel='',near=null,sounded=false,lastUi=-Infinity,priorFocus=null
 let timer
 const toast=message=>{const el=$('#toast');el.textContent=message;el.style.display='block';clearTimeout(timer);timer=setTimeout(()=>el.style.display='none',3000)}
 const wanted=document.createElement('aside');wanted.id='wanted';wanted.hidden=true;document.querySelector('#game').append(wanted)
 const story=episodeUI(game)
 const conversation=$('#conversation'),dialogueClose=$('#dialogue-close')
 dialogueClose.onclick=()=>game.crowd.endTalk()
 const missionGoal=()=>story.goal(game.driving()&&game.car.id==='touring')
 let visited=new Set()
 try{const saved=JSON.parse(localStorage.getItem('harborline.visits.v1')||'[]');if(Array.isArray(saved))visited=new Set(saved)}catch{}
 const row=(left,right)=>'<div class="control-row"><span>'+left+'</span><span>'+right+'</span></div>'
 const button=(action,label,end='›')=>'<button type="button" class="menubtn" data-action="'+action+'"><span>'+label+'</span><span>'+end+'</span></button>'
 function close(){
  if(panel==='rooms'&&game.room.phase==='connecting')game.room.leave()
  panel='';overlay.hidden=true;game.setPaused(false);if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});$('#world').focus({preventScroll:true})
 }
 function show(name){
  if(game.crowd.talking)return
  if(panel==='rooms'&&name!=='rooms'&&game.room.phase==='connecting')game.room.leave()
  if(!panel)priorFocus=document.activeElement;panel=name;game.setPaused(true);toggleAudio.engine(false,game.car);overlay.hidden=false;interact.hidden=true
  const journal=game.episode.snapshot()
  const menu={
   bag:['PORTSIDE','교대 수첩',row(journal.title,'₩'+journal.money.toLocaleString())+'<p>'+journal.objective+'</p>'+((journal.status==='failed'||(journal.status==='available'&&journal.stage>1))?button('retry','의뢰 재시도'):journal.status==='active'?button('abandon','의뢰 중단'):'')+journal.items.map(i=>i.count?button('use-'+i.id,i.name+' 사용',i.count+'개'):'').join('')],
   pause:['PORTSIDE DISTRICT','일시 정지',button('resume','탐험 계속하기','↵')+(!game.missionEnabled()||game.mission.active?'':button('mission',game.mission.completed?'FIRST DRIVE 다시 주행':'FIRST DRIVE 시운전 시작'))+button('bag','교대 수첩 · 소지품')+(game.mode()==='walk'?button('equipment','장비함','Q'):'')+button('rooms','온라인 플레이')+button('map','구역 지도','M')+button('controls','조작법','?')+button('runMode','Shift 달리기',game.foot.preference==='toggle'?'눌러 전환':'누르는 동안')+button('quality','그래픽 품질',game.quality())+button('credits','제작 · 라이선스')],
   equipment:['PORTSIDE','장비함',Object.entries(gear).map(([id,def])=>button('equip-'+id,def.name,game.loadout.selected===id?'장착 중':game.loadout.items[id]?'장착':'지급받기')).join('')+'<p class="smallnote">예비 탄약은 부두 정문 안내판에서 보급받을 수 있어. 온라인 방에서도 장비와 전투는 각자 진행해.</p>'],
   rooms:['HARBORLINE','온라인 플레이','<div id="room-controls"></div><p class="smallnote">캐릭터와 차량을 공유하는 비공개 방이야. 주민, 전투와 스토리는 각자 진행해.</p>'],
   controls:['FIELD MANUAL','조작법',row('이동','<kbd>W A S D</kbd>')+row('달리기 전환 · 점프','<kbd>Shift</kbd> · <kbd>Space</kbd>')+row('시점 회전','화면 드래그 · <kbd>← →</kbd>')+row('카메라 거리','마우스 휠')+row('장비함 · 무기 변경','<kbd>Q</kbd> · <kbd>1–4</kbd>')+row('공격 · 조준','<kbd>F</kbd> / 좌클릭 · 우클릭 누르기')+row('재장전','<kbd>R</kbd>')+row('대화 · 안내판 · 승하차','<kbd>E</kbd>')+row('가속 · 제동 후 후진','<kbd>W</kbd> / <kbd>S</kbd>')+row('조향 · 핸드브레이크','<kbd>A D</kbd> · <kbd>Space</kbd>')+row('구역 지도 · 일시 정지','<kbd>M</kbd> · <kbd>Esc</kbd>')+'<p class="smallnote">터치 화면에서는 왼쪽 조이스틱으로 걷고 오른쪽 화면을 밀어 둘러봐. 조이스틱을 끝까지 밀면 달려. 오른쪽 버튼으로 점프하거나 공격해. Shift 전환은 멈췄다가 다시 걸어도 유지되고 메뉴나 차량에 들어가면 해제돼.</p>'],
   map:['PORT AUTHORITY','Portside District','<canvas class="big-map" aria-label="구역 안내도"></canvas><div class="map-list">'+sights.map(s=>'<div><span>◇ '+s.tag+'</span>'+s.title+(visited.has(s.tag)?'　✓':'')+'</div>').join('')+'</div>'],
   credits:['HARBORLINE','제작 · 라이선스','<p>도시 배치, 항만 시설, 간판, 항구 환경음은 이 게임을 위해 제작했어.</p><div id="credit-list"></div>']
  }
  if(name==='sight'&&near){const result=game.episode.interact({sight:near.tag});if(result)toast(result.message);menu.sight=['PORT AUTHORITY  /  '+near.tag,near.title,'<p>'+near.body+'</p>'];visited.add(near.tag);try{localStorage.setItem('harborline.visits.v1',JSON.stringify([...visited]))}catch{}}
  if(name==='sight'&&near?.tag==='01')menu.sight[2]+=button('resupply','예비 탄약 보급')
  if(name==='sight'&&near?.tag==='05'){
   menu.sight[2]+=row('잔액','₩'+journal.money.toLocaleString())+journal.items.map(i=>button('order-'+i.id,i.name,'₩'+i.price.toLocaleString())).join('')
  }
  if(name==='sight'&&near?.tag==='06')menu.sight[2]+=button('lamp-test','작업대 시험등 점등')
  const content=menu[name];
  if(name==='pause'){const s=game.stats();if(s.ms>0)content[2]+='<p class="smallnote">최근 평균 '+Math.round(1000/s.ms)+' FPS · '+s.width+' × '+s.height+' · '+s.calls+' 드로 콜</p>'}
  $('#eyebrow').textContent=content[0];head.textContent=content[1];body.innerHTML=content[2]
  if(name==='rooms')updateRoom()
  if(name==='map')drawMap($('.big-map'),game.pos,game.yaw(),true,game.cars,missionGoal())
  if(name==='credits'){for(const [label,path] of [['휴대 장비','equipment/CREDITS.md'],['캐릭터 · 애니메이션','character/CREDITS.md'],['건축 표면','architecture/CREDITS.md'],['도로 · 차량 · 식생','street/CREDITS.md'],['항만 재질','port/CREDITS.txt'],['환경 조명','sky/CREDITS.md'],['Noto Sans KR 글꼴','fonts/OFL-NotoSansKR.txt'],['Barlow Condensed 글꼴','fonts/OFL-BarlowCondensed.txt'],['Three.js','THREE-LICENSE.txt']]){let a=document.createElement('a');a.href=window.harborPreviewAssets?.['/assets/'+path]||'/assets/'+path;a.target='_blank';a.rel='noopener';a.className='menubtn';a.textContent=label;$('#credit-list').append(a)}}
  $('#close').focus({preventScroll:true})
 }
 let roomForm,code=''
 const playMode=$('#play-mode')
 function updateRoom(){
  const root=$('#room-controls'),room=game.room
  const phase=room.phase
  playMode.textContent=phase==='connected'?'온라인 플레이':phase==='reconnecting'?'온라인 · 재접속 중':'싱글플레이'
  if(!root){roomForm=null;return}
  if(!defaultRoomEndpoint){
   root.textContent='온라인 서버 준비 중. 지금은 싱글플레이를 이용할 수 있어.'
   return
  }
  if(roomForm?.root!==root||roomForm.phase!==phase){
   if(phase==='offline'){
    root.innerHTML='<form id="room-form">'+
     '<label for="room-code">12자리 초대 코드</label><input id="room-code" type="text" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false">'+
     button('roomCreate','방 만들기')+button('roomJoin','코드로 입장')+
     '</form><p id="room-message" class="smallnote" role="status"></p>'
    $('#room-code').value=code
    $('#room-code').oninput=e=>{code=e.target.value}
    $('#room-form').onsubmit=e=>{e.preventDefault();joinRoom(false)}
    $('#room-code').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();joinRoom(false)}}
   }else if(phase==='connected'){
    root.innerHTML='<p>초대 코드 <strong id="room-invite"></strong></p>'+
     '<p id="room-roster"></p>'+button('resume','온라인 플레이 계속')+button('roomLeave','방 나가기')+
     '<p id="room-message" class="smallnote" role="status"></p>'
   }else root.innerHTML=button('roomLeave','취소')+'<p id="room-message" class="smallnote" role="status"></p>'
   roomForm={root,phase}
  }
  $('#room-message').textContent=room.message
  if(phase==='connected'){
   $('#room-invite').textContent=room.session.code
   $('#room-roster').textContent=room.roster.length+' / 4 · '+room.roster.map(p=>
    'P'+p.number+(p.id===room.session.id?' (나)':'')+(p.id===room.host?' (방장)':'')).join(' · ')
  }
 }
 function joinRoom(create){
  code=code.trim().toUpperCase()
  if(!create&&!ROOM_CODE.test(code)){$('#room-message').textContent='12자리 방 코드를 확인해';return}
  game.startRoom(defaultRoomEndpoint,create?{t:'create'}:{t:'join',code})
 }
 $('#sound').innerHTML=speaker(false);$('#sound').onclick=async()=>{try{sounded=await toggleAudio();const el=$('#sound');el.innerHTML=speaker(sounded);el.title=el.ariaLabel='항구 환경음 '+(sounded?'끄기':'켜기');el.setAttribute('aria-pressed',String(sounded))}catch{$('#sound').title='환경음을 재생할 수 없어'}}
 $('#pause').onclick=()=>show('pause');$('#controls').onclick=()=>show('controls');$('#mini-button').onclick=()=>show('map');$('#close').onclick=close
 overlay.onclick=e=>{if(e.target===overlay)close();const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(panel==='equipment'&&action.startsWith('equip-')){
   const id=action.slice(6)
   if(game.selectEquipment(id)){close();toast(gear[id].name+' 장착')}else toast('동작을 마친 뒤 장비를 변경해')
   return
  }
  if(action==='resupply'&&panel==='sight'&&near?.tag==='01'){game.loadout.resupply();close();toast('예비 탄약 보급 완료');return}
  if(action==='lamp-test'&&panel==='sight'&&near?.tag==='06'){close();game.testSignal();toast('시험등 점등 · 6초 뒤 자동 소등');return}
  if(action.startsWith('order-')&&panel==='sight'&&near?.tag==='05'){toast(game.episode.buy(action.slice(6)).message);show('sight');return}
  if(action==='roomCreate'||action==='roomJoin'||action==='roomLeave'){
   e.preventDefault();if(action==='roomLeave')game.room.leave();else joinRoom(action==='roomCreate');return
  }
  if(action==='retry'||action==='abandon'||action.startsWith('use-')){const result=action==='retry'?game.episode.retry():action==='abandon'?game.episode.abandon():game.useItem(action.slice(4));toast(result.message);show('bag');return}if(action==='mission'){game.mission.start(game.driving()&&game.car.id==='touring');close();toast('FIRST DRIVE · 지도에 표시된 목표로 이동해')}else if(action==='runMode'){game.foot.changePreference();show('pause')}else if(action==='resume')close();else if(action==='quality'){game.cycleQuality();show('pause')}else show(action)}
 function activate(){if(game.interactCar()||game.converse())return;const sign=sights.find(s=>Math.hypot(game.pos.x-s.x,game.pos.z-s.z)<3.6);if(sign){near=sign;show('sight')}}
 interact.onclick=activate
 window.addEventListener('keydown',e=>{
  if(e.repeat)return
  if(e.target instanceof HTMLInputElement&&!['Escape','Tab'].includes(e.code))return
  if(game.crowd.talking && (e.code==='Escape'||e.code==='KeyE')){
   e.preventDefault();game.crowd.endTalk();return
  }
  if(e.code==='Escape'){e.preventDefault();panel?close():show('pause')}
  if(e.code==='KeyM'){e.preventDefault();panel==='map'?close():show('map')}
  if(e.code==='Slash'&&e.shiftKey){panel==='controls'?close():show('controls')}
  if(e.code==='KeyE'&&!panel){e.preventDefault();activate()}
  if(e.code==='Enter'&&panel==='pause'&&document.activeElement===$('#close')){e.preventDefault();close()}
  if(e.code==='Tab'&&panel){const f=[...$('#panel').querySelectorAll('button,a,input')];if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus()}}
 })
 const bearingElements=[]
 for(let n=0;n<21;n++){let el=document.createElement('span');$('#bearings').append(el);bearingElements.push(el)}
 function update(t){
  if(t-lastUi<.08)return;lastUi=t
  const p=game.pos,y=game.yaw(),degrees=(y*180/Math.PI)%360
  const law=game.crowd.wanted;wanted.hidden=!law.level
  if(law.level)wanted.textContent='수배 '+law.level+' · '+({investigate:'조사',pursuit:'추격',search:'수색'}[law.phase])
  const driving=game.driving(),goal=missionGoal()
  document.body.classList.toggle('driving',driving)
  $('#speed').hidden=!driving;$('#speed b').textContent=Math.round(Math.abs(game.car.speed)*3.6)
  $('#speed small').textContent=game.car.speed<-.08?'R':'D'
  $('#objective').hidden=!goal;if(goal)$('#objective').textContent=goal.label
  toggleAudio.engine(driving&&!panel,game.car)
  const equipped=game.loadout,gun=!!equipped.def.capacity,walking=game.mode()==='walk'&&!game.crowd.talking&&!panel
  $('#equipment-hud').hidden=!walking
  $('#gear-reticle').hidden=!walking||!gun||!!game.player.f.action
  $('#gear-aim').hidden=$('#gear-reload').hidden=!gun
  $('#gear-aim').setAttribute('aria-pressed',String(game.aiming()))
  $('#gear-reload').disabled=equipped.reloading||!equipped.item.reserve||equipped.item.mag===equipped.def.capacity
  $('#gear-status').hidden=equipped.selected==='fists'
  $('#gear-status').textContent=equipped.def.name+(gun?' · '+(equipped.reloading?'재장전 중':equipped.item.mag+' / '+equipped.item.reserve):'')
  $('#punch').setAttribute('aria-label',gun?'발사':equipped.selected==='bat'?'방망이 공격':'주먹 공격')
  $('#jump').disabled=!game.canJump()
  $('#punch').disabled=game.mode()!=='walk'||game.foot.air||game.player.f.action==='down'
  const dialogue=game.crowd.dialogue,box=conversation
  const opened=!!dialogue&&!panel&&(box.hidden||box.inert)
  if(dialogue&&!panel){
   box.hidden=false;box.inert=false;box.classList.remove('leaving')
  }else if(!box.hidden&&!box.inert){
   if(box.contains(document.activeElement))$('#world').focus({preventScroll:true})
   box.inert=true;box.classList.add('leaving')
   setTimeout(()=>{if(box.inert)box.hidden=true},140)
  }
  if(dialogue&&box.querySelector('strong').textContent!==dialogue.name){
   box.querySelector('strong').textContent=dialogue.name;box.querySelector('small').textContent=dialogue.role
  }
  document.body.classList.toggle('speaking',!!dialogue&&!panel)
  story.dialogue(dialogue?.text)
  if(opened)(box.querySelector('.episode-choices button')??dialogueClose).focus({preventScroll:true})
  const target=game.feedback(),health=$('#vitals')
  const armor=game.player.f.armor
  health.hidden=panel||driving||(!target&&game.player.f.hp===100&&!armor)
  if(!health.hidden){
   health.querySelector('b').textContent=game.player.f.hp===0?'다운':'체력 '+game.player.f.hp+(armor?' · 보호 '+armor:'')
   const opponent=health.querySelector('span')
   opponent.textContent=target?target.name+' · '+(target.f.hp?target.f.hp+' / '+target.f.maxHealth:'다운'):''
  }
  if(!panel){
   near=game.canAct()?sights.find(s=>Math.hypot(p.x-s.x,p.z-s.z)<3.6):null
   const label=game.prompt()||near?.name;interact.hidden=!label
   if(label)interact.querySelector('span').textContent=label
  }
  $('#loc-name').textContent=inOldTown(p.x,p.z)?'Old Town':p.x<-36?'Tide Market':p.x>11?'West Quay':Math.abs(p.z+37)<7?'Market Crossing':'Breakwater Ave.'
  drawMap($('#mini'),p,y,false,game.cars,goal)
  const compass=$('.compass').clientWidth,base=Math.round(degrees/7.5)
  bearingElements.forEach((el,i)=>{const step=base+i-10,normalized=(step%48+48)%48,card=normalized%6===0;el.className=card?'':'tick';el.textContent=card?['N','NE','E','SE','S','SW','W','NW'][normalized/6]:'';el.style.left=(compass/2+(step*7.5-degrees)*2.2)+'px'})
 }
 function impact(received){
  toggleAudio.hit()
  const el=$('#vitals');el.animate?.([{opacity:.55,color:received?'#ff9b77':'#ffd3a1'},{opacity:1,color:'#f5f2e9'}],{duration:240})
 }
 return {update,updateRoom,show,close,toast,impact,shot:toggleAudio.shot,missionGoal,isOpen:()=>!!panel}
}
