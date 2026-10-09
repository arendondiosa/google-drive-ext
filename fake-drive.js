// Drive en memoria para los tests (extensión y complemento). Pagina de a 1 para ejercitar nextPageToken.
export const FOLDER = 'application/vnd.google-apps.folder';
export const SHORTCUT = 'application/vnd.google-apps.shortcut';

export const tree = () => ({
  dest: { id: 'dest', name: 'Dest', mimeType: FOLDER },
  src: { id: 'src', name: 'Src', mimeType: FOLDER, parents: ['top'] },
  top: { id: 'top', name: 'Top', mimeType: FOLDER },
  a: { id: 'a', name: 'a.txt', mimeType: 'text/plain', parents: ['src'] },
  sub: { id: 'sub', name: 'Sub', mimeType: FOLDER, parents: ['src'] },
  b: { id: 'b', name: 'b.txt', mimeType: 'text/plain', parents: ['sub'] },
  sc: { id: 'sc', name: 'atajo', mimeType: SHORTCUT, parents: ['sub'], shortcutDetails: { targetId: 'a' } },
  locked: { id: 'locked', name: 'no.pdf', mimeType: 'application/pdf', parents: ['sub'], capabilities: { canCopy: false } },
});

/** route(url, method, body) => [status, json]. `state.copyError` hace fallar files.copy con ese reason. */
export function fakeRoutes(files, perms = {}) {
  const state = { files, added: {}, copyError: null, n: 0 };
  const create = (data) => {
    const id = `new${++state.n}`;
    files[id] = { id, ...data };
    return [200, { id }];
  };
  const route = (url, method, body) => {
    const u = new URL(url);
    const path = u.pathname.replace('/drive/v3/', '');
    let m;
    if (path === 'about') return [200, { user: { permissionId: 'me' } }];
    if (path === 'files' && method === 'GET') {
      const parent = u.searchParams.get('q').match(/'(.+?)' in parents/)[1];
      const kids = Object.values(files).filter((f) => f.parents?.[0] === parent);
      const i = Number(u.searchParams.get('pageToken') ?? 0);
      return [200, { files: kids.slice(i, i + 1), nextPageToken: i + 1 < kids.length ? String(i + 1) : undefined }];
    }
    if (path === 'files') return create(body);
    if ((m = path.match(/^files\/([^/]+)\/copy$/)))
      return state.copyError
        ? [403, { error: { message: state.copyError, errors: [{ reason: state.copyError }] } }]
        : create({ ...body, copiedFrom: m[1] });
    if ((m = path.match(/^files\/([^/]+)\/permissions$/))) {
      if (method === 'GET') return [200, { permissions: perms[m[1]] ?? [] }];
      (state.added[m[1]] ??= []).push(body);
      return [200, {}];
    }
    if ((m = path.match(/^files\/([^/]+)$/)) && files[m[1]]) return [200, files[m[1]]];
    return [404, { error: { message: 'not found' } }];
  };
  return { state, route };
}

/** Nombres (ordenados) de lo creado bajo `parentId`, recursivo, como rutas. */
export function created(files, parentId, prefix = '') {
  return Object.values(files)
    .filter((f) => f.id.startsWith('new') && f.parents?.[0] === parentId)
    .flatMap((f) => [prefix + f.name, ...created(files, f.id, `${prefix}${f.name}/`)])
    .sort();
}
