// 图片视频提取（二级目录）
import { go, cleanTip } from '../ui.js'
import { shareApp, addDesktop } from '../platform.js'

const ICONS = {
  link: '<svg viewBox="0 0 48 48"><circle cx="13" cy="14" r="5" fill="#f4a3a3"/><path d="M4 40 18 22l8 10 6-7 12 15z" fill="#c92a2a"/><path d="M4 40 18 22l8 10z" fill="#e57373"/></svg>',
  video: '<svg viewBox="0 0 48 48"><rect x="4" y="12" width="28" height="24" rx="6" fill="#f4c2c2"/><path d="M34 21l10-6v18l-10-6z" fill="#c92a2a"/><path d="M15 19v10l8-5z" fill="#fff"/></svg>',
  sub: '<svg viewBox="0 0 48 48"><rect x="5" y="7" width="30" height="26" rx="4" fill="none" stroke="#d6336c" stroke-width="3"/><path d="M16 14v12l9-6z" fill="#d6336c"/><rect x="19" y="24" width="24" height="18" rx="3" fill="#fff" stroke="#c92a2a" stroke-width="3"/><path d="M25 37l6-10 6 10m-10-3.5h8" fill="none" stroke="#c92a2a" stroke-width="2.6" stroke-linecap="round"/></svg>'
}

const ITEMS = [
  { k: 'link', name: '粘贴链接', fire: true, desc: '从平台分享复制链接', btn: '进入', url: '/link' },
  { k: 'video', name: '相册视频导入', desc: '视频取图，提取音频，提取文案', btn: '导入', url: '/video-import' },
  { k: 'sub', name: '去字幕', desc: '去水印，去字幕，裁剪视频等', btn: '使用', url: '/video-tool?mode=subtitle' }
]

export default {
  title: '图片视频提取',
  cls: 'white',
  render(root) {
    root.innerHTML = `
      <div class="ex-banner">
        <div class="ex-brand"><span class="ex-logo"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="#8B0000" stroke-width="2"/><circle cx="15.5" cy="9.5" r="1.8" fill="#8B0000"/><path d="M5 17l5-5 4 4 2-2 3 3" fill="none" stroke="#8B0000" stroke-width="2"/></svg></span>一键取图</div>
        <div class="ex-title">实用图片处理工具</div>
        <div class="ex-sub">让图片成为你想要的样子 ✦</div>
      </div>
      <div class="ex-list">${ITEMS.map(it => `<div class="ex-card" data-u="${it.url}">
        <div class="ex-icon">${ICONS[it.k]}</div>
        <div class="ex-main"><div class="ex-name">${it.name}${it.fire ? '<span class="ex-fire">🔥</span>' : ''}</div><div class="ex-desc">${it.desc}</div></div>
        <div class="ex-btn">${it.btn}</div></div>`).join('')}</div>
      <div class="ex-actions">
        <div class="ex-act" id="desk">添加到桌面<svg viewBox="0 0 24 24"><path d="M12 3v11m0 0-4.5-4.5M12 14l4.5-4.5M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" fill="none" stroke="#c2255c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div class="ex-act" id="share">分享给好友<svg viewBox="0 0 24 24"><circle cx="18" cy="5.5" r="3" fill="none" stroke="#e03131" stroke-width="2"/><circle cx="6" cy="12" r="3" fill="none" stroke="#e03131" stroke-width="2"/><circle cx="18" cy="18.5" r="3" fill="none" stroke="#e03131" stroke-width="2"/><path d="m8.7 10.6 6.6-3.7m-6.6 6.5 6.6 3.7" stroke="#e03131" stroke-width="2"/></svg></div>
      </div>
      ${cleanTip('所有处理数据 24 小时后系统自动清除')}`
    root.querySelectorAll('[data-u]').forEach(n => { n.onclick = () => go(n.dataset.u) })
    root.querySelector('#desk').onclick = addDesktop
    root.querySelector('#share').onclick = shareApp
  }
}
