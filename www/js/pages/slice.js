// 自定义切图：等份横切 / 纵切 / 宫格
import { uploadBox, cleanTip, pickFiles, toast, loading, hideLoading, paint, fail } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'

const PRESETS = [['横切 2', 2, 1], ['横切 3', 3, 1], ['纵切 2', 1, 2], ['纵切 3', 1, 3], ['四宫格', 2, 2], ['九宫格', 3, 3]]

export default {
  title: '自定义切图',
  render(root) {
    let im = null, rows = 1, cols = 3, pieces = []
    root.innerHTML = `<div class="card" id="box">${uploadBox('上传要切分的图片')}</div>
      <div class="card"><div class="chips" id="pre"></div>
        <div class="row" style="margin-top:8px"><span>等份横切（行）</span><div class="stepper"><span data-s="r-">－</span><span class="num" id="rn"></span><span data-s="r+">＋</span></div></div>
        <div class="row"><span>等份纵切（列）</span><div class="stepper"><span data-s="c-">－</span><span class="num" id="cn"></span><span data-s="c+">＋</span></div></div></div>
      <div id="result"></div>${cleanTip()}
      <div class="footer"><button class="btn ghost" id="pick">上传图片</button><button class="btn" id="go" disabled>开始切图</button></div>`
    const $ = s => root.querySelector(s)

    const draw = () => {
      $('#rn').textContent = rows; $('#cn').textContent = cols
      $('#pre').innerHTML = PRESETS.map((p, i) => `<div class="chip ${rows === p[1] && cols === p[2] ? 'on' : ''}" data-i="${i}">${p[0]}</div>`).join('')
      if (im) {
        let lines = ''
        for (let i = 1; i < rows; i++) lines += `<div class="hline" style="top:${i * 100 / rows}%"></div>`
        for (let i = 1; i < cols; i++) lines += `<div class="vline" style="left:${i * 100 / cols}%"></div>`
        $('#box').innerHTML = `<div class="grid-wrap"><img class="preview" src="${im.src}">${lines}</div>`
      }
    }
    const set = (r, c) => { rows = Math.max(1, Math.min(6, r)); cols = Math.max(1, Math.min(6, c)); pieces = []; $('#result').innerHTML = ''; draw() }
    const choose = async () => {
      const [f] = await pickFiles(); if (!f) return
      try { im = await loadImage(f); $('#go').disabled = false; $('#pick').textContent = '更换图片'; set(rows, cols) } catch (e) { fail(e) }
    }
    $('#pre').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; const p = PRESETS[+c.dataset.i]; set(p[1], p[2]) }
    root.querySelectorAll('[data-s]').forEach(n => {
      n.onclick = () => { const s = n.dataset.s; set(rows + (s === 'r+' ? 1 : s === 'r-' ? -1 : 0), cols + (s === 'c+' ? 1 : s === 'c-' ? -1 : 0)) }
    })
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#go').onclick = async () => {
      if (!im) return toast('请先上传图片')
      if (rows * cols < 2) return toast('至少切成 2 块')
      try {
        const sw = im.naturalWidth / cols, sh = im.naturalHeight / rows
        const f = fitMax(Math.round(sw), Math.round(sh))
        pieces = []
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          loading(`切图 ${pieces.length + 1}/${rows * cols}`); await paint()
          const m = makeCanvas(f.w, f.h, '#ffffff')
          m.ctx.drawImage(im, c * sw, r * sh, sw, sh, 0, 0, f.w, f.h)
          pieces.push(await canvasResult(m.c, 'jpg', 0.95, `slice_${r + 1}-${c + 1}`))
        }
        hideLoading()
        $('#result').innerHTML = `<div class="card"><div class="card-title">共 ${pieces.length} 张</div>
          <div class="pieces" style="grid-template-columns:repeat(${cols},1fr)">${pieces.map(p => `<img src="${p.url}">`).join('')}</div>
          <button class="btn" id="save">全部保存到相册</button></div>`
        $('#save').onclick = () => saveResults(pieces)
        $('#result').scrollIntoView({ behavior: 'smooth' })
      } catch (e) { fail(e) }
    }
    draw()
  }
}
