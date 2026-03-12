const DEFAULT_CONFIG = {
  backendUrl: 'http://localhost:5001/api/youtube/analyze-content',
  strict_mode: false,
  warning_limit: 4,
  allow_list_channels: [],
  blocked_topics: [],
  custom_block_keywords: [],
  emergency_alert_to: '',
  user_id: '',
};

const WARNING_STORE_KEY = 'mindhealixRiskWarnings';

function parseCsv(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function bindValues(cfg) {
  document.getElementById('backendUrl').value = cfg.backendUrl || DEFAULT_CONFIG.backendUrl;
  document.getElementById('strictMode').checked = Boolean(cfg.strict_mode);
  document.getElementById('warningLimit').value = Number(cfg.warning_limit || DEFAULT_CONFIG.warning_limit);
  document.getElementById('allowList').value = (cfg.allow_list_channels || []).join(', ');
  document.getElementById('blockedTopics').value = (cfg.blocked_topics || []).join(', ');
  document.getElementById('customKeywords').value = (cfg.custom_block_keywords || []).join(', ');
  document.getElementById('emergencyAlertTo').value = cfg.emergency_alert_to || '';
  document.getElementById('userId').value = cfg.user_id || '';
}

function readValues() {
  const rawLimit = Number(document.getElementById('warningLimit').value);
  const warningLimit = Number.isFinite(rawLimit) ? Math.max(4, Math.min(10, Math.floor(rawLimit))) : DEFAULT_CONFIG.warning_limit;

  return {
    backendUrl: document.getElementById('backendUrl').value.trim() || DEFAULT_CONFIG.backendUrl,
    strict_mode: document.getElementById('strictMode').checked,
    warning_limit: warningLimit,
    allow_list_channels: parseCsv(document.getElementById('allowList').value),
    blocked_topics: parseCsv(document.getElementById('blockedTopics').value),
    custom_block_keywords: parseCsv(document.getElementById('customKeywords').value),
    emergency_alert_to: document.getElementById('emergencyAlertTo').value.trim(),
    user_id: document.getElementById('userId').value.trim(),
  };
}

function setStatus(text) {
  const el = document.getElementById('status');
  el.textContent = text;
}

function init() {
  chrome.storage.sync.get(['mindhealixConfig'], (result) => {
    const cfg = { ...DEFAULT_CONFIG, ...(result.mindhealixConfig || {}) };
    bindValues(cfg);
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const payload = readValues();
    chrome.storage.sync.set({ mindhealixConfig: payload }, () => {
      setStatus('Settings saved.');
      setTimeout(() => setStatus(''), 1800);
    });
  });

  document.getElementById('resetWarningsBtn').addEventListener('click', () => {
    chrome.storage.local.remove([WARNING_STORE_KEY], () => {
      setStatus('All warning counts reset.');
      setTimeout(() => setStatus(''), 1800);
    });
  });
}

init();
