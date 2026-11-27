import {interactionSelection} from './interaction-list.js'
import './interactions.css'
import {insideBasin} from './south-basin-plan.js'
import {inCoast,offBeach,inPier} from './coast-plan.js'
import {cityAudio} from './city-audio.js'
import {dartPower,dartScore} from './darts-round.js'
import {insideWeaponShop} from './weapon-shop-plan.js'
import {gear} from './equipment.js'
import './equipment.css'
import {inWestBank} from './west-bank-plan.js'
import {inOldTown} from './old-town-plan.js'
import {episodeUI} from './episode-ui.js'
import {dialogueVoice} from './dialogue-voice.js'
import {drawMap} from './cartography.js'
import {defaultRoomEndpoint} from './room-client.js'
import {ROOM_CODE} from './room-protocol.js'
import {sights} from './navigation.js'
const $=q=>document.querySelector(q)
const nearbySight=p=>sights.filter(s=>(s.tag!=='ARM'||insideWeaponShop(p.x,p.z))&&Math.hypot(p.x-s.x,p.z-s.z)<(s.range??3.6)&&(s.y===undefined||Math.abs(p.y-s.y)<.86))
const speaker=(on)=>'<svg viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z"/>'+ (on?'<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m16 9 5 6m0-6-5 6"/>')+'</svg>'
export function createUI(game){
 const overlay=$('#overlay'),head=$('#panel-title'),body=$('#panel-body'),interact=$('#interact')
 const selection=interactionSelection(),entries=new Map(),options=$('#interaction-options')
 const audio=cityAudio();let panel='',near=null,place=null,lastUi=-Infinity,priorFocus=null,round=null
 let timer
 const toast=message=>{const el=$('#toast');el.textContent=message;el.style.display='block';clearTimeout(timer);timer=setTimeout(()=>el.style.display='none',3000)}
 const wanted=document.createElement('aside');wanted.id='wanted';wanted.hidden=true;document.querySelector('#game').append(wanted)
 const voice=dialogueVoice(globalThis,()=>audio.settings.voice),story=episodeUI(game,voice,audio.sound)
 const conversation=$('#conversation'),dialogueClose=$('#dialogue-close')
 dialogueClose.onclick=()=>game.crowd.endTalk()
 const missionGoal=()=>story.goal(game.driving()&&game.car.id==='touring')
 let visited=new Set()
 try{const saved=JSON.parse(localStorage.getItem('harborline.visits.v1')||'[]');if(Array.isArray(saved))visited=new Set(saved)}catch{}
 const row=(left,right)=>'<div class="control-row"><span>'+left+'</span><span>'+right+'</span></div>'
 const button=(action,label,end='›')=>'<button type="button" class="menubtn" data-action="'+action+'"><span>'+label+'</span><span>'+end+'</span></button>'
 function close(){
  if(panel==='rooms'&&game.room.phase==='connecting')game.room.leave()
  panel='';round=null;overlay.hidden=true;game.setPaused(false);audio.pause(false);if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});$('#world').focus({preventScroll:true})
 }
 function show(name){
  if(game.crowd.talking)return
  $('#vehicle-tools').hidden=true
  if(panel==='rooms'&&name!=='rooms'&&game.room.phase==='connecting')game.room.leave()
  if(panel==='darts'&&name!=='darts')round=null
  objective.hidden=missionEvent.hidden=true
  if(!panel)priorFocus=document.activeElement;panel=name;game.setPaused(true);audio.pause(true);overlay.hidden=false;interact.hidden=true
  entries.clear();options.replaceChildren()
  if(name!=='darts')audio.sound('ui',null,.60,true)
  const journal=game.episode.snapshot()
  const menu={
   bag:[game.episode.showingLegacy?'PORTSIDE':'WRONG DEAL','교대 수첩',
    row(journal.title,'₩'+journal.money.toLocaleString())+'<p>'+journal.objective+'</p>'+
    ((journal.status==='failed'||(journal.status==='available'&&journal.stage>1))?button('retry','의뢰 재시도'):journal.status==='active'?button('abandon','의뢰 중단'):'')+
    (game.episode.prologue?.active?'':button('story-archive',game.episode.showingLegacy?'잘못된 거래로 돌아가기':'이전 항만 의뢰 보기'))+
    journal.items.map(i=>i.count?button('use-'+i.id,i.name+' 사용',i.count+'개'):'').join('')+(journal.found?.map(name=>row('발견 기록',name)).join('')??'')],
   pause:['PORTSIDE DISTRICT','일시 정지',button('resume','탐험 계속하기','↵')+(!game.missionEnabled()||game.mission.active?'':button('mission',game.mission.completed?'FIRST DRIVE 다시 주행':'FIRST DRIVE 시운전 시작'))+button('bag','교대 수첩 · 소지품')+(game.mode()==='walk'?button('equipment','장비함','Q'):'')+button('rooms','온라인 플레이')+button('map','구역 지도','M')+button('controls','조작법','?')+button('audio','오디오 설정')+button('runMode','Shift 이동 속도',game.foot.preference==='toggle'?'걷기와 달리기 전환':'누르는 동안 걷기')+button('quality','그래픽 품질',game.quality())+button('traffic','교통량',game.trafficLabel())+button('recovery','복구 도구')+button('replay-intro','인트로 다시 보기')+button('credits','제작 · 라이선스')],
   audio:['HARBORLINE','오디오 설정',button('master-sound','게임 소리',audio.active?'켜짐':'꺼짐')+
    button('voice','대사 음성',voice.enabled?'켜짐':'꺼짐')+
    [['music','배경음악'],['effects','효과음'],['ambient','환경음'],['voice','대사 음량']].map(([key,label])=>
     '<label class="mixer-row"><span>'+label+'</span><input type="range" data-audio="'+key+'" min="0" max="100" value="'+Math.round(audio.settings[key]*100)+'"><output>'+Math.round(audio.settings[key]*100)+'%</output></label>').join('')],
   atm:['CLOCK COURT','ATM',row('현금','₩'+journal.money.toLocaleString())+row('예금','₩'+journal.bank.toLocaleString())+button('deposit','₩500 입금')+button('withdraw','₩500 출금')],
   darts:['SOUTH ROW SOCIAL CLUB','다트', '<p id="dart-score"></p><meter id="dart-power" aria-label="던지는 힘" min="0" max="1" low=".56" high=".66" optimum=".61"></meter>'+
    '<p class="smallnote">힘이 61%에 가까울수록 점수가 높아. 한 라운드에 세 번 던져.</p>'+button('throw-dart','던지기')],
   equipment:['PORTSIDE','장비함',Object.entries(gear).map(([id,def])=>button('equip-'+id,def.name,game.loadout.selected===id?'장착 중':game.loadout.items[id]?'장착':'미보유')).join('')+'<p class="smallnote">장비와 예비탄은 차고지 남쪽의 Breakwater Arms에서 살 수 있어. 온라인 방에서도 장비와 전투는 각자 진행해.</p>'],
   rooms:['HARBORLINE','온라인 플레이','<div id="room-controls"></div><p class="smallnote">캐릭터와 차량을 공유하는 비공개 방이야. 주민, 전투와 스토리는 각자 진행해.</p>'],
   recovery:['HARBORLINE','복구 도구',button('recover-position','캐릭터 위치 재설정')+button('recover-input','조작 및 입력 상태 재설정')+
    button('recover-camera','카메라 재설정')+button('recover-ui','UI 및 메뉴 재설정')+button('recover-all','종합 긴급 복구','Shift + R')],
   controls:['FIELD MANUAL','조작법',row('이동','<kbd>W A S D</kbd>')+row('걷기 전환 · 점프','<kbd>Shift</kbd> · <kbd>Space</kbd>')+row('시점 회전','화면 드래그 · <kbd>← →</kbd>')+row('카메라 거리','마우스 휠')+row('장비함 · 무기 변경','<kbd>Q</kbd> · <kbd>1–6</kbd>')+row('공격 · 조준','<kbd>F</kbd> / 좌클릭 · 우클릭 누르기')+row('재장전','<kbd>R</kbd> · 달리는 중 가능')+row('대화 · 상호작용 · 승하차','<kbd>E</kbd>')+row('상호작용 선택','<kbd>Tab</kbd> · <kbd>Shift + Tab</kbd>')+row('긴급 복구','<kbd>Shift + R</kbd>')+row('경적 · 전조등 · 라디오','<kbd>H</kbd> · <kbd>L</kbd> · <kbd>B</kbd>')+row('가속 · 제동 후 후진','<kbd>W</kbd> / <kbd>S</kbd>')+row('조향 · 핸드브레이크','<kbd>A D</kbd> · <kbd>Space</kbd>')+row('구역 지도 · 일시 정지','<kbd>M</kbd> · <kbd>Esc</kbd>')+'<p class="smallnote">터치 화면에서는 왼쪽 조이스틱으로 걷고 오른쪽 화면을 밀어 둘러봐. 조이스틱을 끝까지 밀면 달려. 조이스틱을 누른 채 오른쪽의 전환·장전 버튼을 사용할 수 있어. 키보드에서는 기본으로 달려. Shift로 걷기와 달리기를 바꿀 수 있어.</p>'],
   map:['PORT AUTHORITY','Portside District','<canvas class="big-map" aria-label="구역 안내도"></canvas><div class="map-list">'+sights.map(s=>'<div><span>◇ '+s.tag+'</span>'+s.title+(visited.has(s.tag)?'　✓':'')+'</div>').join('')+'</div>'],
   credits:['HARBORLINE','제작 · 라이선스','<p>도시 배치, 항만 시설, 간판, 항구 환경음은 이 게임을 위해 제작했어.</p><div id="credit-list"></div>']
  }
  if(name==='sight'&&near){const result=game.episode.interact({sight:near.tag});if(result)toast(result.message);menu.sight=['PORT AUTHORITY  /  '+near.tag,near.title,'<p>'+near.body+'</p>'];visited.add(near.tag);try{localStorage.setItem('harborline.visits.v1',JSON.stringify([...visited]))}catch{}}
  if(name==='sight'&&near?.tag==='ARM'){
   let catalog=row('잔액','₩'+journal.money.toLocaleString('ko-KR'))
   for(const [id,def] of Object.entries(gear)){
    if(!def.price)continue
    const item=game.loadout.items[id]
    const supply=def.consumable?'수류탄':'예비탄'
    catalog+=row(def.name,item?(def.capacity?'보유 · 탄창 '+item.mag+' / 예비 '+item.reserve:def.consumable?'보유 '+item.reserve+'개':'보유'):'미보유')
    if(!item)catalog+=button('shop-weapon-'+id,def.name+' 구매','₩'+def.price.toLocaleString('ko-KR'))
    if(item&&(def.capacity||def.consumable)){
     const offer=game.loadout.ammoOffer(id)
     catalog+=offer.amount?button('shop-ammo-'+id,supply+' '+offer.amount+(def.consumable?'개':'발')+' 구매','₩'+offer.price.toLocaleString('ko-KR')):row(supply,'최대 보유')
    }
   }
   menu.sight[2]+=catalog
  }
  if(name==='sight'&&near?.tag==='05'){
   menu.sight[2]+=row('잔액','₩'+journal.money.toLocaleString())+journal.items.map(i=>button('order-'+i.id,i.name,'₩'+i.price.toLocaleString())).join('')
  }
  if(name==='sight'&&near?.tag==='06')menu.sight[2]+=button('lamp-test','작업대 시험등 점등')
  if(name==='sight'&&['HOME','PARK','WEST'].includes(near?.tag))menu.sight[2]+=button('west-bank',near.tag==='HOME'?'휴식 및 개인 차량 점검':'시설 작동')
  const content=menu[name];
  if(name==='pause'){const s=game.stats();if(s.ms>0)content[2]+='<p class="smallnote">최근 평균 '+Math.round(1000/s.ms)+' FPS · '+s.width+' × '+s.height+' · '+s.calls+' 드로 콜</p>'}
  $('#eyebrow').textContent=content[0];head.textContent=content[1];body.innerHTML=content[2]
  if(name==='darts'){round={at:performance.now(),points:[],next:0};drawRound()}
  if(name==='rooms')updateRoom()
  if(name==='map')drawMap($('.big-map'),game.pos,game.yaw(),true,game.cars,missionGoal())
  if(name==='credits'){for(const [label,path] of [['도시 음악과 효과음','city-audio/CREDITS.md'],['엔진과 타이어 음원','driving-audio/CREDITS.md'],['휴대 장비','equipment/CREDITS.md'],['구시가지 상점과 숙소','market-row/CREDITS.md'],['서편 정비 지구','works/CREDITS.md'],['캐릭터 · 애니메이션','character/CREDITS.md'],['건축 표면','architecture/CREDITS.md'],['도로 · 차량 · 식생','street/CREDITS.md'],['항만 재질','port/CREDITS.txt'],['환경 조명','sky/CREDITS.md'],['Noto Sans KR 글꼴','fonts/OFL-NotoSansKR.txt'],['Barlow Condensed 글꼴','fonts/OFL-BarlowCondensed.txt'],['Three.js','THREE-LICENSE.txt']]){let a=document.createElement('a');a.href=window.harborPreviewAssets?.['/assets/'+path]||'/assets/'+path;a.target='_blank';a.rel='noopener';a.className='menubtn';a.textContent=label;$('#credit-list').append(a)}}
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
 function reflectSound(){
  const el=$('#sound'),on=audio.active
  el.innerHTML=speaker(on);el.title=el.ariaLabel='게임 소리 '+(on?'끄기':'켜기');el.setAttribute('aria-pressed',String(on))
 }
 reflectSound()
 $('#sound').onclick=async()=>{await audio.toggle();reflectSound()}
 for(const event of ['pointerdown','keydown'])window.addEventListener(event,e=>{
  if(!$('#game').inert&&!e.target.closest?.('#sound,[data-action="master-sound"]'))audio.gesture()
 },{passive:true})
 document.addEventListener('visibilitychange',()=>{audio.visibility(document.hidden);if(document.hidden)voice.stop()})
 $('#panel-body').addEventListener('input',e=>{
  const key=e.target.dataset.audio
  if(key){audio.set(key,Number(e.target.value)/100);e.target.nextElementSibling.value=e.target.value+'%'}
 })
 function drawRound(){
  if(!round||panel!=='darts')return
  const now=performance.now()
  const power=dartPower((now-round.at)/1000)
  $('#dart-power').value=power
  const tally=round.points.map((n,i)=>(i+1)+'번째 '+n+'점').join(' · ')
  const label=tally?tally+' · 합계 '+round.points.reduce((a,b)=>a+b,0)+'점':'목표 61%'
  const score=$('#dart-score');if(score.textContent!==label)score.textContent=label
  const button=$('[data-action="throw-dart"]')
  button.disabled=round.points.length===3
  if(button.disabled){button.querySelector('span').textContent='라운드 종료'}
 }
 function activateCity(site){
  place=site
  if(site.type==='map')show('map')
  else if(site.type==='atm'||site.type==='darts')show(site.type)
  else game.useCity(site)
 }
 $('#vehicle-tools').onclick=e=>{const action=e.target.closest('button')?.dataset.vehicle;if(action)game.vehicleAction(action)}
 $('#pause').onclick=()=>show('pause');$('#controls').onclick=()=>show('controls');$('#mini-button').onclick=()=>show('map');$('#close').onclick=close
 overlay.onclick=e=>{if(e.target===overlay)close();const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(panel==='equipment'&&action.startsWith('equip-')){
   const id=action.slice(6)
   if(game.selectEquipment(id)){close();toast(gear[id].name+' 장착')}else toast(game.loadout.items[id]?'동작을 마친 뒤 장비를 변경해.':'Breakwater Arms에서 구입할 수 있어.')
   return
  }
  if(action?.startsWith('recover-')){recover(action.slice(8));return}
  if(action==='traffic'){game.cycleTraffic();show('pause');return}
  if(action==='replay-intro'){window.dispatchEvent(new Event('harborline:replay-intro'));return}
  if(action==='master-sound'){audio.toggle().then(()=>{reflectSound();if(panel==='audio')show('audio')});return}
  if(action==='voice'){const message=voice.toggle();show('audio');toast(message);return}
  if(panel==='atm'&&(action==='deposit'||action==='withdraw')){
   if(!place||place.type!=='atm')return
   const result=game.episode.transfer(action==='deposit'?500:-500)
   toast(result.message);if(result.ok)audio.sound('buy',null,1,true)
   show('atm');return
  }
  if(action==='throw-dart'&&panel==='darts'&&round&&round.points.length<3){
   const now=performance.now();if(now<round.next)return
   round.points.push(dartScore(dartPower((now-round.at)/1000)));round.next=now+430
   audio.sound('wood',null,1,true);drawRound();return
  }
  if(panel==='sight'&&near?.tag==='ARM'&&action.startsWith('shop-')){
   const [,kind,id]=action.split('-')
   const result=game.loadout.buy(id,kind);toast(result.message);if(result.ok)audio.sound('buy',null,1,true);show('sight');return
  }
  if(action==='west-bank'&&panel==='sight'&&['HOME','PARK','WEST'].includes(near?.tag)){
   const tag=near.tag;close();toast(game.useWestBank(tag));return
  }
  if(action==='lamp-test'&&panel==='sight'&&near?.tag==='06'){close();game.testSignal();toast('시험등 점등 · 6초 뒤 자동 소등');return}
  if(action.startsWith('order-')&&panel==='sight'&&near?.tag==='05'){toast(game.episode.buy(action.slice(6)).message);show('sight');return}
  if(action==='roomCreate'||action==='roomJoin'||action==='roomLeave'){
   e.preventDefault();if(action==='roomLeave')game.room.leave();else joinRoom(action==='roomCreate');return
  }
  if(action==='story-archive'){const result=game.episode.switchJournal();toast(result.message);show('bag');return}
  if(action==='retry'||action==='abandon'||action.startsWith('use-')){
   const result=action==='retry'?game.episode.retry():action==='abandon'?game.episode.abandon():game.useItem(action.slice(4))
   if(action==='retry'&&result.ok)game.restartPrologue()
   toast(result.message);show('bag');return
  }
  if(action==='mission'){game.mission.start(game.driving()&&game.car.id==='touring');close();toast('FIRST DRIVE · 지도에 표시된 목표로 이동해')}else if(action==='runMode'){game.foot.changePreference();show('pause')}else if(action==='resume')close();else if(action==='quality'){game.cycleQuality();show('pause')}else show(action)}
 function currentInteractions(){
  if(panel)return []
  const items=game.interactions()
  if(game.canAct()&&!game.crowd.talking&&!game.activity.current)for(const sign of nearbySight(game.pos)){
   items.push({id:'sign-'+sign.tag,label:sign.name,sign,priority:sign.tag==='ARM'?3:1,
    distance:Math.hypot(game.pos.x-sign.x,game.pos.z-sign.z)})
  }
  return selection.update(items)
 }
 function renderInteractions(items){
  if(items.length)interact.hidden=false
  else if(!entries.size)interact.hidden=true
  interact.classList.toggle('multiple',items.length>1)
  const activeIds=new Set(items.map(item=>item.id))
  for(const [id,node] of entries)if(!activeIds.has(id)&&!node.classList.contains('leaving')){
   node.disabled=true;node.classList.add('leaving')
  }
  let index=0
  for(const item of items){
   let button=entries.get(item.id)
   if(!button){
    button=document.createElement('button');button.type='button';button.dataset.interaction=item.id
    button.innerHTML='<kbd>E</kbd><span></span>'
    button.addEventListener('animationend',()=>{
     if(button.classList.contains('leaving')){
      entries.delete(item.id);button.remove()
      if(!entries.size)interact.hidden=true
     }
    })
    entries.set(item.id,button)
   }
   if(options.children[index]!==button)options.insertBefore(button,options.children[index]??null)
   index++
   button.disabled=false;button.classList.remove('leaving')
   const selected=selection.id===item.id
   button.classList.toggle('selected',selected)
   button.setAttribute('aria-pressed',String(selected))
   setText(button.querySelector('span'),item.label)
  }
 }
 function activate(id){
  const items=currentInteractions()
  const item=items.find(entry=>entry.id===(id??selection.id))
  if(!item)return
  if(item.sign){near=item.sign;show('sight')}
  else if(item.site)activateCity(item.site)
  else item.action()
 }
 function recover(kind){
  game.recover(kind)
  if(kind==='all'||kind==='ui'){
   selection.reset();entries.clear();options.replaceChildren();interact.hidden=true
   near=place=null;game.crowd.endTalk();voice.stop?.();close()
  }
  if(kind!=='all'&&kind!=='ui'&&kind!=='position')toast('재설정 완료')
 }
 interact.onclick=e=>{const button=e.target.closest('[data-interaction]');if(button)activate(button.dataset.interaction)}
 window.addEventListener('keydown',e=>{
  if(!e.repeat&&e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.code==='KeyR'&&!$('#game').inert){
   e.preventDefault();e.stopImmediatePropagation();recover('all')
  }
 },true)
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
  if(e.code==='Tab'&&!panel&&!game.crowd.talking){
   const items=currentInteractions()
   if(items.length>1){e.preventDefault();selection.cycle(items,e.shiftKey?-1:1);renderInteractions(items)}
  }
  if(e.code==='Enter'&&panel==='pause'&&document.activeElement===$('#close')){e.preventDefault();close()}
  if(e.code==='Tab'&&panel){const f=[...$('#panel').querySelectorAll('button,a,input')];if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===f.at(-1)){e.preventDefault();f[0].focus()}}
 })
 const missionEvent=$('#mission-event'),objective=$('#objective')
 let beforeMission=null,missionNotice=null,nextMissionRead=0
 const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value}
 function updateMission(t,goal){
  const blocked=!!panel||!!game.crowd.talking
  objective.hidden=!goal||blocked
  if(goal&&!blocked){
   const distance=Math.max(0,Math.round(Math.hypot(game.pos.x-goal.x,game.pos.z-goal.z)))
   setText(objective.querySelector('strong'),goal.title||'현재 의뢰')
   setText(objective.querySelector('span'),goal.label)
   setText(objective.querySelector('small'),distance+' m'+(Number.isFinite(goal.remaining)?' · '+Math.ceil(goal.remaining)+'초':'')+(game.storyStatus()?' · '+game.storyStatus():''))
  }
  if(t>=nextMissionRead){
   nextMissionRead=t+.18
   const journal=game.episode.snapshot(),practice=game.mission.active,completed=game.mission.completed
   const wins=[...journal.completed,...journal.storyCompleted]
   const prior=beforeMission
   if(prior){
    let event
    if(wins.length>prior.wins.length||!prior.completed&&completed){
     const reward=Math.max(0,journal.money-prior.money)
     event=['의뢰 완료',wins.length>prior.wins.length?prior.title:'FIRST DRIVE',reward?'보상 ₩'+reward.toLocaleString('ko-KR'):'']
    }else if(journal.status==='failed'&&prior.status==='active'){
     event=['의뢰 중단',prior.title,journal.reason]
    }else if(journal.status==='active'&&(prior.status!=='active'||journal.missionId!==prior.id)||practice&&!prior.practice){
     event=['새 의뢰',practice&&!prior.practice?'FIRST DRIVE':journal.title,'']
    }else if(goal?.missionId&&goal.missionId===prior.goal&&goal.label!==prior.label){
     event=['목표 갱신',goal.title,goal.label]
    }
    if(event){
     const [kind,title,detail]=event
     setText(missionEvent.querySelector('small'),kind)
     setText(missionEvent.querySelector('strong'),title)
     setText(missionEvent.querySelector('span'),detail)
     missionEvent.hidden=true
     missionNotice={until:t+3.4,pending:true,complete:kind==='의뢰 완료'}
    }
   }
   beforeMission={title:journal.title,id:journal.missionId,status:journal.status,wins,completed,practice,money:journal.money,
    goal:goal?.missionId,label:goal?.label}
  }
  if(missionNotice?.pending&&blocked)missionNotice.until=t+3.4
  const display=!!missionNotice&&!blocked&&t<missionNotice.until
  if(display&&missionNotice.pending){
   missionNotice.pending=false
   audio.sound('mission',null,missionNotice.complete?1:.64)
  }
  missionEvent.hidden=!display
 }
 const bearingElements=[]
 for(let n=0;n<21;n++){let el=document.createElement('span');$('#bearings').append(el);bearingElements.push(el)}
 function update(t){
  if(t-lastUi<.08)return;lastUi=t
  const p=game.pos,y=game.yaw(),degrees=(y*180/Math.PI)%360
  const law=game.crowd.wanted;wanted.hidden=!law.level
  if(law.level)wanted.textContent='수배 '+law.level+' · '+({investigate:'조사',pursuit:'추격',search:'수색'}[law.phase])
  const carDriving=game.driving(),boating=game.boating(),swim=game.swimming()
  const driving=carDriving||boating,goal=missionGoal()
  document.body.classList.toggle('driving',driving)
  document.body.classList.toggle('boating',boating)
  document.body.classList.toggle('swimming',!!swim)
  $('#vehicle-tools').hidden=!carDriving||!!panel
  $('#speed').hidden=!driving;$('#speed b').textContent=Math.round(Math.abs(game.car.speed)*3.6)
  $('#speed small').textContent=boating?'≈':game.car.speed<-.08?'R':'D'
  const oxygen=$('#oxygen');oxygen.hidden=!swim||!!panel||!swim.diving&&swim.air>=.998
  if(!oxygen.hidden)oxygen.querySelector('meter').value=swim.air
  updateMission(t,goal)
  const equipped=game.loadout,gun=!!equipped.def.capacity,throwable=!!equipped.def.consumable,walking=game.mode()==='walk'&&!game.crowd.talking&&!panel
  $('#equipment-hud').hidden=!walking
  const scoped=walking&&game.scoped()
  $('#sniper-scope').hidden=!scoped
  $('#gear-reticle').hidden=scoped||!walking||(!gun&&!throwable)||!!game.player.f.action
  $('#gear-aim').hidden=!gun&&!throwable
  $('#gear-reload').hidden=!gun
  const aimButton=$('#gear-aim'),aiming=game.aiming()
  aimButton.setAttribute('aria-pressed',String(aiming))
  aimButton.textContent=aiming?'조준 취소':'조준'
  $('#gear-reload').disabled=equipped.reloading||!equipped.item.reserve||equipped.item.mag===equipped.def.capacity
  $('#gear-status').hidden=equipped.selected==='fists'
  $('#gear-status').classList.toggle('grenade',throwable)
  $('#gear-status').textContent=equipped.def.name+(gun?' · '+(equipped.reloading?'재장전 중':equipped.item.mag+' / '+equipped.item.reserve):throwable?' · '+equipped.item.reserve+'개':'')
  $('#punch').textContent=throwable&&!game.inCell()?'투척':'공격'
  $('#punch').setAttribute('aria-label',game.inCell()?'주먹 공격':gun?'발사':throwable?'수류탄 투척':equipped.selected==='bat'?'방망이 공격':'주먹 공격')
  const jump=$('#jump')
  jump.disabled=!swim&&!game.canJump()
  jump.textContent=swim?(swim.diving?'수면으로':'잠수'):'점프'
  jump.setAttribute('aria-label',jump.textContent)
  const dive=$('#dive-toggle');dive.hidden=!swim||!!panel
  if(!dive.hidden)dive.querySelector('span').textContent=jump.textContent
  $('#punch').disabled=!game.canAttack()
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
  if(!panel)renderInteractions(currentInteractions())
  $('#loc-name').textContent=insideBasin(p.x,p.z)?'South Basin':inCoast(p.x,p.z)&&p.x>30?
   (inPier(p.x,p.z)?'Meridian Pier':offBeach(p.x,p.z)?'Meridian Bay':'Meridian Beach'):
   inWestBank(p.x,p.z)?'West Bank':inOldTown(p.x,p.z)?'Old Town':p.x<-36?'Tide Market':p.x>11?'West Quay':Math.abs(p.z+37)<7?'Market Crossing':'Breakwater Ave.'
  drawMap($('#mini'),p,y,false,game.cars,goal)
  const compass=$('.compass').clientWidth,base=Math.round(degrees/7.5)
  bearingElements.forEach((el,i)=>{const step=base+i-10,normalized=(step%48+48)%48,card=normalized%6===0;el.className=card?'':'tick';el.textContent=card?['N','NE','E','SE','S','SW','W','NW'][normalized/6]:'';el.style.left=(compass/2+(step*7.5-degrees)*2.2)+'px'})
 }
 function impact(received){
  audio.sound('hit')
  const el=$('#vitals');el.animate?.([{opacity:.55,color:received?'#ff9b77':'#ffd3a1'},{opacity:1,color:'#f5f2e9'}],{duration:240})
 }
 let lastAudio=-Infinity
 function updateAudio(now,state){
  drawRound()
  if(now-lastAudio<100)return
  lastAudio=now
  if(audio.active)audio.update(state())
  if(audio.active!==($('#sound').getAttribute('aria-pressed')==='true'))reflectSound()
 }
 return {update,updateAudio,prepareDriveAudio:audio.prepareDrive,updateRoom,show,close,toast,impact,sound:audio.sound,shot:(id,point)=>audio.sound(id,point),missionGoal,isOpen:()=>!!panel}
}
