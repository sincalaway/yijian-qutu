// 视频取图：截取当前帧 / 均匀批量抽帧（<video> + Canvas）
import { uploadBox, cleanTip, pickFiles, toast, loading, hideLoading, fail } from '../ui.js'
import { makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'
import { shared } from '../shared.js'

const COUNTS = [6, 9, 12, 16]

export default {
  title: '视频取图',
  render(root) {
    let video = null, frames = [], ci = 1, busy = false
    root.innerHTML = `<div class="card" id="box">${uploadBox('从相册导入视频', '🎬')}</div>
      <div id="frames"></div>${cleanTip('所有处理数据 24 小时后系统自动清除')}
      <div class="footer"><button class="btn ghost" id="pick">导入视频</button><button class="btn" id="snap" disabled>截取当前帧</button></div>`
    const $ = s => root.querySelector(s)

    const drawFrames = () => {
      if (!frames.length) { $('#frames').innerHTML = ''; return }
      $('#frames').innerHTML = `<div class="card"><div class="row"><span class="card-title" style="margin:0">已截取 ${frames.length} 张</span><span class="link" id="saveAll">全部保存</span></div>
        <div class="thumbs" style="margin-top:8px">${frames.map((f, i) => `<div class="thumb"><img src="${f.url}"><div class="del" data-d="${i}">×</div><div class="tag"><span>${f.t.toFixed(1)}s</span></div></div>`).join('')}</div></div>`
      $('#saveAll').onclick = () => saveResults(frames)
      root.querySelectorAll('[data-d]').forEach(n => { n.onclick = () => { frames.splice(+n.dataset.d, 1); drawFrames() } })
    }
    const grab = async () => {
      const w = video.videoWidth, h = video.videoHeight
      if (!w) throw new Error('视频还没准备好')
      const { c, ctx } = makeCanvas(w, h)
      ctx.drawImage(video, 0, 0, w, h)
      const r = await canvasResult(c, 'jpg', 0.95, 'frame')
      r.t = video.currentTime
      return r
    }
    const seek = t => new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('跳转超时')), 8000)
      video.addEventListener('seeked', () => { clearTimeout(to); setTimeout(res, 60) }, { once: true })
      video.currentTime = t
    })
    const choose = async () => {
      const [f] = await pickFiles({ accept: 'video/*' }); if (f) loadVideo(f)
    }
    const loadVideo = f => {
      $('#box').innerHTML = `<video class="player" id="v" src="${URL.createObjectURL(f)}" controls playsinline preload="auto"></video>
        <div class="tip">暂停到想要的画面，点「截取当前帧」</div>
        <div class="row"><span class="label">均匀抽帧数量</span><div class="chips" id="cnt">${COUNTS.map((n, i) => `<div class="chip ${i === ci ? 'on' : ''}" data-i="${i}">${n}张</div>`).join('')}</div></div>
        <button class="btn ghost" id="batch" style="margin-top:8px">一键均匀抽帧</button>`
      video = $('#v')
      video.onerror = () => toast('该视频格式无法播放')
      $('#snap').disabled = false; $('#pick').textContent = '更换视频'
      $('#cnt').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; ci = +c.dataset.i; root.querySelectorAll('#cnt .chip').forEach(n => n.classList.toggle('on', n === c)) }
      $('#batch').onclick = batch
    }
    const batch = async () => {
      if (busy || !video) return
      if (!video.duration || !isFinite(video.duration)) return toast('视频还没准备好')
      busy = true; video.pause()
      const n = COUNTS[ci], back = video.currentTime
      try {
        for (let i = 0; i < n; i++) {
          loading(`抽帧 ${i + 1}/${n}`)
          await seek(video.duration * (i + 0.5) / n)
          frames.push(await grab())
        }
        await seek(back)
      } catch (e) { fail(e) }
      hideLoading(); busy = false; drawFrames()
    }
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    if (shared.video) { loadVideo(shared.video); shared.video = null }
    $('#snap').onclick = async () => {
      if (!video) return
      try { video.pause(); frames.push(await grab()); drawFrames(); toast('已截取') } catch (e) { fail(e) }
    }
  }
}
