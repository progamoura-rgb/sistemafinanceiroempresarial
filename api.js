// api.js
export const GAS_WEB_APP = 'https://script.google.com/macros/s/AKfycbwrdsRtwjVrJp0rC3oRwVkawlIewVH2kROFLfankPy837RWPLG3evAHSjFPhxD8UThi/exec';

export async function loadDashboard({ ano, mes = 0, limit = 25 } = {}) {
  const url = new URL(GAS_WEB_APP);
  url.searchParams.set('ano', String(ano || new Date().getFullYear()));
  if (mes && Number(mes) > 0) url.searchParams.set('mes', String(mes));
  url.searchParams.set('limit', String(limit));

  // tenta fetch normal (CORS)
  try {
    const r = await fetch(url.toString(), { method: 'GET', mode: 'cors' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch {
    // fallback JSONP
    return jsonp(url);
  }
}

function jsonp(urlObj) {
  return new Promise((resolve, reject) => {
    const cb = `gas_cb_${Math.random().toString(36).slice(2)}`;
    urlObj.searchParams.set('callback', cb);
    const s = document.createElement('script');
    window[cb] = data => { try { resolve(data); } finally { cleanup(); } };
    s.onerror = () => { cleanup(); reject(new Error('JSONP failed')); };
    s.src = urlObj.toString();
    document.head.appendChild(s);
    function cleanup() { try { delete window[cb]; } catch{} try { s.remove(); } catch{} }
  });
}
