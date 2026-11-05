import { banner, cleanTip } from '../ui.js'
import { openItem } from './home.js'

const items = [
  { name: '视频取图', desc: '任意帧高清截取、批量抽帧', icon: '帧', color: '#8B0000', url: '/frame', hot: true },
  { name: '提取音频', desc: '从视频中提取原声，导出 WAV', icon: '音', color: '#7048e8', url: '/video-import' },
  { name: '提取文案', desc: '语音识别成文字，一键复制', icon: '文', color: '#e8590c', url: '/video-import' },
  { name: '去字幕', desc: '框选字幕区域，模糊 / 马赛克 / 填充', icon: '字', color: '#1098ad', url: '/video-tool?mode=subtitle' },
  { name: '视频提取裁剪', desc: '截取片段、裁剪画面', icon: '剪', color: '#2b8a3e', url: '/video-tool?mode=crop' },
  { name: '视频去水印', desc: '框选水印位置一键抹除', icon: '净', color: '#c2255c', url: '/video-tool?mode=watermark' },
  { name: '粘贴链接', desc: '粘贴图片/网页链接直接取图', icon: '链', color: '#d6336c', url: '/link', hot: true }
]

export default {
  title: '视频处理',
  tab: true,
  render(root) {
    root.innerHTML = `${banner('相册视频导入', '视频取图 · 提取音频 · 提取文案')}
      ${items.map((t, i) => `<div class="list-card" data-i="${i}">
        <div class="l-icon" style="background:${t.color}">${t.icon}</div>
        <div class="l-main"><div class="l-name">${t.name}${t.hot ? ' 🔥' : ''}</div><div class="l-desc">${t.desc}</div></div>
        <div class="l-btn" style="background:${t.color}">去使用</div></div>`).join('')}
      ${cleanTip('所有处理数据 24 小时后系统自动清除')}`
    root.querySelectorAll('[data-i]').forEach(n => { n.onclick = () => openItem(items[n.dataset.i]) })
  }
}
