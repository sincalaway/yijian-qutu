import { banner, cleanTip, pickFiles, loading, hideLoading, paint, actionSheet, fail } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult, MAX_SIDE } from '../img.js'
import { sharpen, colorBoost } from '../filters.js'
import { saveResults } from '../platform.js'

const ITEMS = [
  { k: 'sharp', n: '清晰度增强', d: '模糊照片变清晰', c: 'linear-gradient(135deg,#e03131,#8B0000)', hot: true },
  { k: 'up', n: '图片无损放大', d: '2 倍高清放大', c: 'linear-gradient(135deg,#845ef7,#5f3dc4)' },
  { k: 'mirror', n: '图片镜像', d: '水平 / 垂直翻转', c: 'linear-gradient(135deg,#22b8cf,#0b7285)' },
  { k: 'uhd', n: '超高清增强', d: '放大 + 锐化 + 色彩修复', c: 'linear-gradient(135deg,#ffa94d,#e8590c)' }
]

export default {
  title: '图片增强处理',
  render(root) {
    let res = null
    root.innerHTML = `${banner()}
      <div class="grid4">${ITEMS.map(it => `<div class="grid-card" data-k="${it.k}" style="background:${it.c}">${it.hot ? '<div class="badge">热门</div>' : ''}
        <div class="g-name">${it.n}</div><div class="g-desc">${it.d}</div><div class="g-go">去使用 ›</div></div>`).join('')}</div>
      <div id="result"></div>${cleanTip()}`
    const $ = s => root.querySelector(s)

    root.querySelectorAll('[data-k]').forEach(n => {
      n.onclick = async () => {
        const k = n.dataset.k
        let dir = 'h'
        if (k === 'mirror') { const i = await actionSheet(['水平翻转', '垂直翻转']); if (i < 0) return; dir = i ? 'v' : 'h' }
        const [f] = await pickFiles(); if (!f) return
        loading('处理中'); await paint()
        try {
          const im = await loadImage(f)
          const iw = im.naturalWidth, ih = im.naturalHeight
          const t = (k === 'up' || k === 'uhd') ? fitMax(iw * 2, ih * 2, 3072) : fitMax(iw, ih, k === 'mirror' ? MAX_SIDE : 2400)
          const { c, ctx } = makeCanvas(t.w, t.h, '#ffffff')
          if (k === 'mirror') {
            ctx.save()
            if (dir === 'h') { ctx.translate(t.w, 0); ctx.scale(-1, 1) } else { ctx.translate(0, t.h); ctx.scale(1, -1) }
            ctx.drawImage(im, 0, 0, t.w, t.h); ctx.restore()
          } else {
            ctx.drawImage(im, 0, 0, t.w, t.h)
            const id = ctx.getImageData(0, 0, t.w, t.h)
            if (k === 'sharp') sharpen(id, 0.6)
            if (k === 'up') sharpen(id, 0.3)
            if (k === 'uhd') { sharpen(id, 0.7); colorBoost(id, 1.12, 1.06) }
            ctx.putImageData(id, 0, 0)
          }
          res = await canvasResult(c, 'jpg', 0.95, k)
          hideLoading()
          const name = ITEMS.find(i => i.k === k).n
          $('#result').innerHTML = `<div class="card"><div class="card-title">${name} · ${iw}×${ih} → ${t.w}×${t.h}</div>
            <img class="preview" id="cmp" src="${res.url}"><div class="tip" id="cmpTip">按住图片查看原图对比</div>
            <button class="btn" id="save">保存到相册</button></div>`
          const cmp = $('#cmp')
          const on = () => { cmp.src = im.src; $('#cmpTip').textContent = '原图' }
          const off = () => { cmp.src = res.url; $('#cmpTip').textContent = '按住图片查看原图对比' }
          cmp.onpointerdown = on; cmp.onpointerup = off; cmp.onpointerleave = off; cmp.oncontextmenu = e => e.preventDefault()
          $('#save').onclick = () => saveResults([res])
          $('#result').scrollIntoView({ behavior: 'smooth' })
        } catch (e) { fail(e) }
      }
    })
  }
}
