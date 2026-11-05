// 智能尺寸裁剪：目标比例 + 模糊垫底 / 白底 / 居中裁剪
import { uploadBox, cleanTip, pickFiles, loading, hideLoading, paint, fail } from '../ui.js'
import { loadImage, makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'

const RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3']
const MODES = ['模糊垫底', '白色垫底', '居中裁剪']

export default {
  title: '智能尺寸裁剪',
  render(root) {
    let im = null, ri = 0, mi = 0, res = null
    root.innerHTML = `<div class="card" id="box">${uploadBox('上传图片，自动适配目标比例')}</div>
      <div class="card"><div class="card-title">目标比例</div>
        <div class="chips" id="ratios">${RATIOS.map((r, i) => `<div class="chip ${i === ri ? 'on' : ''}" data-i="${i}">${r}</div>`).join('')}</div>
        <div class="card-title" style="margin-top:14px">填充方式 🔥</div>
        <div class="chips" id="modes">${MODES.map((m, i) => `<div class="chip ${i === mi ? 'on' : ''}" data-i="${i}">${m}</div>`).join('')}</div>
        <div class="tip">模糊垫底：原图完整保留，空白处用模糊背景填充</div></div>
      ${cleanTip()}
      <div class="footer"><button class="btn ghost" id="pick">上传图片</button><button class="btn" id="save" disabled>保存到相册</button></div>`
    const $ = s => root.querySelector(s)

    const gen = async () => {
      if (!im) return
      loading('生成中'); await paint()
      try {
        const [a, b] = RATIOS[ri].split(':').map(Number)
        const W = a >= b ? 1600 : Math.round(1600 * a / b), H = a >= b ? Math.round(1600 * b / a) : 1600
        const iw = im.naturalWidth, ih = im.naturalHeight
        const { c, ctx } = makeCanvas(W, H, '#ffffff')
        if (mi === 2) {
          const s = Math.max(W / iw, H / ih), sw = W / s, sh = H / s
          ctx.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H)
        } else {
          if (mi === 0) {
            // 缩到极小再放大 = 柔和的高斯感模糊，兼容所有浏览器
            const tw = Math.max(8, Math.round(W / 28)), th = Math.max(8, Math.round(H / 28))
            const t = makeCanvas(tw, th, '#000')
            const s0 = Math.max(tw / iw, th / ih)
            t.ctx.drawImage(im, (tw - iw * s0) / 2, (th - ih * s0) / 2, iw * s0, ih * s0)
            ctx.drawImage(t.c, 0, 0, W, H)
            ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, W, H)
          }
          const s = Math.min(W / iw, H / ih), dw = iw * s, dh = ih * s
          ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh)
        }
        res = await canvasResult(c, 'jpg', 0.92, 'smartcrop')
        hideLoading()
        $('#box').innerHTML = `<img class="preview" src="${res.url}">`
        $('#save').disabled = false
      } catch (e) { fail(e) }
    }
    const choose = async () => {
      const [f] = await pickFiles(); if (!f) return
      try { im = await loadImage(f); $('#pick').textContent = '更换图片'; gen() } catch (e) { fail(e) }
    }
    const chips = (id, cb) => { $(id).onclick = e => { const c = e.target.closest('.chip'); if (!c) return; root.querySelectorAll(id + ' .chip').forEach(n => n.classList.toggle('on', n === c)); cb(+c.dataset.i); gen() } }
    chips('#ratios', i => { ri = i }); chips('#modes', i => { mi = i })
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#save').onclick = () => saveResults([res])
  }
}
