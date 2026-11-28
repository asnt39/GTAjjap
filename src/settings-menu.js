const groups=[
 ['게임', [['map','구역 지도'],['missions','미션 보기'],['equipment','장비함'],['rooms','온라인 플레이']]],
 ['환경 설정', [['controls','조작 설정'],['graphics','그래픽 상세 설정'],['audio','오디오 설정'],['runMode','Shift 이동 속도']]],
 ['시스템', [['data','게임 데이터'],['garage-return','차고지로 돌아가기'],['recovery','복구 도구'],['updates','업데이트 확인'],['credits','제작 · 라이선스']]]
]

const entities={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}
export const escapeText = value => String(value??'').replace(/[&<>"']/g, character=>entities[character])
export const settingsPages = new Set(groups.flatMap(([,items])=>items.map(([id])=>id)))

export function settingsMenu(button, version){
 return '<div class="settings-grid">'+groups.map(([heading,items])=>
  '<section class="settings-group"><h2>'+heading+'</h2>'+items.map(([id,label])=>button(id,label)).join('')+'</section>'
 ).join('')+'</div><footer class="settings-version"><span>Harborline '+escapeText(version.version)+'</span><span>빌드 '+escapeText(version.build)+'</span></footer>'
}

const missionStatus={available:'시작 대기',active:'진행 중',failed:'실패',complete:'완료'}
export function missionMenu(journal, tracking, row, button, archive, progress){
 const remaining=tracking?.remaining??journal.remaining
 return '<div class="mission-summary"><h2>'+escapeText(journal.title)+'</h2>'+
  row('진행 상황',missionStatus[journal.status]??'대기')+
  (tracking&&Number.isInteger(tracking.step)?row('현재 단계',(tracking.step+1)+'단계'):'')+
  (Number.isFinite(remaining)?row('남은 시간',Math.ceil(remaining)+'초'):'')+
  (progress?row('상태',progress):'')+
  '<h3>목표</h3><p>'+escapeText(journal.objective)+'</p></div>'+
  (journal.journal?.length?'<details class="mission-summary"><summary>이전 대사</summary>'+journal.journal.map(([speaker,line])=>
   '<p><strong>'+escapeText(speaker)+'</strong> · '+escapeText(line)+'</p>').join('')+'</details>':'')+
  (journal.status==='failed'||journal.status==='available'&&journal.stage>1&&!journal.chapter?button('retry','의뢰 재시도'):
   journal.status==='active'?button('abandon','의뢰 중단'):'')+
  (archive?button('story-archive',archive):'')
}

const controlLabels={hudMoveX:'이동 조작 좌우 위치',hudMoveY:'이동 조작 상하 위치',hudActionX:'동작 버튼 좌우 위치',
 hudActionY:'동작 버튼 상하 위치',hudSize:'모바일 버튼 크기',hudOpacity:'모바일 버튼 불투명도',
 cameraSensitivity:'카메라 감도',aimSensitivity:'조준 감도'}
export function controlsMenu(values,ranges,button){
 const sliders=Object.entries(controlLabels).map(([id,label])=>{
  const range=ranges[id],min=range.min??range[0],max=range.max??range[1],step=range.step??range[2]??1
  return `<label class="settings-slider"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${values[id]}" data-option="${id}"><output>${values[id]}%</output></label>`
 }).join('')
 return '<figure class="control-preview" aria-label="모바일 조작 배치 미리보기"><figcaption>모바일 조작 미리보기</figcaption>'+
  '<span class="preview-stick" aria-hidden="true"><i></i></span><span class="preview-actions" aria-hidden="true"><i>공격</i><i>점프</i></span></figure>'+
  sliders+button('reset-controls','기본 조작 설정 복원')
}

const graphicsLabels={preset:'전체 품질 프리셋',resolution:'렌더링 해상도',fps:'FPS 제한',shadows:'그림자 품질',
 reflections:'수면 반사 품질',drawDistance:'가시거리',effects:'이펙트 품질'}
const selectionLabels={auto:'자동',high:'높음',low:'낮음',custom:'사용자 지정',device:'기기 해상도',off:'끔',
 world:'배경 그림자',full:'배경 및 캐릭터 그림자',near:'가까움',normal:'보통',far:'멀리'}
export function graphicsMenu(values,choices,button){
 return Object.entries(graphicsLabels).map(([id,label])=>{
  const controls=choices[id].map(choice=>{
   const label=id==='fps'?choice===0?'제한 없음':choice+' FPS':typeof choice==='number'?choice+'%':selectionLabels[choice]
   return `<option value="${choice}"${choice===values[id]?' selected':''}>${label}</option>`
  }).join('')
  return `<label class="settings-select"><span>${label}</span><select data-option="${id}">${controls}</select></label>`
 }).join('')+button('reset-graphics','기본 그래픽 설정 복원')
}

export function formatSaveTime(value){
 const date=new Date(value??NaN)
 return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'medium'}).format(date):'기록 없음'
}
