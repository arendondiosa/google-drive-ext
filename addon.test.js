import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { created, fakeRoutes, tree } from './fake-drive.js';

// Carga addon/Code.js con los servicios de Apps Script simulados. Cada llamada a Drive "tarda" 1 s de un
// reloj falso, para poder agotar el tiempo de un tramo a mitad de la copia.
function load(perms = {}) {
  const { state, route } = fakeRoutes(tree(), perms);
  let clock = 0;
  const props = {};
  const triggers = [];
  const ctx = vm.createContext({
    Date: { now: () => clock },
    UrlFetchApp: {
      fetch(url, { method, payload }) {
        clock += 1000;
        const [status, data] = route(url, method.toUpperCase(), payload && JSON.parse(payload));
        return { getResponseCode: () => status, getContentText: () => JSON.stringify(data) };
      },
    },
    ScriptApp: {
      getOAuthToken: () => 'tok',
      getProjectTriggers: () => triggers,
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1),
      newTrigger: (fn) => ({ timeBased: () => ({ after: () => ({ create: () => triggers.push({ getHandlerFunction: () => fn }) }) }) }),
    },
    Utilities: { sleep: () => {} },
    LockService: { getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: {
      getUserProperties: () => ({
        getProperty: (k) => props[k] ?? null,
        setProperty: (k, v) => void (props[k] = v),
        deleteProperty: (k) => void delete props[k],
      }),
    },
  });
  vm.runInContext(readFileSync('addon/Code.js', 'utf8'), ctx);
  return { ctx, state, props, triggers };
}

const job = (extra = {}) => ({
  sources: ['src'],
  destId: 'dest',
  name: 'Copia',
  perms: { mode: 'inherit', list: [], notify: false },
  resume: false,
  locale: 'es',
  roots: {},
  done: 0,
  total: 0,
  seen: 0,
  counted: false,
  status: 'running',
  errors: [],
  skipped: [],
  warnings: [],
  ...extra,
});

const FULL = ['Copia', 'Copia/Sub', 'Copia/Sub/atajo', 'Copia/Sub/b.txt', 'Copia/a.txt'];

test('complemento: clona todo en un tramo si el tiempo alcanza', () => {
  const { ctx, state } = load();
  ctx.saveJob(job());
  const j = ctx.runSlice(job(), 1e9);
  assert.equal(j.status, 'done');
  assert.equal(j.done, 5);
  assert.deepEqual(created(state.files, 'dest'), FULL);
  assert.deepEqual([...j.skipped], ['Copia/Sub/no.pdf: no permite copias']);
  assert.equal(state.files[j.roots.src.id].name, 'Copia');
});

test('complemento: por tramos cortos llega a lo mismo, sin duplicar nada y con el avance x/y exacto', () => {
  const { ctx, state, triggers } = load();
  ctx.saveJob(job());
  let j;
  const seen = [];
  do {
    j = ctx.advance(6000); // ~6 llamadas a Drive por tramo
    if (j.counted) seen.push(j.seen);
    if (j.status === 'running') {
      assert.equal(triggers.length, 1); // mientras falta trabajo queda programado el siguiente tramo
      assert.equal(ctx.backgroundAlive(j), false); // pero no se da por activo hasta que un activador corra
    }
    assert.ok(seen.length < 50, 'no termina');
  } while (j.status === 'running');
  assert.ok(seen.length > 2, 'debía necesitar varios tramos');
  assert.equal(j.status, 'done');
  assert.equal(j.done, 5);
  assert.equal(j.total, 6); // 5 copiables + 1 que no permite copia
  assert.equal(j.seen, 6);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b)); // el avance nunca retrocede
  assert.deepEqual(created(state.files, 'dest'), FULL);
  assert.equal(triggers.length, 0); // al terminar no queda activador pendiente
});

test('complemento: el segundo plano solo cuenta como activo cuando un activador corrió de verdad', () => {
  const { ctx } = load();
  ctx.saveJob(job());
  ctx.runJob();
  assert.equal(ctx.backgroundAlive(ctx.loadJob()), true);
});

test('complemento: conservar permisos no los repite entre tramos', () => {
  const owner = { id: 'own', type: 'user', role: 'owner', emailAddress: 'own@x.com' };
  const bob = { id: 'bob', type: 'user', role: 'commenter', emailAddress: 'bob@x.com' };
  const { ctx, state } = load({ src: [owner], a: [owner], sub: [owner, bob], b: [owner, bob] });
  ctx.saveJob(job({ perms: { mode: 'keep', list: [], notify: false } }));
  let j;
  let slices = 0;
  do {
    j = ctx.advance(6000);
    assert.ok(++slices < 50, 'no termina');
  } while (j.status === 'running');
  const emails = Object.values(state.added).flat().map((p) => p.emailAddress).sort();
  assert.deepEqual(emails, ['bob@x.com', 'own@x.com']);
});

test('complemento: sin cuota se detiene y Continuar retoma', () => {
  const { ctx, state } = load();
  state.copyError = 'storageQuotaExceeded';
  ctx.saveJob(job());
  let j = ctx.advance(1e9);
  assert.equal(j.status, 'aborted');
  assert.equal(j.message, 'storageQuotaExceeded');
  state.copyError = null;
  j = ctx.advance(1e9);
  assert.equal(j.status, 'done');
  assert.equal(j.seen, 6); // el ítem que falló no se cuenta dos veces
  assert.deepEqual(created(state.files, 'dest'), FULL);
});

test('complemento: cancelar a mitad de un tramo lo corta y no revive el trabajo', () => {
  const { ctx, state, props } = load();
  ctx.saveJob(job({ id: 'x' }));
  const { fetch } = ctx.UrlFetchApp;
  let calls = 0;
  ctx.UrlFetchApp.fetch = (...args) => {
    if (++calls === 2) delete props.job; // el usuario pulsa Cancelar mientras el tramo corre
    return fetch(...args);
  };
  assert.equal(ctx.advance(1e9), null);
  assert.equal(props.job, undefined);
  assert.deepEqual(created(state.files, 'dest'), ['Copia']); // se corta en el siguiente guardado de avance
});

test('complemento: los dos idiomas tienen las mismas claves', () => {
  const { ctx } = load();
  const { es, en } = vm.runInContext('MESSAGES', ctx);
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  const src = readFileSync('addon/Code.js', 'utf8');
  for (const [, key] of src.matchAll(/\bT\('(\w+)'/g)) assert.ok(es[key], `falta el texto ${key}`);
});
