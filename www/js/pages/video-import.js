// 相册视频导入：视频取图 / 提取音频（本机解码导出 WAV）/ 提取文案（需服务端）
import { uploadBox, cleanTip, pickFiles, toast, loading, hideLoading, paint, modal, go, fail, esc } from '../ui.js'
import { result, fmtSize } from '../img.js'
import { saveResults } from '../platform.js'
import { shared } from '../shared.js'
import config from '../config.js'

function encodeWAV(buf) {
  const ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate, len = buf.length
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2))
  const str = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)) }
  str(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ')
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true)
  data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true)
  str(36, 'data'); data.setUint32(40, len * ch * 2, true)
  const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c))
  let o = 44
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
    const s = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2
  }
  return new Blob([data.buffer], { type: 'audio/wav' })
}

export default {
  title: '相册视频导入',
  render(root) {
    let file = null, audio = null
    root.innerHTML = `<div class="card" id="box">${uploadBox('从相册导入视频', '🎬')}</div>
      <div class="card"><div class="card-title">选择操作</div>
        <div class="vi-list">
          <div class="vi" data-a="frame"><span class="vi-ic" style="background:#8B0000">帧</span><div class="vi-t"><b>视频取图</b><small>截取当前帧 / 批量均匀抽帧</small></div><span class="vi-arrow">›</span></div>
          <div class="vi" data-a="audio"><span class="vi-ic" style="background:#7048e8">音</span><div class="vi-t"><b>提取音频</b><small>分离视频原声，导出无损 WAV</small></div><span class="vi-arrow">›</span></div>
          <div class="vi" data-a="text"><span class="vi-ic" style="background:#e8590c">文</span><div class="vi-t"><b>提取文案</b><small>语音转文字</small></div><span class="vi-arrow">›</span></div>
        </div></div>
      <div id="out"></div>${cleanTip('所有处理数据 24 小时后系统自动清除')}
      <div class="footer"><button class="btn" id="pick">导入视频</button></div>`
    const $ = s => root.querySelector(s)
    const choose = async () => {
      const [f] = await pickFiles({ accept: 'video/*' }); if (!f) return
      file = f; audio = null; $('#out').innerHTML = ''
      $('#box').innerHTML = `<video class="player" src="${URL.createObjectURL(f)}" controls playsinline></video>
        <div class="row"><span class="label">${esc(f.name || '视频')}</span><span class="val">${fmtSize(f.size)}</span></div>`
      $('#pick').textContent = '更换视频'
    }
    const acts = {
      frame() { shared.video = file; go('/frame') },
      async audio() {
        if (file.size > 400 * 1048576) return toast('视频超过 400MB，请先裁剪')
        loading('提取音频中'); await paint()
        try {
          const AC = window.AudioContext || window.webkitAudioContext
          const ac = new AC()
          const buf = await ac.decodeAudioData(await file.arrayBuffer())
          ac.close && ac.close()
          audio = result(encodeWAV(buf), 'audio', 'wav')
          hideLoading()
          $('#out').innerHTML = `<div class="card"><div class="card-title">音频 · ${buf.duration.toFixed(1)} 秒 · ${fmtSize(audio.size)}</div>
            <audio controls src="${audio.url}" style="width:100%"></audio><button class="btn" id="saveA">保存音频</button></div>`
          $('#saveA').onclick = () => saveResults([audio])
          $('#out').scrollIntoView({ behavior: 'smooth' })
        } catch (e) { fail(new Error('该视频没有音轨，或格式不支持')) }
      },
      text() {
        if (!config.API_BASE) return modal({ title: '提取文案', content: '语音识别需接入服务端（js/config.js 的 API_BASE）。可先「提取音频」导出 WAV，再用任意转写工具识别。', cancel: false })
        toast('请在 js/config.js 对接接口')
      }
    }
    root.querySelectorAll('[data-a]').forEach(n => { n.onclick = () => (file ? acts[n.dataset.a]() : choose()) })
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
  }
}
