(() => {
  'use strict';

  const API_URL = 'https://push2.eastmoney.com/api/qt/clist/get';
  const MARKET_FILTER = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
  const FIELDS = 'f2,f3,f4,f5,f6,f12,f14';
  const MIN_COMPLETE_ROWS = 1000;
  const REFRESH_INTERVAL = 3 * 60 * 1000;

  let lastSnapshot = null;
  let refreshing = false;

  const byId = (id) => document.getElementById(id);
  const numberValue = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  function buildUrl(page, pageSize) {
    const params = new URLSearchParams({
      pn: String(page),
      pz: String(pageSize),
      po: '1',
      np: '1',
      fltt: '2',
      invt: '2',
      fid: 'f12',
      fs: MARKET_FILTER,
      fields: FIELDS,
      _: String(Date.now())
    });
    return `${API_URL}?${params.toString()}`;
  }

  async function fetchPage(page, pageSize) {
    const response = await fetch(buildUrl(page, pageSize), {
      cache: 'no-store',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
    if (!response.ok) throw new Error(`行情接口 HTTP ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload?.data?.diff) ? payload.data.diff : [];
    const total = Number(payload?.data?.total || 0);
    return { rows, total };
  }

  async function fetchWholeMarket() {
    const bulk = await fetchPage(1, 6000);
    if (bulk.rows.length >= Math.min(Math.max(bulk.total, MIN_COMPLETE_ROWS), 6000) * 0.9) {
      return { rows: bulk.rows, reportedTotal: bulk.total };
    }

    const pageSize = 100;
    const totalPages = Math.max(1, Math.ceil(bulk.total / pageSize));
    const allRows = [];
    const batchSize = 6;

    for (let start = 1; start <= totalPages; start += batchSize) {
      const pages = [];
      for (let page = start; page < start + batchSize && page <= totalPages; page += 1) {
        pages.push(fetchPage(page, pageSize));
      }
      const results = await Promise.all(pages);
      results.forEach((result) => allRows.push(...result.rows));
    }

    return { rows: allRows, reportedTotal: bulk.total };
  }

  function normalizeRows(rows) {
    const unique = new Map();
    for (const row of rows) {
      const code = String(row?.f12 || '').trim();
      const change = numberValue(row?.f3);
      if (!code || change === null) continue;
      unique.set(code, row);
    }
    return [...unique.values()];
  }

  function formatTurnover(value) {
    if (!Number.isFinite(value) || value <= 0) return '--';
    const yi = value / 1e8;
    if (yi >= 10000) return `${(yi / 10000).toFixed(2)}万亿`;
    return `${Math.round(yi).toLocaleString('zh-CN')}亿`;
  }

  function sentimentMeta(score) {
    if (score >= 72) return { label: '强势', risk: '低风险', riskValue: 24 };
    if (score >= 58) return { label: '偏强', risk: '中低风险', riskValue: 40 };
    if (score >= 43) return { label: '均衡', risk: '中等风险', riskValue: 56 };
    if (score >= 28) return { label: '偏弱', risk: '较高风险', riskValue: 74 };
    return { label: '弱势', risk: '高风险', riskValue: 90 };
  }

  function renderSnapshot(snapshot) {
    const { rise, flat, fall, active, turnover, updatedAt } = snapshot;
    if (!active) throw new Error('没有可用的涨跌数据');

    const risePct = rise / active * 100;
    const flatPct = flat / active * 100;
    const fallPct = fall / active * 100;
    const score = Math.max(0, Math.min(100, Math.round((rise + flat * 0.5) / active * 100)));
    const meta = sentimentMeta(score);

    if (byId('riseCount')) byId('riseCount').textContent = rise.toLocaleString('zh-CN');
    if (byId('flatCount')) byId('flatCount').textContent = flat.toLocaleString('zh-CN');
    if (byId('fallCount')) byId('fallCount').textContent = fall.toLocaleString('zh-CN');
    if (byId('turnoverValue')) byId('turnoverValue').textContent = formatTurnover(turnover);
    if (byId('breadthRatio')) byId('breadthRatio').textContent = `${risePct.toFixed(1)}% / ${fallPct.toFixed(1)}%`;

    if (byId('breadthUpBar')) byId('breadthUpBar').style.width = `${risePct}%`;
    if (byId('breadthFlatBar')) byId('breadthFlatBar').style.width = `${flatPct}%`;
    if (byId('breadthDownBar')) byId('breadthDownBar').style.width = `${fallPct}%`;

    if (byId('sentimentScore')) byId('sentimentScore').textContent = String(score);
    if (byId('sentimentLabel')) byId('sentimentLabel').textContent = meta.label;
    if (byId('sentimentHint')) byId('sentimentHint').textContent = `基于 ${active.toLocaleString('zh-CN')} 只 A 股的全市场涨跌家数`;
    if (byId('gaugeRing')) {
      byId('gaugeRing').style.background = `conic-gradient(#5b8cff ${score * 3.6}deg, rgba(91,140,255,.12) 0deg)`;
    }

    if (byId('riskTrackFill')) byId('riskTrackFill').style.width = `${meta.riskValue}%`;
    if (byId('riskLabel')) byId('riskLabel').textContent = meta.risk;

    if (byId('dataTimestamp')) {
      const time = updatedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      byId('dataTimestamp').textContent = `全市场 ${active.toLocaleString('zh-CN')} 家 · ${time}`;
      byId('dataTimestamp').title = '上涨、平盘、下跌与成交额均按全部可用 A 股统计';
    }
    if (byId('dataFreshDot')) {
      byId('dataFreshDot').style.background = '#35d6a6';
      byId('dataFreshDot').style.boxShadow = '0 0 0 4px rgba(53,214,166,.12)';
    }
  }

  function showIncomplete(error) {
    console.warn('[A-Insight] 全市场宽度读取失败：', error);
    if (lastSnapshot) return;

    if (byId('breadthRatio')) byId('breadthRatio').textContent = '数据不完整';
    ['riseCount', 'flatCount', 'fallCount', 'turnoverValue'].forEach((id) => {
      if (byId(id)) byId(id).textContent = '--';
    });
    ['breadthUpBar', 'breadthFlatBar', 'breadthDownBar'].forEach((id) => {
      if (byId(id)) byId(id).style.width = '0%';
    });
    if (byId('sentimentHint')) byId('sentimentHint').textContent = '行情接口未返回足够样本，已停止展示误导性比例';
    if (byId('dataTimestamp')) byId('dataTimestamp').textContent = '全市场数据暂不可用';
    if (byId('dataFreshDot')) {
      byId('dataFreshDot').style.background = '#ffb84d';
      byId('dataFreshDot').style.boxShadow = '0 0 0 4px rgba(255,184,77,.12)';
    }
  }

  async function refreshWholeMarket() {
    if (refreshing) return;
    refreshing = true;
    try {
      const result = await fetchWholeMarket();
      const rows = normalizeRows(result.rows);
      if (rows.length < MIN_COMPLETE_ROWS) {
        throw new Error(`只返回 ${rows.length} 条，低于完整市场最低样本 ${MIN_COMPLETE_ROWS}`);
      }

      let rise = 0;
      let flat = 0;
      let fall = 0;
      let turnover = 0;

      for (const row of rows) {
        const change = numberValue(row.f3);
        if (change > 0) rise += 1;
        else if (change < 0) fall += 1;
        else flat += 1;

        const amount = numberValue(row.f6);
        if (amount !== null && amount > 0) turnover += amount;
      }

      lastSnapshot = {
        rise,
        flat,
        fall,
        active: rise + flat + fall,
        turnover,
        updatedAt: new Date()
      };
      renderSnapshot(lastSnapshot);
    } catch (error) {
      showIncomplete(error);
    } finally {
      refreshing = false;
    }
  }

  function start() {
    window.AInsightRefreshWholeMarket = refreshWholeMarket;
    setTimeout(refreshWholeMarket, 700);
    setInterval(refreshWholeMarket, REFRESH_INTERVAL);

    const refreshButton = byId('refreshButton');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => setTimeout(refreshWholeMarket, 250), true);
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshWholeMarket();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
