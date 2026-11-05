import { go, modal, cleanTip, toast } from '../ui.js'
import { shareApp, addDesktop } from '../platform.js'
import config from '../config.js'

const slides = [
  { title: '实用图片处理工具', sub: '让图片成为你想要的样子', bg: 'linear-gradient(135deg,#8B0000,#A52A2A)' },
  { title: '智能去水印 · 限免', sub: '涂抹一下，水印就不见了', bg: 'linear-gradient(135deg,#a51111,#d6336c)', url: '/watermark' },
  { title: '视频一键取图', sub: '任意帧高清截取，批量抽帧', bg: 'linear-gradient(135deg,#7a0d0d,#e8590c)', url: '/frame' }
]
const quick = [
  { name: '粘贴链接', icon: '链', hot: true, url: '/link' },
  { name: '视频取图', icon: '帧', url: '/frame' },
  { name: '提取音频', icon: '音', url: '/video-import' },
  { name: '提取文案', icon: '文', url: '/video-import' },
  { name: '去字幕', icon: '字', url: '/video-tool?mode=subtitle' }
]
const tools = [
  { name: '图片尺寸裁剪', desc: '批量尺寸修改、裁剪、切图', icon: '裁', color: '#8B0000', bg: '#ffffff', btn: '去使用', url: '/crop' },
  { name: '图片格式转换', desc: 'JPG / PNG / WEBP / BMP 互转', icon: '转', color: '#3b5bdb', bg: '#f3f6ff', btn: '去使用', url: '/convert' },
  { name: '图片视频提取', desc: '粘贴链接、视频取图、提取音频、去字幕', icon: '取', color: '#e8590c', bg: '#fff6ef', btn: '去使用', url: '/extract' },
  { name: '智能图片去水印', desc: '一键去除、涂抹去除', icon: '净', color: '#d6336c', bg: '#fff0f6', btn: '去使用', url: '/watermark', hot: true },
  { name: '图片压缩', desc: '无损压缩、自定义尺寸', icon: '压', color: '#2b8a3e', bg: '#f1fbf3', btn: '去使用', url: '/compress' },
  { name: '图片增强', desc: '清晰度增强、色彩修复、无损放大', icon: '清', color: '#7048e8', bg: '#f5f2ff', btn: '去使用', url: '/enhance' },
  { name: '一键抠图', desc: '智能抠图、白底图、换底色', icon: '抠', color: '#1098ad', bg: '#effbfc', btn: '去使用', api: 'matting' },
  { name: '图片去重', desc: '修改 MD5，提高原创性', icon: '重', color: '#c2255c', bg: '#fff0f6', btn: '去使用', url: '/dedup' },
  { name: '图片添加水印', desc: '全屏 / 隐形 / 头像水印', icon: '印', color: '#f08c00', bg: '#fff9eb', btn: '去添加', url: '/add-watermark' },
  { name: '图片拼图', desc: '高清横竖拼图', icon: '拼', color: '#5c1a1a', bg: '#f8f1ef', btn: '去拼接', url: '/stitch' }
]
const mini = [
  { name: '图片消除笔', icon: '笔', color: '#d6336c', url: '/watermark-edit?mode=normal' },
  { name: '图片贴纸添加', icon: '贴', color: '#f08c00', soon: true },
  { name: '图片添加圆角', icon: '角', color: '#1098ad', url: '/rounded' },
  { name: '视频提取裁剪', icon: '剪', color: '#7048e8', url: '/video-tool?mode=crop' }
]
export function openItem(it) {
  if (!it) return
  if (it.url) return go(it.url)
  if (it.api && config.API_BASE) return toast('请在 js/config.js 对接接口')
  modal({
    title: it.name,
    content: it.soon ? '该功能即将上线，敬请期待。' : '该功能依赖服务端 AI 能力，在 js/config.js 配置 API_BASE 后即可接入。',
    cancel: false
  })
}

export default {
  title: '一键取图',
  tab: true,
  render(root) {
    root.innerHTML = `
      <div class="top"><div class="swiper">
        <div class="track">${slides.map((s, i) => `<div class="slide" data-s="${i}" style="background:${s.bg}">
          <div class="banner-title">${s.title}</div>
          <div class="banner-sub"><span class="star">★</span>${s.sub}<span class="star">★</span></div>
          <div class="slide-tip">所有图片处理数据 24 小时后系统自动清除</div></div>`).join('')}</div>
        <div class="sw-dots">${slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>
      </div></div>

      <div class="quick-card"><div class="quick">${quick.map((q, i) => `<div class="quick-item" data-l="quick" data-i="${i}">
        <div class="q-icon">${q.icon}${q.hot ? '<span class="fire">🔥</span>' : ''}</div><span class="q-name">${q.name}</span></div>`).join('')}</div></div>

      ${tools.map((t, i) => `<div class="tool" data-l="tools" data-i="${i}" style="background:${t.bg}">
        <div class="l-icon" style="background:${t.color}">${t.icon}</div>
        <div class="l-main"><div class="l-name">${t.name}${t.hot ? '<span class="hot">🔥热门</span>' : ''}</div><div class="l-desc">${t.desc}</div></div>
        <div class="l-btn" style="background:${t.color}">${t.btn}</div></div>`).join('')}

      <div class="section-title">更多小工具</div>
      <div class="mini-grid">${mini.map((m, i) => `<div class="mini" data-l="mini" data-i="${i}">
        <div class="mini-icon" style="color:${m.color};border-color:${m.color}">${m.icon}</div><span>${m.name}</span></div>`).join('')}</div>

      ${cleanTip()}
      <div class="footer above-tab"><button class="btn ghost" id="desk">添加到桌面</button><button class="btn" id="share">分享给好友</button></div>`

    const lists = { quick, tools, mini }
    root.querySelectorAll('[data-l]').forEach(n => { n.onclick = () => openItem(lists[n.dataset.l][n.dataset.i]) })
    root.querySelectorAll('[data-s]').forEach(n => { n.onclick = () => openItem(slides[n.dataset.s]) })
    root.querySelector('#desk').onclick = addDesktop
    root.querySelector('#share').onclick = shareApp

    const track = root.querySelector('.track')
    const dots = root.querySelectorAll('.sw-dots i')
    let idx = 0
    track.addEventListener('scroll', () => {
      idx = Math.round(track.scrollLeft / track.clientWidth)
      dots.forEach((d, i) => d.classList.toggle('on', i === idx))
    }, { passive: true })
    const timer = setInterval(() => {
      idx = (idx + 1) % slides.length
      track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' })
    }, 4000)
    return () => clearInterval(timer)
  }
}
