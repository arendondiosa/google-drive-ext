const API = 'https://www.googleapis.com/drive/v3';
export const FOLDER = 'application/vnd.google-apps.folder';
const SHORTCUT = 'application/vnd.google-apps.shortcut';
const FILE_FIELDS = 'id,name,mimeType,parents,shortcutDetails/targetId,capabilities/canCopy,webViewLink';
// Roles que solo existen como dueño o dentro de unidades compartidas: en la copia pasan a editor.
const ROLE = { owner: 'writer', organizer: 'writer', fileOrganizer: 'writer' };

/** Extrae el ID de un link de Drive/Docs o de un ID suelto. */
export function parseId(text) {
  const s = String(text ?? '').trim();
  return (
    s.match(/\/(?:folders|d)\/([\w-]+)/)?.[1] ??
    s.match(/[?&]id=([\w-]+)/)?.[1] ??
    s.match(/^[\w-]{15,}$/)?.[0] ??
    null
  );
}

export function createDrive({
  getToken, // async (tokenVencido?) => token
  fetch = globalThis.fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  t = (key, subs = []) => [key, ...subs].join(' '), // chrome.i18n.getMessage en la extensión
}) {
  async function api(path, { method = 'GET', params = {}, body } = {}) {
    const url = `${API}/${path}?${new URLSearchParams({ supportsAllDrives: 'true', ...params })}`;
    let token = await getToken();
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body && { 'Content-Type': 'application/json' }) },
        body: body && JSON.stringify(body),
      });
      if (res.ok) return res.status === 204 ? null : res.json();
      const err = (await res.json().catch(() => ({}))).error ?? {};
      const reason = err.errors?.[0]?.reason ?? '';
      if (res.status === 401 && !refreshed) {
        refreshed = true;
        token = await getToken(token);
        continue;
      }
      const retryable =
        res.status === 429 || res.status >= 500 || (res.status === 403 && /rateLimitExceeded/i.test(reason));
      if (retryable && attempt < 5) {
        await sleep(2 ** attempt * 1000 + Math.random() * 500);
        continue;
      }
      throw Object.assign(new Error(err.message || `HTTP ${res.status}`), { status: res.status, reason });
    }
  }

  async function listAll(path, params, key) {
    const out = [];
    let pageToken;
    do {
      const page = await api(path, { params: { ...params, ...(pageToken && { pageToken }) } });
      out.push(...(page[key] ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return out;
  }

  const getFile = (id) => api(`files/${id}`, { params: { fields: FILE_FIELDS } });

  // El origen elegido puede ser un acceso directo (así quedan en Mi unidad las carpetas compartidas): se clona su destino real.
  async function getSource(id) {
    const f = await getFile(id);
    return f.mimeType === SHORTCUT ? getFile(f.shortcutDetails.targetId) : f;
  }

  const children = (id, foldersOnly = false) =>
    listAll(
      'files',
      {
        q: `'${id}' in parents and trashed = false${foldersOnly ? ` and mimeType = '${FOLDER}'` : ''}`,
        fields: `nextPageToken,files(${FILE_FIELDS})`,
        includeItemsFromAllDrives: 'true',
        orderBy: 'folder,name',
        pageSize: 1000,
      },
      'files',
    );

  const drives = () => listAll('drives', { fields: 'nextPageToken,drives(id,name)', pageSize: 100 }, 'drives');

  const listPerms = (id) =>
    listAll(
      `files/${id}/permissions`,
      {
        fields: 'nextPageToken,permissions(id,type,role,emailAddress,domain,allowFileDiscovery,deleted)',
        pageSize: 100,
      },
      'permissions',
    );

  const addPerm = (fileId, body, notify = false) =>
    api(`files/${fileId}/permissions`, { method: 'POST', params: { sendNotificationEmail: String(notify) }, body });

  async function isInside(id, ancestorId) {
    for (let cur = id; cur; ) {
      const f = await getFile(cur);
      if (f.id === ancestorId) return true;
      cur = f.parents?.[0];
    }
    return false;
  }

  /**
   * perms: { mode: 'inherit' } | { mode: 'keep' } | { mode: 'new', list: [{ email, role }], notify }
   * resume: reutiliza las carpetas y omite los archivos que ya existan con el mismo nombre en el destino.
   * Devuelve { done, existing, root, shared[], aborted, cancelled, skipped[], errors[], warnings[] }. Un fallo en un ítem no
   * aborta el resto; quedarse sin cuota sí (`aborted`), porque seguir solo repetiría el error en cada archivo.
   * signal: AbortSignal para cancelar; se respeta entre ítems (la llamada en curso termina) y deja `cancelled`.
   * onProgress recibe { scanning: true, total } mientras cuenta y luego { seen, total, done, current }.
   */
  async function clone({ sourceId, destId, name, perms = { mode: 'inherit' }, resume = false, signal, onProgress = () => {} }) {
    const report = { done: 0, existing: 0, root: null, shared: null, aborted: null, cancelled: false, skipped: [], errors: [], warnings: [] };
    const src = await getSource(sourceId);
    if (src.mimeType === FOLDER && (await isInside(destId, src.id)))
      throw new Error(t('destInsideSource'));
    const me =
      perms.mode === 'keep' ? (await api('about', { params: { fields: 'user(permissionId)' } })).user.permissionId : null;
    let rootIsNew = false;
    let total = 0;
    let seen = 0;
    let root;
    const checkCancel = () => {
      if (signal?.aborted) throw Object.assign(new Error('cancelled'), { cancelled: true });
    };

    // Recorre el origen antes de copiar para saber cuánto hay; la copia reutiliza estos listados.
    async function scan(item) {
      checkCancel();
      onProgress({ scanning: true, total: ++total });
      const node = { item, kids: [], listError: null };
      if (item.mimeType === FOLDER) {
        try {
          for (const kid of await children(item.id)) node.kids.push(await scan(kid));
        } catch (e) {
          if (e.cancelled) throw e;
          node.listError = e.message;
        }
      }
      return node;
    }

    // Lo que ya hay en una carpeta de destino, por tipo y nombre (puede haber nombres repetidos).
    async function existingIn(folderId) {
      const map = new Map();
      for (const f of await children(folderId)) {
        const key = `${f.mimeType === FOLDER}:${f.name}`;
        map.set(key, [...(map.get(key) ?? []), f]);
      }
      return map;
    }

    // Copia a `copyId` los permisos de `srcId` que el padre no aporta ya por herencia.
    // Con apply=false solo calcula las claves (carpeta que ya existía: sus permisos se pusieron al crearla).
    // ponytail: un permissions.list por ítem; pedir `permissions` dentro de files.list si esto resulta lento.
    async function keepPerms(srcId, copyId, path, parentKeys, apply) {
      let list;
      try {
        list = await listPerms(srcId);
      } catch (e) {
        report.warnings.push(t('permsUnreadable', [path, e.message]));
        return parentKeys;
      }
      const keys = new Set();
      for (const p of list) {
        if (p.deleted || p.id === me) continue;
        const role = ROLE[p.role] ?? p.role;
        const key = `${p.id}:${role}`;
        keys.add(key);
        if (!apply || parentKeys.has(key)) continue;
        try {
          await addPerm(copyId, {
            type: p.type,
            role,
            emailAddress: p.emailAddress,
            domain: p.domain,
            allowFileDiscovery: p.allowFileDiscovery,
          });
        } catch (e) {
          report.warnings.push(t('permNotApplied', [path, p.emailAddress ?? p.domain ?? p.type, e.message]));
        }
      }
      return keys;
    }

    // ponytail: secuencial; un pool de ~5 en paralelo si las carpetas grandes resultan lentas.
    async function walk(node, parentId, newName, path, parentKeys, existing) {
      const { item } = node;
      checkCancel();
      onProgress({ seen: ++seen, total, done: report.done, current: path });
      const isFolder = item.mimeType === FOLDER;
      const found = existing?.get(`${isFolder}:${newName}`)?.shift();
      let copy = found;
      if (found) report.existing++;
      else {
        try {
          const body = { name: newName, parents: [parentId] };
          const params = { fields: 'id,webViewLink' };
          if (isFolder) copy = await api('files', { method: 'POST', params, body: { ...body, mimeType: FOLDER } });
          else if (item.mimeType === SHORTCUT)
            copy = await api('files', {
              method: 'POST',
              params,
              body: { ...body, mimeType: SHORTCUT, shortcutDetails: { targetId: item.shortcutDetails.targetId } },
            });
          else if (item.capabilities?.canCopy === false) return void report.skipped.push(t('noCopyAllowed', [path]));
          else copy = await api(`files/${item.id}/copy`, { method: 'POST', params, body });
        } catch (e) {
          if (/(quota|limit)Exceeded/i.test(e.reason)) throw Object.assign(e, { fatal: true });
          return void report.errors.push(`${path}: ${e.message}`);
        }
        report.done++;
      }
      if (node === root) {
        report.root = copy;
        rootIsNew = !found;
      }
      if (found && !isFolder) return;
      const keys = perms.mode === 'keep' ? await keepPerms(item.id, copy.id, path, parentKeys, !found) : parentKeys;
      if (isFolder) {
        if (node.listError) report.errors.push(t('listFailed', [path, node.listError]));
        let kidsExisting = null;
        try {
          if (found) kidsExisting = await existingIn(copy.id);
        } catch (e) {
          report.errors.push(t('listFailed', [path, e.message]));
        }
        for (const kid of node.kids) await walk(kid, copy.id, kid.item.name, `${path}/${kid.item.name}`, keys, kidsExisting);
      }
    }

    const rootName = name ?? src.name;
    try {
      root = await scan(src);
      await walk(root, destId, rootName, rootName, new Set(), resume ? await existingIn(destId) : null);
    } catch (e) {
      if (e.cancelled) report.cancelled = true;
      else if (e.fatal) report.aborted = e.message;
      else throw e;
    }

    if (perms.mode === 'new' && rootIsNew) {
      for (const { email, role } of perms.list) {
        const body = { role, emailAddress: email };
        try {
          // Un grupo exige type 'group'; no se puede saber por el correo, así que se prueba.
          await addPerm(report.root.id, { ...body, type: 'user' }, perms.notify).catch(() =>
            addPerm(report.root.id, { ...body, type: 'group' }, perms.notify),
          );
        } catch (e) {
          report.warnings.push(t('permNotApplied', [rootName, email, e.message]));
        }
      }
    }
    // Acceso real con el que quedó la copia (incluye lo heredado del destino), para mostrarlo en vez de suponerlo.
    if (report.root)
      report.shared = await listPerms(report.root.id).then(
        (list) => list.filter((p) => p.role !== 'owner' && !p.deleted).map((p) => p.emailAddress ?? p.domain ?? p.type),
        () => null,
      );
    onProgress({ seen, total, done: report.done, current: '' });
    return report;
  }

  return { api, getFile, getSource, children, drives, clone };
}
