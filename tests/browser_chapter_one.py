"""Smoke-test the chapter touch UI and automatic update from a built Mission 04 release."""

import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
import json
import math
import re
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]/'dist'
baseline=Path(os.environ['HARBORLINE_BASELINE_DIST']).resolve()
screenshot_root=Path(os.environ.get('HARBORLINE_ARTIFACTS','/tmp/harborline-chapter-one'))
screenshot_root.mkdir(parents=True,exist_ok=True)
version=lambda directory:json.loads((directory/'version.json').read_text())['build']
entry=lambda directory:re.search(r'<script type="module" crossorigin src="([^"]+)"',(directory/'index.html').read_text()).group(1)
current={'value':baseline}

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**options):
  super().__init__(*args,directory=str(current['value']),**options)
 def end_headers(self):
  self.send_header('Cache-Control','no-store')
  super().end_headers()
 def log_message(self,*args):
  pass

story={'version':1,'index':0,'money':18250,'bank':1320,'wrongDeal':{'mission':2,'status':'complete','step':0},'newBlood':{'status':'complete','step':0}}
sample={
 'x':-17.35,'y':.008,'z':37.75,'face':0,'yaw':math.atan2(8.35,-4.47),'pitch':.13,'distance':4.65,'vehicles':{}
}
graphics="localStorage.setItem('harborline.graphicsQuality.v1','low')"
def open_game(page):
 page.locator('#cinematic-intro').dispatch_event('click')
 page.wait_for_function("!document.querySelector('#game').inert",timeout=95000)
def seed(page,state,pose=sample):
 page.add_init_script(f'''if(!sessionStorage.fixture){{{graphics};
 localStorage.setItem('harborline.episode.v1',JSON.stringify({json.dumps(state)}))
 localStorage.setItem('harborline.lastPosition.v1',JSON.stringify({json.dumps(pose)}))
 sessionStorage.fixture='yes'}}''')
def errors(page):
 result=[]
 page.on('pageerror',lambda error:result.append(error.stack or str(error)))
 page.on('response',lambda response:result.append(str(response.status)+' '+response.url) if response.status>=400 and '/assets/' in response.url else None)
 return result

with ThreadingHTTPServer(('127.0.0.1',0),Handler) as server,sync_playwright() as p:
 Thread(target=server.serve_forever,daemon=True).start()
 base=f'http://127.0.0.1:{server.server_port}'
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':800,'height':470})
 seen=[]
 page.on('request',lambda request:seen.append(urlparse(request.url).path))
 problem=errors(page)
 seed(page,story)
 page.goto(base+'/',wait_until='domcontentloaded')
 page.wait_for_function("navigator.serviceWorker.controller !== null",timeout=35000)
 assert entry(baseline) in seen
 page.evaluate("document.querySelector('#cinematic-intro video')?.pause()")
 page.wait_for_load_state('networkidle')
 page.wait_for_timeout(800)
 assert page.evaluate("document.querySelector('#game').inert"),'Intro reached gameplay before the update fixture'
 current['value']=root
 page.bring_to_front()
 page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_function("document.querySelector('#intro-video') !== null && document.querySelector('#intro-wordmark') !== null",timeout=20000)
 assert entry(root) in seen
 open_game(page)
 assert '빼앗긴 몫' in page.locator('#game').inner_text()
 actual=page.evaluate("JSON.parse(localStorage.getItem('harborline.episode.v1'))")
 assert actual['money']==18250 and actual['bank']==1320 and actual['newBlood']['status']=='complete'
 assert not problem,problem
 print('PWA auto-applied a distinct build before gameplay and kept a Mission 04-complete save:',version(baseline),'→',version(root),flush=True)
 page.close()

 entries=[
  ('keel-workshop','chapter-maya','빼앗긴 몫'),
  ('brine-hotel','chapter-hotel-lobby','입막음'),
  ('meridian-marina','chapter-marina','검은 바다'),
  ('rivet-foundry','chapter-factory-rally','선전포고')
 ]
 for i,(place,interaction,title) in enumerate(entries):
  page=browser.new_page(viewport={'width':800,'height':470},service_workers='block',has_touch=True)
  problem=errors(page)
  seed(page,{**story,'chapterArc':{'mission':i,'step':0,'status':'active','reason':'','lead':None}})
  page.goto(base+'/',wait_until='domcontentloaded')
  open_game(page)
  assert title in page.locator('#game').inner_text()
  if i==1:page.keyboard.down('w')
  target=page.locator(f'[data-interaction="{interaction}"]')
  try:target.wait_for(timeout=20000)
  finally:
   if i==1:page.keyboard.up('w')
  if i==3:
   assert page.evaluate('''() => {
     const interaction = document.querySelector('#interaction-options').getBoundingClientRect()
     const equipment = document.querySelector('#equipment-hud').getBoundingClientRect()
     return interaction.right <= equipment.left || interaction.bottom <= equipment.top
       || interaction.left >= equipment.right || interaction.top >= equipment.bottom
   }''')
  page.screenshot(path=str(screenshot_root/(place+'.png')))
  target.tap(timeout=12000)
  page.wait_for_function("JSON.parse(localStorage.getItem('harborline.episode.v1')).chapterArc.step===1",timeout=12000)
  page.locator('#story-subtitle').wait_for()
  assert not problem,problem
  print(f'Mission {i+5:02d} gameplay briefing advanced from a touch interaction with subtitle',flush=True)
  page.close()

 page=browser.new_page(viewport={'width':800,'height':470},service_workers='block')
 seed(page,{**story,'chapterArc':{'mission':3,'step':0,'status':'complete','reason':'','lead':'intercepted'}},
  {**sample,'x':-168.7,'z':194.85,'y':.083,'yaw':math.pi,'face':0})
 problem=errors(page)
 page.goto(base+'/',wait_until='domcontentloaded')
 open_game(page)
 page.locator('[data-interaction="chapter-briefing-table"]').click(timeout=15000)
 assert '운행장부' in page.locator('#toast').inner_text()
 page.locator('[data-interaction="chapter-talk-chapter-jack"]').click(timeout=15000)
 page.wait_for_function("document.querySelector('#story-subtitle').textContent.startsWith('Jack · ')")
 page.screenshot(path=str(screenshot_root/'breakwater-yard.png'))
 assert not problem,problem
 print('Chapter completion unlocked the rendezvous table and recalled the intercepted ledger',flush=True)
 browser.close()
 server.shutdown()
