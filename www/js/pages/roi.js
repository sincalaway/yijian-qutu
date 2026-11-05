import { banner } from '../ui.js'

const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n }

export default {
  title: 'ROI计算',
  tab: true,
  render(root) {
    root.innerHTML = `${banner('ROI 计算器', '投放回报一算就清楚')}
      <div class="card">
        <div class="f"><span class="fl">投放花费（元）</span><input class="input" data-k="cost" inputmode="decimal" placeholder="如 1000"></div>
        <div class="f"><span class="fl">成交金额（元）</span><input class="input" data-k="revenue" inputmode="decimal" placeholder="如 3500"></div>
        <div class="f"><span class="fl">毛利率（%，选填）</span><input class="input" data-k="margin" inputmode="decimal" placeholder="如 40"></div>
        <div class="f"><span class="fl">成交单数（选填）</span><input class="input" data-k="orders" inputmode="numeric" placeholder="如 50"></div>
      </div>
      <div id="res"><div class="tip">填写花费和成交金额后自动计算</div></div>
      <div style="padding:0 12px"><button class="btn ghost" id="reset">清空重算</button></div>`
    const v = {}
    const out = root.querySelector('#res')
    const calc = () => {
      const cost = num(v.cost), revenue = num(v.revenue), margin = num(v.margin) / 100, orders = num(v.orders)
      if (!cost || !revenue) { out.innerHTML = '<div class="tip">填写花费和成交金额后自动计算</div>'; return }
      const roi = revenue / cost
      const ok = margin > 0 ? roi >= 1 / margin : roi >= 1
      out.innerHTML = `<div class="card">
        <div class="big"><span class="big-num ${ok ? 'up' : 'down'}">${roi.toFixed(2)}</span><span class="big-label">ROI（成交 ÷ 花费）</span></div>
        <div class="row"><span class="label">投资回报率</span><span class="val">${(((revenue - cost) / cost) * 100).toFixed(1)}%</span></div>
        <div class="row"><span class="label">保本 ROI</span><span class="val">${margin > 0 ? (1 / margin).toFixed(2) : '-'}</span></div>
        <div class="row"><span class="label">净利润（元）</span><span class="val">${margin > 0 ? (revenue * margin - cost).toFixed(2) : '-'}</span></div>
        <div class="row"><span class="label">单笔成交成本（元）</span><span class="val">${orders > 0 ? (cost / orders).toFixed(2) : '-'}</span></div>
        <div class="verdict ${ok ? 'up' : 'down'}">${ok ? '高于保本线，当前投放赚钱' : '低于保本线，当前投放亏损'}</div></div>`
    }
    root.querySelectorAll('input[data-k]').forEach(i => { i.oninput = () => { v[i.dataset.k] = i.value; calc() } })
    root.querySelector('#reset').onclick = () => { root.querySelectorAll('input[data-k]').forEach(i => { i.value = ''; v[i.dataset.k] = '' }); calc() }
  }
}
