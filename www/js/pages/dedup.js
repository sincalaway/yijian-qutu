// 图片去重：微调裁边 + 像素扰动 + 重新编码，每张图 MD5 都会改变
import { hero, cleanTip, pickFiles, toast, loading, hideLoading, paint, modal } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'

export default {
  title: '图片批量处理',
  render(root) {
    let list = []
    root.innerHTML = `${hero('去重模式', '修改 MD5 · 提高原创性')}
      <div class="card blank" id="area"></div>${cleanTip()}
      <div class="footer"><button class="btn ghost" id="add">上传图片</button><button class="btn pink" style="flex:1.6" id="go">一键处理并保存相册</button></div>`
    const $ = s => root.querySelector(s)
    const draw = () => {
      if (!list.length) {
        $('#area').innerHTML = '<div class="empty" id="e"><span class="cam">🖼</span><span style="margin-top:8px">点击上传图片，支持批量</span></div>'
        $('#e').onclick = choose
        return
      }
      $('#area').innerHTML = `<div class="thumbs">${list.map((u, i) => `<div class="thumb"><img src="${u}"><div class="del" data-d="${i}">×</div></div>`).join('')}
        <div class="add-tile" id="more"><span class="plus">+</span><span>继续添加</span></div></div>`
      $('#more').onclick = choose
      root.querySelectorAll('[data-d]').forEach(n => { n.onclick = () => { list.splice(+n.dataset.d, 1); draw() } })
    }
    const choose = async () => {
      const files = await pickFiles({ multiple: true })
      list = list.concat(files.map(f => URL.createObjectURL(f))).slice(0, 30)
      draw()
    }
    $('#add').onclick = choose
    $('#go').onclick = async () => {
      if (!list.length) return toast('请先上传图片')
      const outs = []
      for (let i = 0; i < list.length; i++) {
        loading(`处理中 ${i + 1}/${list.length}`); await paint()
        try {
          const im = await loadImage(list[i])
          const iw = im.naturalWidth, ih = im.naturalHeight
          const f = fitMax(iw, ih)
          const m = 0.004 + Math.random() * 0.008
          const { c, ctx } = makeCanvas(f.w, f.h, '#ffffff')
          ctx.drawImage(im, iw * m, ih * m, iw * (1 - 2 * m), ih * (1 - 2 * m), 0, 0, f.w, f.h)
          const id = ctx.getImageData(0, 0, f.w, f.h), d = id.data, px = d.length / 4
          for (let j = 0; j < Math.min(800, px); j++) {
            const p = ((Math.random() * px) | 0) * 4 + ((Math.random() * 3) | 0)
            d[p] = d[p] + (Math.random() < 0.5 ? -1 : 1)
          }
          ctx.putImageData(id, 0, 0)
          outs.push(await canvasResult(c, 'jpg', 0.88 + Math.random() * 0.08, 'dedup'))
        } catch (e) {}
      }
      hideLoading()
      if (!outs.length) return toast('处理失败')
      await modal({ title: '处理完成', content: `已处理 ${outs.length} 张，MD5 均已改变。接下来保存到相册。`, cancel: false })
      saveResults(outs)
    }
    draw()
  }
}
