// Botón en la barra lateral derecha de Drive (la de Calendar, Keep, Tasks) que abre el panel de la extensión.
const SVG = 'http://www.w3.org/2000/svg';
const rect = (x, y, fill) => {
  const r = document.createElementNS(SVG, 'rect');
  for (const [k, v] of Object.entries({ x, y, width: 12, height: 13, rx: 2.5, fill, stroke: '#1a73e8', 'stroke-width': 1.5 }))
    r.setAttribute(k, v);
  return r;
};
const svg = document.createElementNS(SVG, 'svg');
for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' })) svg.setAttribute(k, v);
svg.append(rect(3, 3, '#aecbfa'), rect(9, 8, '#fff'));

const btn = document.createElement('button');
btn.type = 'button';
btn.title = chrome.i18n.getMessage('extName');
btn.setAttribute('aria-label', btn.title);
btn.append(svg);
btn.onclick = () => chrome.runtime.sendMessage('open-panel');

const BASE =
  'all:unset;box-sizing:border-box;cursor:pointer;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;';
const DOCKED = BASE + 'margin:8px auto;';
const FLOATING =
  BASE + 'position:fixed;right:8px;bottom:80px;z-index:1000;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.4);';

// ponytail: el DOM de Drive está ofuscado, así que la barra se reconoce por su forma (tablist angosto y alto pegado
// al borde derecho) y no por clases. Si no aparece, el botón queda flotando abajo a la derecha.
const findRail = () =>
  [...document.querySelectorAll('[role="tablist"]')].find((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.width < 80 && r.height > r.width * 2 && r.right > innerWidth - 80;
  });

function place() {
  if (!chrome.runtime?.id) return clearInterval(timer), btn.remove(); // la extensión se recargó: este script quedó huérfano
  if (btn.isConnected && btn.parentElement !== document.body) return; // ya está en la barra
  const rail = findRail();
  if (rail) {
    btn.style.cssText = DOCKED;
    rail.append(btn);
  } else if (!btn.isConnected) {
    btn.style.cssText = FLOATING;
    document.body.append(btn);
  }
}

// ponytail: sondeo cada 2 s (Drive re-renderiza la barra); MutationObserver si esto llegara a notarse.
const timer = setInterval(place, 2000);
place();
