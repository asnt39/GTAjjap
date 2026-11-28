import assert from 'node:assert/strict'
import {test} from 'node:test'

test('settings sections contain only the requested actions in order and show the active build', async () => {
 const {settingsMenu} = await import('../src/settings-menu.js')
 const menu = settingsMenu((id,label) => `<button data-action="${id}">${label}</button>`, {
  version:'0.2.0',build:'example-build'
 })
 assert.deepEqual([...menu.matchAll(/<h2>([^<]+)/g)].map(match => match[1]), ['게임','환경 설정','시스템'])
 assert.deepEqual([...menu.matchAll(/data-action="([^"]+)/g)].map(match => match[1]), [
  'map','missions','equipment','rooms','controls','graphics','audio','runMode','data','garage-return','recovery','updates','credits'
 ])
 assert.match(menu,/0\.2\.0/)
 assert.match(menu,/example-build/)
})

test('the mission view reports the current step without listing inventory', async () => {
 const {missionMenu} = await import('../src/settings-menu.js')
 const view = missionMenu({title:'잘못된 거래',stage:1,status:'active',objective:'대기 <확인>',items:[{name:'숨겨야 할 물품'}]},
  {step:2,remaining:14},(name,value) => `<p>${name} ${value}</p>`, (name,label) => `<button>${label}</button>`)
 assert.match(view,/3단계/)
 assert.match(view,/14초/)
 assert.match(view,/대기 &lt;확인&gt;/)
 assert.doesNotMatch(view,/숨겨야 할 물품/)
})
