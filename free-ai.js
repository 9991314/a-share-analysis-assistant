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

  function dispatchValue(element, value) {
    if (!element) return;
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ensureModelOption(modelId, label = '免费模型') {
    const datalist = $('modelOptions');
    if (datalist && ![...datalist.options].some((option) => option.value === modelId)) {
      const option = document.createElement('option');
      option.value = modelId;
      option.label = label;
      datalist.prepend(option);
    }

    const directSelect = $('freeModelDirectSelect');
    if (directSelect && ![...directSelect.options].some((option) => option.value === modelId)) {
      const option = document.createElement('option');
      option.value = modelId;
      option.textContent = modelId === FREE_ROUTER_MODEL
        ? 'OpenRouter 免费自动路由（推荐）'
        : `${modelId}（免费）`;
      directSelect.appendChild(option);
    }
  }

  function applyOpenRouterPreset({ focusKey = false, notifyUser = true, modelId = FREE_ROUTER_MODEL } = {}) {
    const provider = $('providerType');
    const baseUrl = $('apiBaseUrl');
    const model = $('modelName');
    const mode = $('apiMode');
    const status = $('modelLoadStatus');
    if (!provider || !baseUrl || !model || !mode) return false;

    dispatchValue(provider, 'openai-compatible');
    dispatchValue(baseUrl, OPENROUTER_BASE);
    dispatchValue(mode, 'chat');
    dispatchValue(model, modelId);
    ensureModelOption(modelId, modelId === FREE_ROUTER_MODEL ? 'OpenRouter 免费模型自动路由' : 'OpenRouter 免费模型');

    const directSelect = $('freeModelDirectSelect');
    if (directSelect && [...directSelect.options].some((option) => option.value === modelId)) {
      directSelect.value = modelId;
    }

    if (status) status.value = `已选择免费模型：${modelId}`;
    if (focusKey) setTimeout(() => $('apiKey')?.focus(), 120);
    if (notifyUser) notify('已直接切换到免费模型，请填写 OpenRouter API Key 后保存', 'success');
    return true;
  }

  async function loadFreeModels(button) {
    const key = $('apiKey')?.value.trim() || '';
    const datalist = $('modelOptions');
    const status = $('modelLoadStatus');

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

      if (datalist) datalist.innerHTML = '';
      const directSelect = $('freeModelDirectSelect');
      if (directSelect) directSelect.innerHTML = '';

      uniqueIds.forEach((id, index) => {
        if (datalist) {
          const option = document.createElement('option');
          option.value = id;
          option.label = index === 0 ? '自动选择可用免费模型' : '免费模型';
          datalist.appendChild(option);
        }
        if (directSelect) {
          const option = document.createElement('option');
          option.value = id;
          option.textContent = index === 0
            ? 'OpenRouter 免费自动路由（推荐）'
            : `${id}（免费）`;
          directSelect.appendChild(option);
        }
      });

      applyOpenRouterPreset({ modelId: FREE_ROUTER_MODEL, notifyUser: false });
      if (status) status.value = `已读取 ${uniqueIds.length} 个免费模型，可直接选择`;
      notify(`已读取 ${uniqueIds.length} 个免费模型，可直接选择`, 'success');
    } catch (error) {
      console.warn('[A-Insight] OpenRouter 免费模型读取失败：', error);
      ensureModelOption(FREE_ROUTER_MODEL, 'OpenRouter 免费模型自动路由');
      if (status) status.value = '读取失败，仍可直接使用 openrouter/free';
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
      .free-ai-direct{margin:14px 0 12px;padding:15px;border:1px solid rgba(53,214,166,.28);border-radius:15px;background:linear-gradient(135deg,rgba(53,214,166,.11),rgba(91,140,255,.08));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
      .free-ai-direct-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.free-ai-direct-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:750}.free-ai-live{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:rgba(53,214,166,.12);color:#48ddb7;font-size:10px;font-weight:750}.free-ai-live:before{content:"";width:6px;height:6px;border-radius:50%;background:#35d6a6;box-shadow:0 0 9px rgba(53,214,166,.85)}
      .free-ai-direct-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.free-ai-direct select{width:100%;min-height:42px;padding:0 12px;border:1px solid var(--border,#263b5a);border-radius:10px;background:var(--input-bg,rgba(7,17,31,.66));color:var(--text-primary,#f4f7fb);font-size:12px;outline:none}.free-ai-direct select:focus{border-color:#5b8cff;box-shadow:0 0 0 3px rgba(91,140,255,.12)}
      .free-ai-use{min-height:42px;padding:0 16px;border:1px solid rgba(53,214,166,.42);border-radius:10px;background:linear-gradient(135deg,#2ab98f,#4b7ef1);color:#fff;font-size:12px;font-weight:750;cursor:pointer;white-space:nowrap}.free-ai-use:hover{transform:translateY(-1px);filter:brightness(1.05)}
      .free-ai-direct-note{margin-top:9px;color:var(--text-muted,#7087a3);font-size:11px;line-height:1.6}.free-ai-direct-note b{color:#ffbf59}
      .free-ai-card{position:relative;overflow:hidden;margin:0 0 18px;padding:16px;border:1px solid rgba(93,140,255,.24);border-radius:16px;background:linear-gradient(135deg,rgba(72,104,255,.11),rgba(39,211,165,.055));box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
      .free-ai-card:after{content:"";position:absolute;right:-45px;top:-55px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(91,140,255,.18),transparent 66%);pointer-events:none}
      .free-ai-head{display:flex;align-items:flex-start;gap:11px;position:relative;z-index:1}.free-ai-icon{display:grid;place-items:center;flex:0 0 36px;height:36px;border-radius:11px;background:rgba(91,140,255,.16);border:1px solid rgba(91,140,255,.25);font-size:18px}.free-ai-copy{min-width:0;flex:1}.free-ai-copy strong{display:block;font-size:14px;line-height:1.45}.free-ai-copy p{margin:5px 0 0;color:var(--text-secondary,#8ea5bf);font-size:12px;line-height:1.65}.free-ai-badge{display:inline-flex;align-items:center;gap:5px;margin-left:7px;padding:2px 7px;border-radius:999px;background:rgba(53,214,166,.12);color:#4addb4;font-size:10px;font-weight:700;vertical-align:1px}.free-ai-badge:before{content:"";width:5px;height:5px;border-radius:50%;background:#35d6a6;box-shadow:0 0 8px rgba(53,214,166,.8)}
      .free-ai-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px;position:relative;z-index:1}.free-ai-actions button,.free-ai-actions a{min-height:38px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:12px;font-weight:650;text-decoration:none;cursor:pointer}.free-ai-primary{border:1px solid rgba(91,140,255,.5);background:linear-gradient(135deg,#527ff5,#6b5df6);color:#fff;box-shadow:0 8px 22px rgba(76,100,239,.2)}.free-ai-secondary{border:1px solid var(--border,#263b5a);background:rgba(255,255,255,.035);color:var(--text-primary,#f4f7fb)}.free-ai-primary:hover,.free-ai-secondary:hover{transform:translateY(-1px);filter:brightness(1.06)}
      .free-ai-note{display:flex;gap:7px;margin-top:10px;color:var(--text-muted,#7087a3);font-size:11px;line-height:1.55;position:relative;z-index:1}.free-ai-note b{color:#ffbd55;font-weight:700}
      @media(max-width:520px){.free-ai-direct-row,.free-ai-actions{grid-template-columns:1fr}.free-ai-card,.free-ai-direct{padding:14px}.free-ai-use{width:100%}}
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

    const direct = document.createElement('div');
    direct.className = 'free-ai-direct';
    direct.id = 'freeAiDirectPanel';
    direct.innerHTML = `
      <div class="free-ai-direct-head">
        <div class="free-ai-direct-title">免费模型 <span class="free-ai-live">直接可选</span></div>
      </div>
      <div class="free-ai-direct-row">
        <select id="freeModelDirectSelect" aria-label="免费模型选择">
          <option value="${FREE_ROUTER_MODEL}">OpenRouter 免费自动路由（推荐）</option>
        </select>
        <button class="free-ai-use" id="useSelectedFreeModel" type="button">直接使用免费模型</button>
      </div>
      <div class="free-ai-direct-note"><b>免费模型本身不收费</b>，但仍需填写你自己的 OpenRouter 免费 API Key；不会把密钥写入 GitHub。</div>
    `;

    const card = document.createElement('div');
    card.className = 'free-ai-card';
    card.id = 'openrouterPresetCard';
    card.innerHTML = `
      <div class="free-ai-head">
        <div class="free-ai-icon">✦</div>
        <div class="free-ai-copy">
          <strong>免费 AI 接入 <span class="free-ai-badge">零模型费用</span></strong>
          <p>默认使用 OpenRouter 免费自动路由，也可以读取并固定选择带 :free 后缀的模型。</p>
        </div>
      </div>
      <div class="free-ai-actions">
        <button class="free-ai-primary" id="loadOpenRouterFreeModels" type="button">读取全部免费模型</button>
        <a class="free-ai-secondary" href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">获取免费 API Key ↗</a>
      </div>
      <div class="free-ai-note"><b>注意</b><span>免费模型可能限流、排队或临时不可用；正式服务建议再配置一个稳定的备用模型。</span></div>
    `;

    title.insertAdjacentElement('afterend', direct);
    direct.insertAdjacentElement('afterend', card);

    $('useSelectedFreeModel')?.addEventListener('click', () => {
      const modelId = $('freeModelDirectSelect')?.value || FREE_ROUTER_MODEL;
      applyOpenRouterPreset({ modelId, focusKey: true });
    });
    $('freeModelDirectSelect')?.addEventListener('change', (event) => {
      applyOpenRouterPreset({ modelId: event.currentTarget.value, focusKey: false, notifyUser: false });
    });
    $('loadOpenRouterFreeModels')?.addEventListener('click', (event) => loadFreeModels(event.currentTarget));

    ensureModelOption(FREE_ROUTER_MODEL, 'OpenRouter 免费模型自动路由');

    const currentModel = $('modelName')?.value.trim();
    const currentBase = $('apiBaseUrl')?.value.trim();
    if (!currentModel && !currentBase) {
      applyOpenRouterPreset({ notifyUser: false, focusKey: false });
    } else if (currentModel === FREE_ROUTER_MODEL || currentModel.endsWith(':free')) {
      ensureModelOption(currentModel, '当前免费模型');
      $('freeModelDirectSelect').value = currentModel;
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
