import { banner, cleanTip, go } from '../ui.js'

const items = [
  { name: '图片圆形裁剪', desc: '裁剪圆形头像', icon: '圆', color: '#8B0000', url: '/cropper?mode=circle' },
  { name: '批量改尺寸大小', desc: '自定义分辨率，等比例', icon: '尺', color: '#3b5bdb', url: '/resize' },
  { name: '智能尺寸裁剪', desc: '高斯模糊垫底，自定义裁剪', icon: '智', color: '#e8590c', url: '/smart-crop', fire: true },
  { name: '自定义切图', desc: '等份横切、纵切、九宫格', icon: '切', color: '#2b8a3e', url: '/slice' }
]

export default {
  title: '图片尺寸裁剪',
  render(root) {
    root.innerHTML = `${banner()}
      ${items.map(t => `<div class="list-card" data-u="${t.url}"><div class="l-icon" style="background:${t.color}">${t.icon}</div>
        <div class="l-main"><div class="l-name">${t.name}${t.fire ? ' 🔥' : ''}</div><div class="l-desc">${t.desc}</div></div>
        <div class="l-btn" style="background:${t.color}">去使用</div></div>`).join('')}
      <div class="shortcut-bar"><div class="sc" data-u="/cropper?mode=quick">✂ 图片快速裁剪</div><div class="sc" data-u="/convert">⇄ 图片格式转换</div></div>
      ${cleanTip()}`
    root.querySelectorAll('[data-u]').forEach(n => { n.onclick = () => go(n.dataset.u) })
  }
}
