import { createDrive, FOLDER, parseId } from './drive.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
};

const t = (key, subs) => chrome.i18n.getMessage(key, subs);
// Traduce los nodos marcados con data-i18n (texto) y data-i18n-<atributo>.
function localize(root) {
  for (const n of root.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
  for (const attr of ['placeholder', 'aria-label'])
    for (const n of root.querySelectorAll(`[data-i18n-${attr}]`)) n.setAttribute(attr, t(n.getAttribute(`data-i18n-${attr}`)));
}
document.documentElement.lang = chrome.i18n.getUILanguage();
localize(document);

const drive = createDrive({
  t,
  getToken: async (stale) => {
    if (stale) await chrome.identity.removeCachedAuthToken({ token: stale });
    return (await chrome.identity.getAuthToken({ interactive: true })).token;
  },
});

const HOME = [{ id: 'root', name: t('myDrive') }];
let sources = [];
let path = [...HOME]; // migas de pan; el destino es la última. Vacío = inicio (Mi unidad + unidades compartidas).
let busy = false;
let canceller = null; // AbortController de la copia en curso

const status = (msg) => ($('status').textContent = msg);
const refreshGo = () => ($('go').disabled = busy || !sources.length || !path.length);
// Envuelve los handlers para que cualquier error termine visible en el panel.
const guard = (fn) => (...args) => Promise.resolve(fn(...args)).catch((e) => status(t('error', [e.message])));

// ---- Origen ----

async function setSources(ids) {
  sources = await Promise.all([...new Set(ids)].map(drive.getSource));
  $('sources').replaceChildren(
    ...sources.map((f) => el('li', {}, `${f.mimeType === FOLDER ? '📁' : '📄'} ${f.name}`)),
  );
  $('name').disabled = sources.length !== 1;
  $('name').value = sources.length === 1 ? sources[0].name : '';
  $('name').placeholder = sources.length > 1 ? t('keepOriginalNames') : '';
  status('');
  refreshGo();
}

$('useSelection').onclick = guard(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith('https://drive.google.com/'))
    return status(t('openDriveTab'));
  // ponytail: depende del DOM de Drive (filas con data-id y aria-selected); si cambia, queda el link pegado.
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // La marca de selección y el data-id pueden estar en nodos distintos (fila/celda), así que se busca hacia arriba y hacia abajo.
      const ids = [];
      const main = document.querySelector('[role="main"]') ?? document;
      for (const n of main.querySelectorAll('[aria-selected="true"], [aria-checked="true"]')) {
        const id = (n.closest('[data-id]') ?? n.querySelector('[data-id]'))?.dataset.id;
        if (/^[\w-]{15,}$/.test(id ?? '')) ids.push(id);
      }
      return ids;
    },
  });
  const ids = result?.length ? result : [parseId(tab.url)].filter(Boolean);
  if (!ids.length) return status(t('nothingSelectedInDrive'));
  await setSources(ids);
});

$('sourceLink').onchange = guard(async (e) => {
  const id = parseId(e.target.value);
  if (!id) return status(t('notDriveLink'));
  await setSources([id]);
});

// ---- Destino ----

async function renderDest() {
  refreshGo();
  const crumb = (label, depth) =>
    el('button', { type: 'button', onclick: guard(() => ((path.length = depth), renderDest())) }, label);
  $('crumbs').replaceChildren(
    ...[crumb(t('home'), 0), ...path.map((p, i) => crumb(p.name, i + 1))].flatMap((b, i) => (i ? [' › ', b] : [b])),
  );
  $('destList').replaceChildren(el('li', { className: 'muted' }, t('loading')));
  const here = path.at(-1)?.id;
  const folders = path.length ? await drive.children(here, true) : [...HOME, ...(await drive.drives())];
  if (path.at(-1)?.id !== here) return; // navegaron mientras cargaba
  $('destList').replaceChildren(
    ...folders.map((f) =>
      el('li', {}, el('button', { type: 'button', onclick: guard(() => (path.push(f), renderDest())) }, `📁 ${f.name}`)),
    ),
  );
  if (!folders.length) $('destList').append(el('li', { className: 'muted' }, t('noSubfolders')));
}

$('destLink').onchange = guard(async (e) => {
  const id = parseId(e.target.value);
  if (!id) return status(t('notDriveLink'));
  const f = await drive.getFile(id);
  if (f.mimeType !== FOLDER) return status(t('destMustBeFolder'));
  path = [f];
  status('');
  await renderDest();
});

// ---- Permisos ----

const addPermRow = () => {
  const row = $('permRow').content.firstElementChild.cloneNode(true);
  localize(row);
  row.querySelector('button').onclick = () => row.remove();
  $('permRows').append(row);
};
$('addPerm').onclick = addPermRow;
addPermRow();
for (const radio of document.forms.form.perms)
  radio.onchange = () => ($('newPerms').hidden = document.forms.form.perms.value !== 'new');

function readPerms() {
  const mode = document.forms.form.perms.value;
  if (mode !== 'new') return { mode };
  const list = [...$('permRows').children]
    .map((row) => ({ email: row.querySelector('input').value.trim(), role: row.querySelector('select').value }))
    .filter((p) => p.email);
  return { mode, list, notify: $('notify').checked };
}

// ---- Clonar ----

function renderReport(reports) {
  const section = (title, items) =>
    items.length ? [el('details', {}, el('summary', {}, `${title} (${items.length})`), el('ul', {}, ...items.map((t) => el('li', {}, t))))] : [];
  const all = (key) => reports.flatMap((r) => r[key]);
  $('report').replaceChildren(
    el('ul', {}, ...reports.filter((r) => r.root?.webViewLink).map((r) =>
      el(
        'li',
        {},
        el('a', { href: r.root.webViewLink, target: '_blank', rel: 'noopener' }, t('openCopy')),
        r.shared ? ` — ${r.shared.length ? t('accessShared', [r.shared.join(', ')]) : t('accessOnlyYou')}` : '',
      ),
    )),
    ...section(t('errors'), all('errors')),
    ...section(t('skipped'), all('skipped')),
    ...section(t('permWarnings'), all('warnings')),
  );
}

$('form').onsubmit = async (e) => {
  e.preventDefault();
  const destId = path.at(-1).id;
  const perms = readPerms();
  const single = sources.length === 1;
  busy = true;
  canceller = new AbortController();
  $('cancel').hidden = $('cancel').disabled = false;
  refreshGo();
  $('progress').removeAttribute('value');
  $('progress').hidden = false;
  $('report').replaceChildren();
  const reports = [];
  let before = 0;
  try {
    for (const src of sources) {
      const report = await drive.clone({
        sourceId: src.id,
        destId,
        name: single ? $('name').value.trim() : src.name,
        perms,
        resume: $('resume').checked,
        signal: canceller.signal,
        onProgress: ({ scanning, seen, total, current }) => {
          if (canceller.signal.aborted) return; // se queda el aviso «Cancelando…»
          if (scanning) return status(t('counting', [String(total)]));
          $('progress').max = total;
          $('progress').value = seen;
          status(t('progressOf', [String(seen), String(total)]) + (current ? ` · ${current}` : ''));
        },
      });
      before += report.done;
      $('progress').removeAttribute('value'); // vuelve a indeterminada mientras cuenta el siguiente
      reports.push(report);
      if (report.aborted || report.cancelled) break;
    }
    const sum = (f) => reports.reduce((n, r) => n + f(r), 0);
    const problems = sum((r) => r.errors.length + r.skipped.length);
    const existing = sum((r) => r.existing);
    const aborted = reports.at(-1)?.aborted;
    if (reports.at(-1)?.cancelled) return status(t('cancelledDone', [String(before)]));
    status(
      (problems ? t('doneProblems', [String(before), String(problems)]) : t('done', [String(before)])) +
        (existing ? ` ${t('alreadyThere', [String(existing)])}` : '') +
        (aborted ? ` ${t('aborted', [aborted])}` : ''),
    );
  } catch (err) {
    status(t('error', [err.message]));
  } finally {
    renderReport(reports);
    busy = false;
    $('cancel').hidden = true;
    $('progress').hidden = true;
    refreshGo();
  }
};

$('cancel').onclick = () => {
  canceller.abort();
  $('cancel').disabled = true;
  status(t('cancelling'));
};

guard(renderDest)();
