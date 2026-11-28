import {writeQuality} from './graphics-quality.js'
import {appUpdates} from './app-updates.js'

const initialIntro = document.querySelector('#cinematic-intro')
const game = document.querySelector('#game')
const status = document.querySelector('#status')
const canvas = game.querySelector('#world')
let launch,enableGame,gameFailed=false,started=false,active=false

function showGameFailure(text) {
  gameFailed = true
  status.querySelector('b').textContent = text
  status.hidden = false
  game.inert = true
  if (!status.querySelector('button')) {
    const retryGame=document.createElement('button')
    retryGame.textContent='낮은 그래픽으로 다시 시도'
    retryGame.onclick=()=>{writeQuality('low');location.reload()}
    status.append(retryGame)
  }
}

function prepareGame() {
  launch ??= import('./main.js')
    .then(({start}) => start(() => showGameFailure('그래픽 연결 중단. 낮은 품질로 다시 시도하십시오.')))
    .then(enable => { enableGame = enable })
    .catch(error => {
      console.error(error)
      showGameFailure('게임 로드 실패. WebGL 2를 지원하는 브라우저에서 새로고침하십시오.')
    })
  return launch
}

function mountIntro(intro,{replay=false}={}){
  active=true
  const previousFocus=document.activeElement
  game.inert=true
  const audio = intro.querySelector('audio')
  const prompt = intro.querySelector('#intro-recovery')
  const play = intro.querySelector('#intro-retry')
  const message = intro.querySelector('#intro-message')
  const mediaEvents = new AbortController()
  const inputEvents = new AbortController()
  const previewSource = window.harborPreviewAssets?.[audio.getAttribute('src')]
  if (previewSource) audio.src = previewSource

  let phase = 'prompt'
  let playbackAttempt = 0
  let playbackTimeout
  let retry = false
  let failureHandoff

  function isPlayingOrStarting() {
    return phase === 'playing' || phase === 'starting'
  }

  function showPrompt(label, detail, restart) {
    playbackAttempt++
    phase = 'prompt'
    retry = restart
    clearTimeout(playbackTimeout)
    audio.pause()
    intro.classList.remove('playing')
    prompt.hidden = false
    play.disabled = false
    play.textContent = label
    message.textContent = detail
    if (!document.hidden) play.focus({preventScroll: true})
  }

  function failPlayback() {
    if (isPlayingOrStarting()) {
      showPrompt('다시 시도', '오프닝 재생 실패. 잠시 후 게임 시작.', true)
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
    if (retry || audio.error) audio.load()
    retry = false
    play.disabled = true
    message.textContent = '오프닝 준비 중'
    watchForPlayback()
    audio.muted = muted
    audio.play().catch(error => {
      if (attempt !== playbackAttempt || phase !== 'starting') return
      if (allowMutedFallback && error.name === 'NotAllowedError') startPlayback(true)
      else failPlayback()
    })
  }

  async function finish() {
    if (phase === 'exiting') return
    phase = 'exiting'
    clearTimeout(playbackTimeout)
    clearTimeout(failureHandoff)
    mediaEvents.abort()
    audio.pause()
    audio.removeAttribute('src')
    if (!replay) status.hidden = Boolean(enableGame && !gameFailed)
    status.removeAttribute('aria-hidden')
    intro.remove()
    audio.load()
    if (replay) {
      game.inert = gameFailed
      inputEvents.abort()
      active = false
      if (!gameFailed) previousFocus?.focus({preventScroll: true})
      return
    }
    await prepareGame()
    if (!enableGame || gameFailed) return
    status.hidden = true
    game.inert = false
    inputEvents.abort()
    if (!started) {
      started = true
      appUpdates.enterGame()
      enableGame()
    }
    active = false
    canvas.focus({preventScroll: true})
  }

  window.addEventListener('keydown', event => {
    if((event.target===intro&&['Enter',' '].includes(event.key)||event.key==='Tab'||event.target instanceof HTMLButtonElement&&['Enter',' '].includes(event.key)) && (!intro.isConnected || intro.contains(event.target) || status.contains(event.target)))return
    event.stopImmediatePropagation()
  }, {capture: true, signal: inputEvents.signal})

  const media = {signal: mediaEvents.signal}
  play.addEventListener('click', () => {
    if (phase === 'prompt' && !document.hidden) startPlayback(retry ? false : audio.muted)
  }, media)
  function enableSound(){
    if(!audio.muted)return
    audio.muted=false
    if(audio.paused&&phase!=='exiting')startPlayback(false)
  }
  intro.addEventListener('pointerdown',enableSound,media)
  intro.addEventListener('keydown',event=>{
    enableSound()
    if(event.target===play||!['Enter',' '].includes(event.key))return
    event.preventDefault()
    void finish()
  },media)
  intro.addEventListener('click',event=>{
    if(event?.target!==play)void finish()
  },media)
  audio.addEventListener('playing', () => {
    if (!isPlayingOrStarting()) return
    clearTimeout(playbackTimeout)
    phase = 'playing'
    if (prompt.contains(document.activeElement)) intro.focus({preventScroll: true})
    prompt.hidden = true
    intro.classList.add('playing')
  }, media)
  audio.addEventListener('waiting', () => {
    if (isPlayingOrStarting()) watchForPlayback()
  }, media)
  audio.addEventListener('ended', finish, media)
  audio.addEventListener('error', failPlayback, media)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlayingOrStarting()) {
      showPrompt('인트로 계속', '', false)
    } else if (!document.hidden && playbackAttempt === 0 && phase === 'prompt') {
      startPlayback(false, true)
    }
  }, media)

  intro.focus({preventScroll: true})
  if (!document.hidden) startPlayback(false, true)
  // Allow the first video paint before preparing the city.
  if (!replay) requestAnimationFrame(()=>setTimeout(prepareGame,0))
}

const artwork = initialIntro.cloneNode(true)
window.addEventListener('harborline:replay-intro',()=>{
  if(!started||active||gameFailed)return
  const replay = artwork.cloneNode(true)
  game.before(replay)
  mountIntro(replay,{replay:true})
})

mountIntro(initialIntro)
if (!window.harborPreviewAssets) void appUpdates.start()
