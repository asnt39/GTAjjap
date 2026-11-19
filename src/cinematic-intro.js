const intro = document.querySelector('#cinematic-intro')
const video = intro.querySelector('video')
const prompt = intro.querySelector('#intro-recovery')
const play = intro.querySelector('#intro-retry')
const audio = intro.querySelector('#intro-audio')
const message = intro.querySelector('#intro-message')
const game = document.querySelector('#game')
const status = document.querySelector('#status')
const canvas = game.querySelector('#world')
const mediaEvents = new AbortController()
const inputEvents = new AbortController()
const motion = matchMedia('(prefers-reduced-motion: reduce)')
const previewSource = window.harborPreviewAssets?.[video.getAttribute('src')]
if (previewSource) video.src = previewSource

let phase = 'prompt'
let playbackAttempt = 0
let playbackTimeout
let retry = false
let launch
let enableGame
let gameFailed = false
let failureHandoff

function waitForFade(ms) {
  return motion.matches ? Promise.resolve() : new Promise(resolve => setTimeout(resolve, ms))
}

function showGameFailure(text) {
  gameFailed = true
  status.classList.remove('leaving')
  status.querySelector('b').textContent = text
  status.hidden = false
  game.inert = true
  if (!status.querySelector("button")) {
    const retryGame=document.createElement("button");retryGame.textContent="다시 불러오기";retryGame.onclick=()=>location.reload();status.append(retryGame)
  }
}

function prepareGame() {
  launch ??= import('./main.js')
    .then(({start}) => start(() => showGameFailure('그래픽 연결이 중단됐어. 페이지를 새로고침해.')))
    .then(enable => { enableGame = enable })
    .catch(error => {
      console.error(error)
      showGameFailure('게임을 열 수 없어. WebGL 2를 지원하는 브라우저에서 새로고침해.')
    })
  return launch
}

function isPlayingOrStarting() {
  return phase === 'playing' || phase === 'starting'
}

function showPrompt(label, detail, restart) {
  playbackAttempt++
  phase = 'prompt'
  retry = restart
  clearTimeout(playbackTimeout)
  video.pause()
  intro.classList.remove('playing')
  audio.hidden = true
  prompt.hidden = false
  play.disabled = false
  play.textContent = label
  message.textContent = detail
  if (!document.hidden) play.focus({preventScroll: true})
}

function failPlayback() {
  if (isPlayingOrStarting()) {
    showPrompt('다시 시도', '영상을 재생할 수 없어. 잠시 후 게임을 시작해.', true)
    failureHandoff = setTimeout(finish, 4000)
  }
}

function watchForPlayback() {
  clearTimeout(playbackTimeout)
  playbackTimeout = setTimeout(failPlayback, 15000)
}

function startPlayback(muted, allowMutedFallback = false) {
  clearTimeout(failureHandoff)
  phase = 'starting'
  const attempt = ++playbackAttempt
  if (retry || video.error) video.load()
  retry = false
  play.disabled = true
  message.textContent = '영상을 준비하는 중'
  watchForPlayback()
  video.muted = muted
  video.play().catch(error => {
    if (attempt !== playbackAttempt || phase !== 'starting') return
    if (allowMutedFallback && error.name === 'NotAllowedError') startPlayback(true)
    else failPlayback()
  })
}

async function finish() {
  if (phase === 'exiting') return
  phase = 'exiting'
  clearTimeout(playbackTimeout)
  mediaEvents.abort()
  video.pause()
  play.disabled = true
  intro.classList.add('ending')
  await waitForFade(140)
  video.removeAttribute('src')
  video.load()
  if (enableGame && !gameFailed) status.hidden = true
  status.removeAttribute('aria-hidden')
  intro.classList.add('revealing')
  const preparing = prepareGame()
  await waitForFade(240)
  intro.remove()
  await preparing
  if (!enableGame || gameFailed) return
  if (!status.hidden) {
    status.classList.add('leaving')
    await waitForFade(350)
  }
  if (gameFailed) return
  status.hidden = true
  status.classList.remove('leaving')
  game.inert = false
  inputEvents.abort()
  enableGame()
  canvas.focus({preventScroll: true})
}

window.addEventListener('keydown', event => {
  if(event.target instanceof HTMLButtonElement && ['Tab','Enter',' '].includes(event.key))return
  event.stopImmediatePropagation()
}, {capture: true, signal: inputEvents.signal})

const media = {signal: mediaEvents.signal}
play.addEventListener('click', () => {
  if (phase === 'prompt' && !document.hidden) startPlayback(retry ? false : video.muted)
}, media)
audio.addEventListener('click', () => {
  video.muted=false
  audio.hidden=true
  if(video.paused)startPlayback(false)
}, media)
video.addEventListener('playing', () => {
  if (!isPlayingOrStarting()) return
  clearTimeout(playbackTimeout)
  phase = 'playing'
  if (prompt.contains(document.activeElement)) intro.focus({preventScroll: true})
  prompt.hidden = true
  intro.classList.add('playing')
  audio.hidden = !video.muted
}, media)
video.addEventListener('waiting', () => {
  if (isPlayingOrStarting()) watchForPlayback()
}, media)
const frame=document.querySelector('#intro-frame')
function positionLogo(){frame.classList.toggle('corner',video.currentTime>=7.45)}
video.addEventListener('timeupdate',positionLogo,media)
if(video.requestVideoFrameCallback){
 const follow=()=>{positionLogo();if(phase!=='exiting')video.requestVideoFrameCallback(follow)}
 video.requestVideoFrameCallback(follow)
}
intro.addEventListener('click',event=>{
 if(event.target.closest('#intro-audio,#intro-retry'))return
 if(phase==='playing'||event.target.closest('#intro-skip'))finish()
},media)
video.addEventListener('ended', finish, media)
video.addEventListener('error', failPlayback, media)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isPlayingOrStarting()) {
    showPrompt('인트로 계속', '', false)
  } else if (!document.hidden && playbackAttempt === 0 && phase === 'prompt') {
    startPlayback(false, true)
  }
}, media)

intro.focus({preventScroll: true})

if (!document.hidden) startPlayback(false, true)

// Start after the browser can paint the video. Distant district detail loads on approach.
requestAnimationFrame(()=>setTimeout(prepareGame,0))
