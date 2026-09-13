const bar = document.getElementById('errorBar');
let msgs = [];

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function render(){
  if(!bar) return;
  if(msgs.length === 0){ bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  bar.innerHTML = '<button class="close-err" onclick="window.__fz_clearErrors()">DISMISS</button>'
    + msgs.map(m => `<div><b>${m.tag}</b> ${escapeHtml(m.text)}</div>`).join('');
}

export function showError(tag, err){
  let text = '';
  if(err){
    if(err.stack) text = err.stack;
    else if(err.message) text = err.message + (err.filename ? ' @ ' + err.filename + ':' + err.lineno : '');
    else text = String(err);
  }
  msgs.push({ tag, text });
  if(msgs.length > 4) msgs.shift();
  render();
  console.error('[' + tag + ']', err);
}

export function initErrorOverlay(){
  window.addEventListener('error', e => {
    if(!e.message) return;
    showError('ERROR', { message: e.message, filename: (e.filename||'').split('/').pop(), lineno: e.lineno, stack: e.error && e.error.stack });
  });
  window.addEventListener('unhandledrejection', e => showError('PROMISE', e.reason));
  window.__fz_clearErrors = () => { msgs = []; render(); };
}