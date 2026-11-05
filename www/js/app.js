import { el, esc, go, actionSheet } from './ui.js'
import { initPlatform, isNative, shareApp, addDesktop } from './platform.js'
import * as store from './store.js'

import home from './pages/home.js'
import roi from './pages/roi.js'
import video from './pages/video.js'
import mine from './pages/mine.js'
import compress from './pages/compress.js'
import convert from './pages/convert.js'
import watermark from './pages/watermark.js'
import watermarkEdit from './pages/watermark-edit.js'
import stitch from './pages/stitch.js'
import crop from './pages/crop.js'
import cropper from './pages/cropper.js'
import resize from './pages/resize.js'
import smartCrop from './pages/smart-crop.js'
import slice from './pages/slice.js'
import enhance from './pages/enhance.js'
import addWatermark from './pages/add-watermark.js'
import dedup from './pages/dedup.js'
import rounded from './pages/rounded.js'
import frame from './pages/frame.js'
import link from './pages/link.js'

const routes = {
  '/': home, '/roi': roi, '/video': video, '/mine': mine,
  '/compress': compress, '/convert': convert, '/watermark': watermark, '/watermark-edit': watermarkEdit,
  '/stitch': stitch, '/crop': crop, '/cropper': cropper, '/resize': resize, '/smart-crop': smartCrop,
  '/slice': slice, '/enhance': enhance, '/add-watermark': addWatermark, '/dedup': dedup,
  '/rounded': rounded, '/frame': frame, '/link': link
}

const TABS = [
  { p: '/', t: '首页', i: '<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/>' },
  { p: '/roi', t: 'ROI计算', i: '<path d="M4 20V12h3v8zm6.5 0V7h3v13zM17 20V4h3v16z"/>' },
  { p: '/video', t: '视频处理', i: '<path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm7 3v6l5-3z"/>' },
  { p: '/mine', t: '我的', i: '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-8 9c0-4.4 3.6-7 8-7s8 2.6 8 7z"/>' }
]

function header(title, back) {
  const h = el(`<header class="nav">
    <div class="nav-l">${back ? '<span class="back">‹</span>' : ''}</div>
    <div class="nav-t">${esc(title)}</div>
    <div class="nav-r"><span class="dots"><i></i><i></i><i></i></span></div></header>`)
  if (back) h.querySelector('.back').onclick = () => (history.length > 1 ? history.back() : go('/'))
  h.querySelector('.dots').onclick = async () => {
    const i = await actionSheet(['回到首页', '分享给好友', '添加到桌面'])
    if (i === 0) go('/')
    if (i === 1) shareApp()
    if (i === 2) addDesktop()
  }
  return h
}

function tabbar(cur) {
  const n = el(`<nav class="tabbar">${TABS.map(t => `<a class="tab ${t.p === cur ? 'on' : ''}" href="#${t.p}">
    <svg viewBox="0 0 24 24">${t.i}</svg><span>${t.t}</span></a>`).join('')}</nav>`)
  n.querySelectorAll('a').forEach(a => a.addEventListener('click', e => {
    e.preventDefault()
    location.replace(a.getAttribute('href'))
  }))
  return n
}

let cleanup = null
function render() {
  const [p, qs] = (location.hash.slice(1) || '/').split('?')
  const route = routes[p] || home
  const q = new URLSearchParams(qs || '')
  if (typeof cleanup === 'function') { try { cleanup() } catch (e) {} }
  cleanup = null
  const app = document.getElementById('app')
  app.innerHTML = ''
  const title = typeof route.title === 'function' ? route.title(q) : route.title
  document.title = title === '一键取图' ? '一键取图' : title + ' · 一键取图'
  app.appendChild(header(title, !route.tab))
  const body = document.createElement('main')
  body.className = 'body' + (route.tab ? ' has-tab' : '') + (route.cls ? ' ' + route.cls : '')
  app.appendChild(body)
  if (route.tab) app.appendChild(tabbar(routes[p] ? p : '/'))
  window.scrollTo(0, 0)
  cleanup = route.render(body, q)
}

window.addEventListener('hashchange', render)
initPlatform()
store.cleanExpired()
document.addEventListener('visibilitychange', () => { if (!document.hidden) store.cleanExpired() })
render()

if ('serviceWorker' in navigator && !isNative && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {})
}
