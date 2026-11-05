import { banner, cleanTip, pickFiles, toast, loading, hideLoading, paint, actionSheet, modal, fail } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult, MAX_SIDE } from '../img.js'
import { embedText, readText } from '../filters.js'
import { saveResults } from '../platform.js'

const ITEMS = [
  { k: 'banner', n: '超级横幅', d: '底部大字横幅', c: 'linear-gradient(135deg,#9775fa,#6741d9)' },
  { k: 'invisible', n: '隐形水印', d: '肉眼不可见，可读取', c: 'linear-gradient(135deg,#ff8787,#e8590c)' },
  { k: 'full', n: '全屏水印', d: '平铺防盗图', c: 'linear-gradient(135deg,#ffd43b,#f59f00)' },
  { k: 'avatar', n: '头像水印', d: '角落圆形头像', c: 'linear-gradient(135deg,#3bc9db,#1098ad)' }
]

export default {
  title: '图片添加水印',
  render(root) {
    let res = null
    root.innerHTML = `${banner()}
      <div class="grid4">${ITEMS.map(it => `<div class="grid-card" data-k="${it.k}" style="background:${it.c}">
        <div class="g-name">${it.n}</div><div class="g-desc">${it.d}</div><div class="g-go">去添加 ›</div></div>`).join('')}</div>
      <div id="result"></div>${cleanTip()}`
    const $ = s => root.querySelector(s)

    const readInvisible = async () => {
      const [f] = await pickFiles(); if (!f) return
      loading('读取中'); await paint()
      try {
        const im = await loadImage(f)
        if (Math.max(im.naturalWidth, im.naturalHeight) > MAX_SIDE) throw new Error('图片过大，无法读取')
        const { ctx } = makeCanvas(im.naturalWidth, im.naturalHeight, '#ffffff')
        ctx.drawImage(im, 0, 0)
        const text = readText(ctx.getImageData(0, 0, im.naturalWidth, im.naturalHeight))
        hideLoading()
        modal({ title: text ? '读取成功' : '未发现隐形水印', content: text || '这张图没有本工具添加的隐形水印，或已被压缩。', cancel: false })
      } catch (e) { fail(e) }
    }

    root.querySelectorAll('[data-k]').forEach(n => {
      n.onclick = async () => {
        const k = n.dataset.k
        if (k === 'invisible') {
          const i = await actionSheet(['添加隐形水印', '读取隐形水印'])
          if (i < 0) return
          if (i === 1) return readInvisible()
        }
        let text = ''
        if (k !== 'avatar') {
          text = await modal({ title: '输入水印文字', input: true, placeholder: '如：@我的店铺' })
          if (!text) return
        }
        const [main] = await pickFiles(); if (!main) return
        let av = null
        if (k === 'avatar') {
          toast('再选择头像图片')
          const [a] = await pickFiles(); if (!a) return
          av = await loadImage(a)
        }
        loading('生成中'); await paint()
        try {
          const im = await loadImage(main)
          const { w: W, h: H } = fitMax(im.naturalWidth, im.naturalHeight, k === 'invisible' ? MAX_SIDE : 3000)
          const { c, ctx } = makeCanvas(W, H, '#ffffff')
          ctx.drawImage(im, 0, 0, W, H)
          let type = 'jpg'
          if (k === 'full') {
            const fs = Math.max(18, Math.round(Math.min(W, H) / 16))
            ctx.save()
            ctx.font = `bold ${fs}px sans-serif`
            ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1
            ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 6)
            const tw = ctx.measureText(text).width + fs * 3, diag = Math.hypot(W, H)
            for (let y = -diag / 2; y < diag / 2; y += fs * 4) for (let x = -diag / 2; x < diag / 2; x += tw) { ctx.fillText(text, x, y); ctx.strokeText(text, x, y) }
            ctx.restore()
          } else if (k === 'banner') {
            const bh = Math.round(H * 0.12)
            const g = ctx.createLinearGradient(0, H - bh, W, H)
            g.addColorStop(0, 'rgba(103,65,217,0.88)'); g.addColorStop(1, 'rgba(151,117,250,0.88)')
            ctx.fillStyle = g; ctx.fillRect(0, H - bh, W, bh)
            let fs = Math.round(bh * 0.46)
            ctx.font = `bold ${fs}px sans-serif`
            while (ctx.measureText(text).width > W * 0.9 && fs > 10) { fs -= 2; ctx.font = `bold ${fs}px sans-serif` }
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.fillText(text, W / 2, H - bh / 2)
          } else if (k === 'invisible') {
            const id = ctx.getImageData(0, 0, W, H); embedText(id, text); ctx.putImageData(id, 0, 0)
            type = 'png' // 必须无损保存
          } else if (k === 'avatar') {
            const d = Math.round(Math.min(W, H) * 0.18), m = Math.round(d * 0.25)
            const cx = W - m - d / 2, cy = H - m - d / 2
            ctx.beginPath(); ctx.arc(cx, cy, d / 2 + 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.clip()
            const s = Math.max(d / av.naturalWidth, d / av.naturalHeight)
            ctx.drawImage(av, cx - av.naturalWidth * s / 2, cy - av.naturalHeight * s / 2, av.naturalWidth * s, av.naturalHeight * s)
            ctx.restore()
          }
          res = await canvasResult(c, type, 0.95, 'watermark')
          hideLoading()
          const name = ITEMS.find(i => i.k === k).n
          $('#result').innerHTML = `<div class="card"><div class="card-title">${name}${k === 'invisible' ? ' · 请保存原图，勿压缩' : ''}</div>
            <img class="preview" src="${res.url}"><button class="btn" id="save">保存到相册</button></div>`
          $('#save').onclick = () => saveResults([res])
          $('#result').scrollIntoView({ behavior: 'smooth' })
        } catch (e) { fail(e) }
      }
    })
  }
}
