(() => {
  'use strict';

  const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
  const FREE_ROUTER_MODEL = 'openrouter/free';
  const $ = (id) => document.getElementById(id);

  function notify(message, tone = 'info') {
    const stack = $('toastStack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function applyOpenRouterPreset({ focusKey = true } = {}) {
    const provider = $('providerType');
    const baseUrl = $('apiBaseUrl');
    const model = $('modelName');
    const mode = $('apiMode');
    const status = $('modelLoadStatus');
    if (!provider || !baseUrl || !model || !mode) return false;

    provider.value = 'openai-compatible';
    provider.dispatchEvent(new Event('change', { bubbles: true }));
    baseUrl.value = OPENROUTER_BASE;
    baseUrl.dispatchEvent(new Event('input', { bubbles: true }));
    baseUrl.dispatchEvent(new Event('change', { bubbles: true }));
    mode.value = 'chat';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
    model.value = FREE_ROUTER_MODEL;
    model.dispatchEvent(new Event('input', { bubbles: true }));
    model.dispatchEvent(new Event('change', { bubbles: true }));

    const datalist = $('modelOptions');
    if (datalist && ![...datalist.options].some((option) => option.value === FREE_ROUTER_MODEL)) {
      const option = document.createElement('option');
      option.value = FREE_ROUTER_MODEL;
      option.label = 'OpenRouter 免费模型自动路由';
      datalist.prepend(option);
    }

    if (status) status.value = '免费路由已就绪，填写密钥后测试连接';
    if (focusKey) setTimeout(() => $('apiKey')?.focus(), 120);
    notify('已配置 OpenRouter 免费模型，请填写 API Key 后保存', 'success');
    return true;
  }

  async function loadFreeModels(button) {
    const key = $('apiKey')?.value.trim() || '';
    const datalist = $('modelOptions');
    const status = $('modelLoadStatus');
    if (!datalist) return;

    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = '读取中…';
    if (status) status.value = '正在读取 OpenRouter 免费模型';

    try {
      const headers = { Accept: 'application/json' };
      if (key) headers.Authorization = `Bearer ${key}`;
      const response = await fetch(`${OPENROUTER_BASE}/models`, {
        headers,
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const ids = (Array.isArray(payload?.data) ? payload.data : [])
        .map((item) => String(item?.id || '').trim())
        .filter((id) => id && (id.endsWith(':free') || id === FREE_ROUTER_MODEL));
      const uniqueIds = [...new Set([FREE_ROUTER_MODEL, ...ids])];

      datalist.innerHTML = '';
      uniqueIds.forEach((id, index) => {
        const option = document.createElement('option');
        option.value = id;
        option.label = index === 0 ? '自动选择可用免费模型' : '免费模型';
        datalist.appendChild(option);
      });

      $('modelName').value = FREE_ROUTER_MODEL;
      $('modelName').dispatchEvent(new Event('input', { bubbles: true }));
      if (status) status.value = `已读取 ${uniqueIds.length} 个免费模型选项`;
      notify(`已读取 ${uniqueIds.length} 个免费模型选项`, 'success');
    } catch (error) {
      console.warn('[A-Insight] OpenRouter 免费模型读取失败：', error);
      if (status) status.value = '读取失败，可继续使用 openrouter/free';
      notify(`免费模型列表读取失败：${error.message || error}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  function injectStyles() {
    if ($('openrouterPresetStyle')) return;
    const style = document.createElement('style');
    style.id = 'openrouterPresetStyle';
    style.textContent = `
      .free-ai-card{position:relative;overflow:hidden;margin:14px 0 18px;padding:16px;border:1px solid rgba(93,140,255,.26);border-radius:16px;background:linear-gradient(135deg,rgba(72,104,255,.13),rgba(39,211,165,.07));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
      .free-ai-card:after{content:"";position:absolute;right:-45px;top:-55px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(91,140,255,.18),transparent 66%);pointer-events:none}
      .free-ai-head{display:flex;align-items:flex-start;gap:11px;position:relative;z-index:1}.free-ai-icon{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:11px;background:rgba(91,140,255,.16);border:1px solid rgba(91,140,255,.25);font-size:18px}.free-ai-copy{min-width:0;flex:1}.free-ai-copy strong{display:block;font-size:14px;line-height:1.45}.free-ai-copy p{margin:5px 0 0;color:var(--text-secondary,#8ea5bf);font-size:12px;line-height:1.65}.free-ai-badge{display:inline-flex;align-items:center;gap:5px;margin-left:7px;padding:2px 7px;border-radius:999px;background:rgba(53,214,166,.12);color:#4addb4;font-size:10px;font-weight:700;vertical-align:1px}.free-ai-badge:before{content:"";width:5px;height:5px;border-radius:50%;background:#35d6a6;box-shadow:0 0 8px rgba(53,214,166,.8)}
      .free-ai-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px;position:relative;z-index:1}.free-ai-actions button,.free-ai-actions a{min-height:38px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:12px;font-weight:650;text-decoration:none;cursor:pointer}.free-ai-primary{border:1px solid rgba(91,140,255,.5);background:linear-gradient(135deg,#527ff5,#6b5df6);color:#fff;box-shadow:0 8px 22px rgba(76,100,239,.2)}.free-ai-secondary{border:1px solid var(--border,#263b5a);background:rgba(255,255,255,.035);color:var(--text-primary,#f4f7fb)}.free-ai-primary:hover,.free-ai-secondary:hover{transform:translateY(-1px);filter:brightness(1.06)}
      .free-ai-note{display:flex;gap:7px;margin-top:10px;color:var(--text-muted,#7087a3);font-size:11px;line-height:1.55;position:relative;z-index:1}.free-ai-note b{color:#ffbd55;font-weight:700}
      @media(max-width:520px){.free-ai-actions{grid-template-columns:1fr}.free-ai-card{padding:14px}}
    `;
    document.head.appendChild(style);
  }

  function mountCard() {
    const provider = $('providerType');
    if (!provider || $('openrouterPresetCard')) return false;
    injectStyles();

    const section = provider.closest('.settings-section');
    const title = section?.querySelector('.settings-title');
    if (!section || !title) return false;

    const card = document.createElement('div');
    card.className = 'free-ai-card';
    card.id = 'openrouterPresetCard';
    card.innerHTML = `
      <div class="free-ai-head">
        <div class="free-ai-icon">✦</div>
        <div class="free-ai-copy">
          <strong>免费 AI 快速接入 <span class="free-ai-badge">零模型费用</span></strong>
          <p>使用 OpenRouter 的免费模型路由，自动选择当前可用的免费模型，适合个人每日复盘与功能测试。</p>
        </div>
      </div>
      <div class="free-ai-actions">
        <button class="free-ai-primary" id="applyOpenRouterFree" type="button">一键配置免费 AI</button>
        <button class="free-ai-secondary" id="loadOpenRouterFreeModels" type="button">读取免费模型</button>
        <a class="free-ai-secondary" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">获取免费 API Key ↗</a>
        <a class="free-ai-secondary" href="https://openrouter.ai/openrouter/free" target="_blank" rel="noopener noreferrer">查看免费路由说明 ↗</a>
      </div>
      <div class="free-ai-note"><b>注意</b><span>免费模型可能限流、排队或临时不可用；企业正式服务建议配置付费主模型和备用模型。</span></div>
    `;

    title.insertAdjacentElement('afterend', card);
    $('applyOpenRouterFree')?.addEventListener('click', () => applyOpenRouterPreset());
    $('loadOpenRouterFreeModels')?.addEventListener('click', (event) => {
      applyOpenRouterPreset({ focusKey: false });
      loadFreeModels(event.currentTarget);
    });

    const datalist = $('modelOptions');
    if (datalist && ![...datalist.options].some((option) => option.value === FREE_ROUTER_MODEL)) {
      const option = document.createElement('option');
      option.value = FREE_ROUTER_MODEL;
      option.label = 'OpenRouter 免费模型自动路由';
      datalist.prepend(option);
    }
    return true;
  }

  function start() {
    if (mountCard()) return;
    const observer = new MutationObserver(() => {
      if (mountCard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
