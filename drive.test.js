import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createDrive, parseId } from './drive.js';
import { created, fakeRoutes, tree } from './fake-drive.js';

function fake(files, perms = {}, failures = []) {
  const { state, route } = fakeRoutes(files, perms);
  state.tokens = [];
  const fetch = async (url, { method, headers, body }) => {
    state.tokens.push(headers.Authorization);
    const [status, data] = failures.length
      ? [failures.shift(), { error: { errors: [{ reason: 'x' }] } }]
      : route(url, method, body && JSON.parse(body));
    return { ok: status < 400, status, json: async () => data };
  };
  const drive = createDrive({ getToken: async (stale) => (stale ? 'fresh' : 'tok'), fetch, sleep: async () => {} });
  return { drive, state };
}

test('parseId', () => {
  assert.equal(parseId('https://drive.google.com/drive/u/0/folders/1AbC_def-123456789'), '1AbC_def-123456789');
  assert.equal(parseId('https://docs.google.com/document/d/1AbC_def-123456789/edit'), '1AbC_def-123456789');
  assert.equal(parseId('https://drive.google.com/open?id=1AbC_def-123456789'), '1AbC_def-123456789');
  assert.equal(parseId(' 1AbC_def-123456789 '), '1AbC_def-123456789');
  assert.equal(parseId('https://drive.google.com/drive/my-drive'), null);
  assert.equal(parseId(''), null);
});

test('clona carpetas de forma recursiva, con renombre, atajos y omitidos', async () => {
  const { drive, state } = fake(tree());
  const events = [];
  const report = await drive.clone({ sourceId: 'src', destId: 'dest', name: 'Copia', onProgress: (p) => events.push(p) });
  const f = state.files;
  const by = (name) => Object.values(f).find((x) => x.id.startsWith('new') && x.name === name);

  assert.equal(report.done, 5);
  assert.equal(report.root.id, by('Copia').id);
  assert.deepEqual(by('Copia').parents, ['dest']);
  assert.equal(by('a.txt').copiedFrom, 'a');
  assert.deepEqual(by('a.txt').parents, [by('Copia').id]);
  assert.deepEqual(by('b.txt').parents, [by('Sub').id]);
  assert.equal(by('atajo').shortcutDetails.targetId, 'a');
  assert.deepEqual(report.skipped, ['noCopyAllowed Copia/Sub/no.pdf']);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.shared, []);
  // Avance: primero cuenta los 6 ítems del origen y luego los recorre todos.
  assert.deepEqual(events.filter((p) => p.scanning).at(-1), { scanning: true, total: 6 });
  assert.deepEqual(events.at(-1), { seen: 6, total: 6, done: 5, current: '' });
  assert.equal(events.find((p) => p.seen === 2).current, 'Copia/a.txt');
});

test('si el origen es un acceso directo, clona su destino real', async () => {
  const { drive, state } = fake(tree());
  const report = await drive.clone({ sourceId: 'sc', destId: 'dest' });
  const copy = state.files[report.root.id];
  assert.equal(copy.copiedFrom, 'a');
  assert.equal(copy.name, 'a.txt');
  assert.equal(copy.mimeType, undefined);
});

test('retomar: omite lo que ya existe y solo copia lo que falta', async () => {
  const { drive, state } = fake(tree());
  const first = await drive.clone({ sourceId: 'src', destId: 'dest' });
  const all = created(state.files, 'dest');
  const lost = Object.values(state.files).find((f) => f.copiedFrom === 'b');
  delete state.files[lost.id];

  const again = await drive.clone({ sourceId: 'src', destId: 'dest', resume: true });
  assert.equal(again.done, 1);
  assert.equal(again.existing, 4);
  assert.equal(again.root.id, first.root.id);
  assert.deepEqual(created(state.files, 'dest'), all);
});

test('sin cuota: se detiene y lo reporta en vez de fallar archivo por archivo', async () => {
  const { drive, state } = fake(tree());
  state.copyError = 'storageQuotaExceeded';
  const report = await drive.clone({ sourceId: 'src', destId: 'dest' });
  assert.equal(report.aborted, 'storageQuotaExceeded');
  assert.equal(report.done, 1); // solo la carpeta raíz
  assert.deepEqual(report.errors, []);
  assert.ok(report.root);
});

test('cancelar: se detiene entre ítems y conserva lo ya copiado', async () => {
  const { drive, state } = fake(tree());
  const ctl = new AbortController();
  const report = await drive.clone({
    sourceId: 'src',
    destId: 'dest',
    signal: ctl.signal,
    onProgress: (p) => p.seen === 2 && ctl.abort(), // cancela mientras copia el segundo ítem
  });
  assert.equal(report.cancelled, true);
  assert.equal(report.done, 2);
  assert.deepEqual(created(state.files, 'dest'), ['Src', 'Src/a.txt']);
});

test('rechaza un destino dentro del origen', async () => {
  const { drive } = fake(tree());
  await assert.rejects(drive.clone({ sourceId: 'src', destId: 'sub' }), /destInsideSource/);
  await assert.rejects(drive.clone({ sourceId: 'src', destId: 'src' }), /destInsideSource/);
});

test('conservar permisos: todos en la raíz, solo los propios en descendientes', async () => {
  const owner = { id: 'own', type: 'user', role: 'owner', emailAddress: 'own@x.com' };
  const ana = { id: 'ana', type: 'user', role: 'reader', emailAddress: 'ana@x.com' };
  const me = { id: 'me', type: 'user', role: 'writer', emailAddress: 'me@x.com' };
  const bob = { id: 'bob', type: 'user', role: 'commenter', emailAddress: 'bob@x.com' };
  const perms = { src: [owner, ana, me], a: [owner, ana, me], sub: [owner, ana, me, bob], b: [owner, ana, me, bob] };
  const { drive, state } = fake(tree(), perms);
  await drive.clone({ sourceId: 'src', destId: 'dest', perms: { mode: 'keep' } });
  const id = (name) => Object.values(state.files).find((x) => x.id.startsWith('new') && x.name === name).id;

  assert.deepEqual(
    state.added[id('Src')].map((p) => [p.emailAddress, p.role]),
    [['own@x.com', 'writer'], ['ana@x.com', 'reader']],
  );
  assert.deepEqual(state.added[id('Sub')].map((p) => p.emailAddress), ['bob@x.com']);
  assert.equal(state.added[id('a.txt')], undefined);
  assert.equal(state.added[id('b.txt')], undefined);
});

test('permisos nuevos solo en la raíz', async () => {
  const { drive, state } = fake(tree());
  const report = await drive.clone({
    sourceId: 'src',
    destId: 'dest',
    perms: { mode: 'new', list: [{ email: 'z@x.com', role: 'writer' }], notify: false },
  });
  assert.deepEqual(state.added, { [report.root.id]: [{ role: 'writer', emailAddress: 'z@x.com', type: 'user' }] });
});

test('reintenta en 429/5xx y refresca el token en 401', async () => {
  const { drive, state } = fake(tree(), {}, [429, 503, 401]);
  assert.equal((await drive.getFile('a')).name, 'a.txt');
  assert.deepEqual(state.tokens, ['Bearer tok', 'Bearer tok', 'Bearer tok', 'Bearer fresh']);

  const bad = fake(tree(), {}, [403]);
  await assert.rejects(bad.drive.getFile('a'), { status: 403 });
});

test('los idiomas tienen las mismas claves y cubren las que usa el código', () => {
  const keys = (lang) => Object.keys(JSON.parse(readFileSync(`_locales/${lang}/messages.json`, 'utf8'))).sort();
  assert.deepEqual(keys('es'), keys('en'));
  const src = ['drive.js', 'sidepanel.js', 'sidepanel.html', 'manifest.json'].map((f) => readFileSync(f, 'utf8')).join('\n');
  const used = [...src.matchAll(/\bt\('(\w+)'|data-i18n[\w-]*="(\w+)"|__MSG_(\w+)__/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  assert.deepEqual([...new Set(used)].sort(), keys('en'));
});
