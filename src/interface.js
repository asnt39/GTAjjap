import {episodeUI} from './episode-ui.js'
import {drawMap} from './cartography.js'
import {defaultRoomEndpoint} from './room-client.js'
import {ROOM_CODE} from './room-protocol.js'
import {sights} from './navigation.js'
const $=q=>document.querySelector(q)
const speaker=(on)=>'<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/>'+ (on?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>')+'</svg>'
function audioBed(){
 let ctx,output,motor,motorGain,roadGain,on=false
 const toggle=async()=>{if(!ctx){
  ctx=new AudioContext();const n=ctx.sampleRate*3,buffer=ctx.createBuffer(1,n,ctx.sampleRate),a=buffer.getChannelData(0);let last=0
  for(let i=0;i<n;i++){last=(last+.035*(Math.random()*2-1))/1.02;a[i]=last*3}
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
 const story=episodeUI(game,toast)
 let visited=new Set()
 try{const saved=JSON.parse(localStorage.getItem('harborline.visits.v1')||'[]');if(Array.isArray(saved))visited=new Set(saved)}catch{}
 const row=(left,right)=>'<div class="control-row"><span>'+left+'</span><span>'+right+'</span></div>'
 const button=(action,label,end='›')=>'<button type="button" class="menubtn" data-action="'+action+'"><span>'+label+'</span><span>'+end+'</span></button>'
 function close(){
  panel='';overlay.hidden=true;game.setPaused(false);if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});$('#world').focus({preventScroll:true})
 }
 function show(name){
  if(!panel)priorFocus=document.activeElement;panel=name;game.setPaused(true);toggleAudio.engine(false,game.car);overlay.hidden=false;interact.hidden=true
  const journal=game.episode.snapshot()
  const menu={
   bag:['PORTSIDE','교대 수첩',row(journal.title,'₩'+journal.money.toLocaleString())+'<p>'+journal.objective+'</p>'+((journal.status==='failed'||(journal.status==='available'&&journal.stage>1))?button('retry','의뢰 재시도'):journal.status==='active'?button('abandon','의뢰 중단'):'')+journal.items.map(i=>i.count?button('use-'+i.id,i.name+' 사용',i.count+'개'):'').join('')],
   pause:['PORTSIDE DISTRICT','일시 정지',button('resume','탐험 계속하기','↵')+(!game.missionEnabled()||game.mission.active?'':button('mission',game.mission.completed?'FIRST DRIVE 다시 주행':'FIRST DRIVE 시운전 시작'))+button('bag','교대 수첩 · 소지품')+(defaultRoomEndpoint?button('rooms','비공개 멀티플레이'):'<p class="smallnote">온라인 멀티플레이 준비 중</p>')+button('map','구역 지도','M')+button('controls','조작법','?')+button('runMode','Shift 달리기',game.foot.preference==='toggle'?'눌러 전환':'누르는 동안')+button('quality','그래픽 품질',game.quality())+button('credits','제작 · 라이선스')],
   rooms:['HARBORLINE','비공개 멀티플레이','<div id="room-controls"></div>'],
   controls:['FIELD MANUAL','조작법',row('이동','<kbd>W A S D</kbd>')+row('달리기 전환 · 점프','<kbd>Shift</kbd> · <kbd>Space</kbd>')+row('시점 회전','화면 드래그 · <kbd>← →</kbd>')+row('카메라 거리','마우스 휠')+row('주먹 공격','<kbd>F</kbd>')+row('대화 · 안내판 · 승하차','<kbd>E</kbd>')+row('가속 · 제동 후 후진','<kbd>W</kbd> / <kbd>S</kbd>')+row('조향 · 핸드브레이크','<kbd>A D</kbd> · <kbd>Space</kbd>')+row('구역 지도 · 일시 정지','<kbd>M</kbd> · <kbd>Esc</kbd>')+'<p class="smallnote">터치 화면에서는 왼쪽 조이스틱으로 걷고 오른쪽 화면을 밀어 둘러봐. 조이스틱을 끝까지 밀면 달려. 오른쪽 버튼으로 점프하거나 공격해. Shift 전환은 멈췄다가 다시 걸어도 유지되고 메뉴나 차량에 들어가면 해제돼.</p>'],
   map:['PORT AUTHORITY','Portside District','<canvas class="big-map" aria-label="구역 안내도"></canvas><div class="map-list">'+sights.map(s=>'<div><span>◇ '+s.tag+'</span>'+s.title+(visited.has(s.tag)?'　✓':'')+'</div>').join('')+'</div>'],
   credits:['HARBORLINE','제작 · 라이선스','<p>도시 배치, 항만 시설, 간판, 항구 환경음은 이 게임을 위해 제작했어.</p><div id="credit-list"></div>']
  }
  if(name==='sight'&&near){const result=game.episode.interact({sight:near.tag});if(result)toast(result.message);menu.sight=['PORT AUTHORITY  /  '+near.tag,near.title,'<p>'+near.body+'</p>'];visited.add(near.tag);try{localStorage.setItem('harborline.visits.v1',JSON.stringify([...visited]))}catch{}}
  const content=menu[name];
  if(name==='pause'){const s=game.stats();if(s.ms>0)content[2]+='<p class="smallnote">최근 평균 '+Math.round(1000/s.ms)+' FPS · '+s.width+' × '+s.height+' · '+s.calls+' 드로 콜</p>'}
  $('#eyebrow').textContent=content[0];head.textContent=content[1];body.innerHTML=content[2]
  if(name==='rooms')updateRoom()
  if(name==='map')drawMap($('.big-map'),game.pos,game.yaw(),true,game.cars,story.goal(game.driving()&&game.car.id==='touring'))
  if(name==='credits'){for(const [label,path] of [['캐릭터 · 애니메이션','character/CREDITS.md'],['건축 표면','architecture/CREDITS.md'],['도로 · 차량 · 식생','street/CREDITS.md'],['항만 재질','port/CREDITS.txt'],['환경 조명','sky/CREDITS.md'],['Barlow 글꼴','fonts/OFL-Barlow.txt'],['Three.js','THREE-LICENSE.txt']]){let a=document.createElement('a');a.href=window.harborPreviewAssets?.['/assets/'+path]||'/assets/'+path;a.target='_blank';a.rel='noopener';a.className='menubtn';a.textContent=label;$('#credit-list').append(a)}}
  $('#close').focus({preventScroll:true})
 }
 let roomForm,endpoint=defaultRoomEndpoint,code=''
 function updateRoom(){
  const root=$('#room-controls'),room=game.room
  if(!root){roomForm=null;return}
  const phase=room.phase
  if(roomForm?.root!==root||roomForm.phase!==phase){
   if(phase==='offline'){
    root.innerHTML='<form id="room-form"><label for="room-endpoint">서버 주소</label>'+
     '<input id="room-endpoint" type="text" placeholder="wss://…" spellcheck="false" required>'+
     '<label for="room-code">초대 코드</label><input id="room-code" type="text" maxlength="12" autocapitalize="characters" spellcheck="false">'+
     button('roomCreate','방 만들기')+button('roomJoin','코드로 입장')+
     '</form><p id="room-message" class="smallnote" role="status"></p>'
    $('#room-endpoint').value=endpoint;$('#room-code').value=code
    $('#room-endpoint').oninput=e=>{endpoint=e.target.value}
    $('#room-code').oninput=e=>{code=e.target.value}
    $('#room-form').onsubmit=e=>{e.preventDefault();joinRoom(false)}
    $('#room-code').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();joinRoom(false)}}
   }else if(phase==='connected'){
    root.innerHTML='<p>초대 코드 <strong id="room-invite"></strong></p>'+
     '<p id="room-roster"></p>'+button('roomLeave','방 나가기')+
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
  game.startRoom(endpoint,create?{t:'create'}:{t:'join',code})
 }
 $('#sound').innerHTML=speaker(false);$('#sound').onclick=async()=>{try{sounded=await toggleAudio();const el=$('#sound');el.innerHTML=speaker(sounded);el.title=el.ariaLabel='항구 환경음 '+(sounded?'끄기':'켜기');el.setAttribute('aria-pressed',String(sounded))}catch{$('#sound').title='환경음을 재생할 수 없어'}}
 $('#pause').onclick=()=>show('pause');$('#controls').onclick=()=>show('controls');$('#mini-button').onclick=()=>show('map');$('#close').onclick=close
 overlay.onclick=e=>{if(e.target===overlay)close();const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='roomCreate'||action==='roomJoin'||action==='roomLeave'){
   e.preventDefault();if(action==='roomLeave')game.room.leave();else joinRoom(action==='roomCreate');return
  }
  if(action==='retry'||action==='abandon'||action.startsWith('use-')){const result=action==='retry'?game.episode.retry():action==='abandon'?game.episode.abandon():game.useItem(action.slice(4));toast(result.message);show('bag');return}if(action==='mission'){game.mission.start(game.driving()&&game.car.id==='touring');close();toast('FIRST DRIVE · 지도에 표시된 목표로 이동해')}else if(action==='runMode'){game.foot.changePreference();show('pause')}else if(action==='resume')close();else if(action==='quality'){game.cycleQuality();show('pause')}else show(action)}
 function activate(){if(game.interactCar()||game.converse())return;const sign=sights.find(s=>Math.hypot(game.pos.x-s.x,game.pos.z-s.z)<3.6);if(sign){near=sign;show('sight')}}
 interact.onclick=activate
 window.addEventListener('keydown',e=>{
  if(e.repeat)return
  if(e.target instanceof HTMLInputElement&&!['Escape','Tab'].includes(e.code))return
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
  const driving=game.driving(),goal=story.goal(driving&&game.car.id==='touring')
  document.body.classList.toggle('driving',driving)
  $('#speed').hidden=!driving;$('#speed b').textContent=Math.round(Math.abs(game.car.speed)*3.6)
  $('#speed small').textContent=game.car.speed<-.08?'R':'D'
  $('#objective').hidden=!goal;if(goal)$('#objective').textContent=goal.label
  toggleAudio.engine(driving&&!panel,game.car)
  $('#jump').disabled=!game.canAct()||!!game.crowd.talking
  $('#punch').disabled=game.mode()!=='walk'||game.foot.air||['down','hit'].includes(game.player.f.action)
  const dialogue=game.crowd.dialogue,box=$('#conversation')
  box.hidden=!dialogue||panel
  if(dialogue){box.querySelector('strong').textContent=dialogue.name+' · '+dialogue.role;box.querySelector('span').textContent=dialogue.text}
  story.dialogue()
  const target=game.feedback(),health=$('#vitals')
  health.hidden=panel||driving||(!target&&game.player.f.hp===100)
  if(!health.hidden){
   health.querySelector('b').textContent=game.player.f.hp===0?'다운':'체력 '+game.player.f.hp
   const opponent=health.querySelector('span')
   opponent.textContent=target?target.name+' · '+(target.f.hp?target.f.hp+' / '+target.f.maxHealth:'다운'):''
  }
  if(!panel){
   near=game.canAct()?sights.find(s=>Math.hypot(p.x-s.x,p.z-s.z)<3.6):null
   const label=game.prompt()||near?.name;interact.hidden=!label
   if(label)interact.querySelector('span').textContent=label
  }
  $('#loc-name').textContent=p.x>11?'West Quay':Math.abs(p.z+37)<7?'Market Crossing':'Breakwater Ave.'
  drawMap($('#mini'),p,y,false,game.cars,goal)
  const compass=$('.compass').clientWidth,base=Math.round(degrees/7.5)
  bearingElements.forEach((el,i)=>{const step=base+i-10,normalized=(step%48+48)%48,card=normalized%6===0;el.className=card?'':'tick';el.textContent=card?['N','NE','E','SE','S','SW','W','NW'][normalized/6]:'';el.style.left=(compass/2+(step*7.5-degrees)*2.2)+'px'})
 }
 function impact(received){
  toggleAudio.hit()
  const el=$('#vitals');el.animate?.([{opacity:.55,color:received?'#ff9b77':'#ffd3a1'},{opacity:1,color:'#f5f2e9'}],{duration:240})
 }
 return {update,updateRoom,show,close,toast,impact,isOpen:()=>!!panel}
}
