// 视频处理：去水印 / 去字幕（区域模糊或马赛克）/ 裁剪画面 + 截取时间段
// 原理：<video> 播放 → Canvas 逐帧处理 → MediaRecorder 录制（含原声）
import { uploadBox, cleanTip, pickFiles, toast, hideLoading, fail } from '../ui.js'
import { result, fmtSize, makeCanvas } from '../img.js'
import { saveResults } from '../platform.js'

const MODES = [
  { k: 'watermark', n: '去水印', tip: '框选水印位置' },
  { k: 'subtitle', n: '去字幕', tip: '框选字幕区域' },
  { k: 'crop', n: '裁剪画面', tip: '框选要保留的画面' }
]
const DEFAULT = { watermark: [0.62, 0.04, 0.34, 0.12], subtitle: [0.04, 0.78, 0.92, 0.16], crop: [0.1, 0.1, 0.8, 0.8] }
const fmtT = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = (t % 60).toFixed(1); return `${m}:${s.padStart(4, '0')}` }

function pickMime() {
  const list = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
  return (window.MediaRecorder && list.find(m => MediaRecorder.isTypeSupported(m))) || ''
}

export default {
  title: q => ({ watermark: '视频去水印', crop: '视频裁剪' }[q.get('mode')] || '视频去字幕'),
  render(root, q) {
    let mode = MODES.find(m => m.k === q.get('mode')) ? q.get('mode') : 'subtitle'
    let effect = 'blur', rect = DEFAULT[mode].slice(), video = null, start = 0, end = 0, busy = false, stop = null, res = null
    root.innerHTML = `<div class="card">
        <div class="seg" id="modes">${MODES.map(m => `<div class="seg-i ${m.k === mode ? 'on' : ''}" data-k="${m.k}">${m.n}</div>`).join('')}</div>
        <div id="box" style="margin-top:12px">${uploadBox('从相册导入视频', '🎬')}</div>
        <div class="tip" id="tip">${MODES.find(m => m.k === mode).tip}，拖动画框调整</div></div>
      <div class="card" id="opts"></div>
      <div id="out"></div>${cleanTip('所有处理数据 24 小时后系统自动清除')}
      <div class="footer"><button class="btn ghost" id="pick">导入视频</button><button class="btn" id="go" disabled>开始处理</button></div>`
    const $ = s => root.querySelector(s)

    const drawOpts = () => {
      const d = video && video.duration && isFinite(video.duration) ? video.duration : 0
      $('#opts').style.display = d ? '' : 'none'
      $('#opts').innerHTML = `${mode !== 'crop' ? `<div class="opt-label">处理方式</div><div class="chips opt-chips" id="eff">
          <div class="chip ${effect === 'blur' ? 'on' : ''}" data-e="blur">模糊</div><div class="chip ${effect === 'mosaic' ? 'on' : ''}" data-e="mosaic">马赛克</div><div class="chip ${effect === 'fill' ? 'on' : ''}" data-e="fill">邻近填充</div></div>` : ''}
        <div class="row"><span>开始</span><span class="red" id="sv">${fmtT(start)}</span></div>
        <input type="range" id="st" min="0" max="1000" value="${d ? Math.round(start / d * 1000) : 0}" ${d ? '' : 'disabled'}>
        <div class="row"><span>结束</span><span class="red" id="ev">${fmtT(end)}</span></div>
        <input type="range" id="en" min="0" max="1000" value="${d ? Math.round(end / d * 1000) : 1000}" ${d ? '' : 'disabled'}>
        <div class="tip">处理按实际播放速度进行，时长越短越快</div>`
      const eff = $('#eff')
      if (eff) eff.onclick = e => { const c = e.target.closest('.chip'); if (!c) return; effect = c.dataset.e; drawOpts() }
      const st = $('#st'), en = $('#en')
      st.oninput = () => { start = Math.min(d * st.value / 1000, end - 0.5); if (start < 0) start = 0; $('#sv').textContent = fmtT(start); seekPreview(start) }
      en.oninput = () => { end = Math.max(d * en.value / 1000, start + 0.5); if (end > d) end = d; $('#ev').textContent = fmtT(end); seekPreview(end) }
    }
    const seekPreview = t => { if (video && !busy) { video.pause(); video.currentTime = t } }
    const placeRect = () => {
      const r = $('#rect'); if (!r) return
      r.style.left = rect[0] * 100 + '%'; r.style.top = rect[1] * 100 + '%'; r.style.width = rect[2] * 100 + '%'; r.style.height = rect[3] * 100 + '%'
      r.className = 'vrect' + (mode === 'crop' ? ' crop' : '')
    }
    const bindRect = () => {
      const wrap = $('#vwrap'), r = $('#rect')
      let drag = null
      r.addEventListener('pointerdown', e => {
        e.stopPropagation(); r.setPointerCapture(e.pointerId)
        const b = wrap.getBoundingClientRect()
        drag = { kind: e.target.classList.contains('vh') ? 'size' : 'move', x: e.clientX, y: e.clientY, r: rect.slice(), w: b.width, h: b.height }
      })
      r.addEventListener('pointermove', e => {
        if (!drag) return
        const dx = (e.clientX - drag.x) / drag.w, dy = (e.clientY - drag.y) / drag.h
        if (drag.kind === 'move') {
          rect[0] = Math.min(1 - rect[2], Math.max(0, drag.r[0] + dx)); rect[1] = Math.min(1 - rect[3], Math.max(0, drag.r[1] + dy))
        } else {
          rect[2] = Math.min(1 - rect[0], Math.max(0.05, drag.r[2] + dx)); rect[3] = Math.min(1 - rect[1], Math.max(0.04, drag.r[3] + dy))
        }
        placeRect()
      })
      const up = () => { drag = null }
      r.addEventListener('pointerup', up); r.addEventListener('pointercancel', up)
    }
    const choose = async () => {
      if (busy) return
      const [f] = await pickFiles({ accept: 'video/*' }); if (!f) return
      $('#out').innerHTML = ''; res = null
      $('#box').innerHTML = `<div class="vwrap" id="vwrap"><video id="v" src="${URL.createObjectURL(f)}" playsinline preload="auto"></video>
        <div class="vrect" id="rect"><span class="vh"></span></div></div>
        <div class="row"><span class="label" id="vinfo">读取中…</span><span class="link" id="play">▶ 预览</span></div>`
      video = $('#v')
      video.onloadedmetadata = () => {
        start = 0; end = video.duration
        const wrap = $('#vwrap'), cw = $('#box').clientWidth, ar = video.videoWidth / video.videoHeight
        const dw = Math.min(cw, 380 * ar)
        wrap.style.width = dw + 'px'; wrap.style.height = dw / ar + 'px'
        $('#vinfo').textContent = `${video.videoWidth}×${video.videoHeight} · ${fmtT(video.duration)} · ${fmtSize(f.size)}`
        drawOpts(); $('#go').disabled = false
      }
      video.onerror = () => toast('该视频格式无法播放')
      $('#play').onclick = () => { if (video.paused) { video.play(); $('#play').textContent = '❚❚ 暂停' } else { video.pause(); $('#play').textContent = '▶ 预览' } }
      $('#pick').textContent = '更换视频'
      placeRect(); bindRect()
    }

    // 区域处理
    const tmp = makeCanvas(8, 8)
    const applyEffect = (ctx, W, H, sx, sy, sw, sh) => {
      if (sw < 2 || sh < 2) return
      if (effect === 'fill') {
        // 用框上方与下方的画面向中间渐变覆盖
        const band = Math.max(2, Math.round(sh * 0.25))
        const topY = Math.max(0, sy - band), botY = Math.min(H - band, sy + sh)
        ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip()
        ctx.drawImage(ctx.canvas, sx, topY, sw, band, sx, sy, sw, sh / 2 + 1)
        ctx.drawImage(ctx.canvas, sx, botY, sw, band, sx, sy + sh / 2, sw, sh / 2)
        ctx.restore()
      }
      const k = effect === 'mosaic' ? Math.max(6, Math.round(Math.min(W, H) / 40)) : Math.max(10, Math.round(Math.min(W, H) / 30))
      const tw = Math.max(1, Math.round(sw / k)), th = Math.max(1, Math.round(sh / k))
      tmp.c.width = tw; tmp.c.height = th
      tmp.ctx.imageSmoothingEnabled = true
      tmp.ctx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, tw, th)
      ctx.save()
      ctx.imageSmoothingEnabled = effect !== 'mosaic'
      ctx.drawImage(tmp.c, 0, 0, tw, th, sx, sy, sw, sh)
      ctx.restore()
    }

    const process = async () => {
      if (!video || busy) return
      const mime = pickMime()
      if (!mime) return toast('当前浏览器不支持视频录制')
      const vw = video.videoWidth, vh = video.videoHeight
      const [rx, ry, rw, rh] = [rect[0] * vw, rect[1] * vh, rect[2] * vw, rect[3] * vh]
      let W = mode === 'crop' ? rw : vw, H = mode === 'crop' ? rh : vh
      const s = Math.min(1, 1920 / Math.max(W, H)); W = Math.round(W * s / 2) * 2; H = Math.round(H * s / 2) * 2
      const { c, ctx } = makeCanvas(W, H, '#000')
      const stream = c.captureStream(30)
      try {
        const vs = (video.captureStream || video.mozCaptureStream).call(video)
        vs.getAudioTracks().forEach(t => stream.addTrack(t))
      } catch (e) {}
      const chunks = []
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 })
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data) }
      busy = true; $('#go').textContent = '停止'; $('#go').classList.add('pink')
      video.pause(); video.muted = false
      await new Promise(r => { video.onseeked = () => { video.onseeked = null; r() }; video.currentTime = start })
      let raf = 0, done = false
      const finish = () => new Promise(r => { if (done) return r(); done = true; cancelAnimationFrame(raf); video.pause(); rec.onstop = r; rec.stop() })
      stop = finish
      const draw = () => {
        if (mode === 'crop') ctx.drawImage(video, rx, ry, rw, rh, 0, 0, W, H)
        else { ctx.drawImage(video, 0, 0, W, H); applyEffect(ctx, W, H, rx * s, ry * s, rw * s, rh * s) }
        const p = Math.min(1, (video.currentTime - start) / Math.max(0.1, end - start))
        $('#go').textContent = `停止（${Math.round(p * 100)}%）`
        if (video.currentTime >= end || video.ended) { finish(); return }
        raf = requestAnimationFrame(draw)
      }
      rec.start(500)
      await video.play().catch(() => {})
      raf = requestAnimationFrame(draw)
      await new Promise(r => { const t = setInterval(() => { if (done) { clearInterval(t); r() } }, 200) })
      await new Promise(r => setTimeout(r, 300))
      busy = false; stop = null
      $('#go').textContent = '开始处理'; $('#go').classList.remove('pink')
      try {
        const blob = new Blob(chunks, { type: mime.split(';')[0] })
        if (!blob.size) throw new Error('录制失败，请重试')
        res = result(blob, 'video_' + mode, mime.includes('mp4') ? 'mp4' : 'webm')
        $('#out').innerHTML = `<div class="card"><div class="card-title">处理完成 · ${W}×${H} · ${fmtSize(res.size)}</div>
          <video class="player" src="${res.url}" controls playsinline></video><button class="btn" id="saveV">保存视频</button></div>`
        $('#saveV').onclick = () => saveResults([res])
        $('#out').scrollIntoView({ behavior: 'smooth' })
      } catch (e) { fail(e) }
    }

    $('#modes').onclick = e => {
      const c = e.target.closest('.seg-i'); if (!c || busy) return
      mode = c.dataset.k; rect = DEFAULT[mode].slice()
      root.querySelectorAll('.seg-i').forEach(n => n.classList.toggle('on', n === c))
      $('#tip').textContent = MODES.find(m => m.k === mode).tip + '，拖动画框调整'
      const t = { watermark: '视频去水印', subtitle: '视频去字幕', crop: '视频裁剪' }[mode]
      document.title = t + ' · 一键取图'
      const nt = document.querySelector('.nav-t'); if (nt) nt.textContent = t
      history.replaceState(null, '', '#/video-tool?mode=' + mode)
      placeRect(); drawOpts()
    }
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#go').onclick = () => (busy ? stop && stop() : process())
    drawOpts()
    return () => { if (stop) stop(); hideLoading() }
  }
}
