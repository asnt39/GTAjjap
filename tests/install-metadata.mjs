import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'

const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
test('the install name and existing icon set agree across the manifest and page',async()=>{
 const manifest=JSON.parse(await read('public/manifest.webmanifest'))
 const page=await read('index.html')
 const worker=await read('public/sw.js')
 assert.equal(manifest.id,'/')
 assert.equal(manifest.name,'Harborline')
 assert.equal(manifest.short_name,'Harborline')
 assert.match(page,/<meta name="apple-mobile-web-app-title" content="Harborline">/)
 const small=manifest.icons.find(icon=>icon.sizes==='192x192')
 assert(page.includes(`rel="icon" type="image/png" href="${small.src}"`))
 assert(page.includes(`rel="apple-touch-icon" href="${small.src}"`))
 for(const icon of manifest.icons){
  assert(worker.includes(icon.src))
  const png=await readFile(new URL('../public'+icon.src,import.meta.url))
  const size=Number(icon.sizes.split('x')[0])
  assert.equal(png.readUInt32BE(16),size)
  assert.equal(png.readUInt32BE(20),size)
 }
})
