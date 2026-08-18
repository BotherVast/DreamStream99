const $ = (id) => document.getElementById(id);
const fields = {
  enabled: $('enabled'),
  serverUrl: $('serverUrl'),
  roomId: $('roomId'),
  nickname: $('nickname'),
  save: $('save'),
  status: $('status'),
};

const defaults = {
  enabled: false,
  serverUrl: 'http://localhost:3000',
  roomId: '',
  nickname: '',
};

async function load() {
  const config = { ...defaults, ...(await chrome.storage.local.get(defaults)) };
  fields.enabled.checked = config.enabled;
  fields.serverUrl.value = config.serverUrl;
  fields.roomId.value = config.roomId;
  fields.nickname.value = config.nickname;
  refreshStatus();
}

async function save() {
  const config = {
    enabled: fields.enabled.checked,
    serverUrl: fields.serverUrl.value.trim().replace(/\/$/, ''),
    roomId: fields.roomId.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),
    nickname: fields.nickname.value.trim().slice(0, 24),
  };
  if (config.enabled && (!config.serverUrl || config.roomId.length < 4 || !config.nickname)) {
    setStatus('请填写服务器、房间号和昵称', 'error');
    return;
  }
  await chrome.storage.local.set(config);
  await chrome.runtime.sendMessage({ type: 'watchTogether:reconnect' }).catch(() => {});
  setStatus('正在连接…');
  setTimeout(refreshStatus, 450);
}

async function refreshStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'watchTogether:getStatus' }).catch(() => null);
  if (!response) return setStatus('后台未响应', 'error');
  const labels = {
    off: '同步已关闭',
    connecting: '正在连接…',
    online: `已连接 · ${response.memberCount || 0} 人在线`,
    offline: '连接断开 · 重试中',
    error: '连接错误',
  };
  setStatus(labels[response.status] || response.status, response.status === 'online' ? 'online' : response.status === 'error' ? 'error' : '');
}

function setStatus(text, className = '') {
  fields.status.textContent = text;
  fields.status.className = `status ${className}`.trim();
}

fields.save.addEventListener('click', save);
fields.roomId.addEventListener('input', () => {
  fields.roomId.value = fields.roomId.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
});

load();
setInterval(refreshStatus, 1000);
