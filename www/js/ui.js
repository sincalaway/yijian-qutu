// 通用 UI：弹窗、提示、加载、底部菜单、选文件
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export function el(html) {
  const t = document.createElement('template')
  t.innerHTML = html.trim()
  return t.content.firstElementChild
}

export const go = p => { location.hash = '#' + p }
export const wait = ms => new Promise(r => setTimeout(r, ms))
// 让浏览器先把加载提示画出来，再做重计算
export const paint = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)))

export function toast(msg, ms = 1800) {
  const t = el(`<div class="toast">${esc(msg)}</div>`)
  document.body.appendChild(t)
  requestAnimationFrame(() => t.classList.add('show'))
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, ms)
}

let loadEl = null
export function loading(msg) {
  if (!loadEl) {
    loadEl = el('<div class="loading"><div class="ld-box"><div class="spin"></div><div class="lt"></div></div></div>')
    document.body.appendChild(loadEl)
  }
  loadEl.querySelector('.lt').textContent = msg || '处理中'
  loadEl.style.display = 'flex'
}
export function hideLoading() { if (loadEl) loadEl.style.display = 'none' }

export function modal({ title = '', content = '', input = false, placeholder = '', confirmText = '确定', cancel = true } = {}) {
  return new Promise(res => {
    const m = el(`<div class="modal-mask"><div class="modal">
      ${title ? `<div class="m-title">${esc(title)}</div>` : ''}
      ${content ? `<div class="m-content">${esc(content)}</div>` : ''}
      ${input ? `<input class="input m-input" placeholder="${esc(placeholder)}">` : ''}
      <div class="m-btns">${cancel ? '<button class="m-cancel">取消</button>' : ''}<button class="m-ok">${esc(confirmText)}</button></div>
    </div></div>`)
    document.body.appendChild(m)
    const inp = m.querySelector('input')
    if (inp) setTimeout(() => inp.focus(), 60)
    const close = v => { m.remove(); res(v) }
    m.querySelector('.m-ok').onclick = () => close(input ? inp.value.trim() : true)
    const c = m.querySelector('.m-cancel')
    if (c) c.onclick = () => close(input ? '' : false)
  })
}

export function actionSheet(items) {
  return new Promise(res => {
    const m = el(`<div class="sheet-mask"><div class="sheet as">
      ${items.map((t, i) => `<div class="as-item" data-i="${i}">${esc(t)}</div>`).join('')}
      <div class="as-item as-cancel" data-i="-1">取消</div></div></div>`)
    document.body.appendChild(m)
    m.onclick = e => {
      const it = e.target.closest('.as-item')
      if (it || e.target === m) { m.remove(); res(it ? Number(it.dataset.i) : -1) }
    }
  })
}

// 自定义内容的底部弹层，返回 { root, close }
export function sheet(html) {
  const m = el(`<div class="sheet-mask"><div class="sheet">${html}</div></div>`)
  document.body.appendChild(m)
  const close = () => m.remove()
  m.addEventListener('click', e => { if (e.target === m) close() })
  return { root: m, close }
}

export function pickFiles({ accept = 'image/*', multiple = false } = {}) {
  return new Promise(res => {
    const i = document.createElement('input')
    i.type = 'file'
    i.accept = accept
    i.multiple = multiple
    i.style.display = 'none'
    document.body.appendChild(i)
    i.onchange = () => { const f = Array.from(i.files || []); i.remove(); res(f) }
    i.click()
  })
}

// 常用片段
export const cleanTip = (t = '所有图片处理数据 24 小时后系统自动清除') => `<div class="clean-tip">${t}</div>`
export const banner = (title = '实用图片处理工具', sub = '让图片成为你想要的样子') =>
  `<div class="banner"><div class="banner-title">${title}</div><div class="banner-sub"><span class="star">★</span>${sub}<span class="star">★</span></div></div>`
export const hero = (title, sub) => `<div class="hero"><div class="hero-title">${title}</div>${sub ? `<div class="hero-sub">${sub}</div>` : ''}</div>`
export const uploadBox = (text = '上传图片', icon = '📷', id = 'up') =>
  `<div class="upload" id="${id}"><span class="cam">${icon}</span><span class="up-text">${text}</span></div>`
export function fail(e) { hideLoading(); toast((e && (e.message || e)) || '处理失败') }
