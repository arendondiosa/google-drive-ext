// Complemento de Google Workspace para Drive: misma lógica que la extensión (drive.js), en Apps Script.
// Apps Script corta cada acción a ~30 s y cada ejecución a ~6 min, así que la copia avanza por tramos:
// cada tramo retoma en la posición donde quedó el anterior (job.cursor) hasta que se le acaba el tiempo.

var API = 'https://www.googleapis.com/drive/v3';
var FOLDER = 'application/vnd.google-apps.folder';
var SHORTCUT = 'application/vnd.google-apps.shortcut';
var FILE_FIELDS = 'id,name,mimeType,parents,shortcutDetails/targetId,capabilities/canCopy,webViewLink';
// Roles que solo existen como dueño o dentro de unidades compartidas: en la copia pasan a editor.
var ROLE = { owner: 'writer', organizer: 'writer', fileOrganizer: 'writer' };
var INLINE_MS = 18 * 1000; // tramo dentro de un clic (límite de la acción: 30 s)
var BACKGROUND_MS = 4.5 * 60 * 1000; // tramo en segundo plano (límite de ejecución: 6 min)
var STALE_MS = 8 * 60 * 1000; // sin novedades del segundo plano en este tiempo, se da por detenido

// Programar el activador puede «funcionar» y que Google nunca lo ejecute. Solo se confía en el segundo plano
// si un tramo corrió de verdad desde un activador hace poco (job.bgRanAt); si no, cada clic copia un tramo.
function backgroundAlive(job) {
  return !!job.bgRanAt && Date.now() - job.bgRanAt < STALE_MS;
}
var MAX_FOLDERS = 80; // carpetas que caben en la tarjeta del selector de destino

// ---------- Textos ----------

var MESSAGES = {
  es: {
    selectHint: 'Selecciona en Drive los archivos o carpetas que quieres clonar.',
    source: 'Origen',
    destination: 'Destino',
    change: 'Cambiar',
    orPasteFolderLink: 'o pega el link de una carpeta',
    copyName: 'Nombre de la copia',
    permissions: 'Permisos',
    permsInherit: 'Heredar los del destino',
    permsKeep: 'Conservar los originales',
    permsNew: 'Definir nuevos',
    emails: 'Correos',
    emailsHint: 'Separados por comas',
    role: 'Rol',
    roleReader: 'Lector',
    roleCommenter: 'Comentador',
    roleWriter: 'Editor',
    notify: 'Notificar por correo',
    resume: 'Retomar: omitir lo que ya existe en el destino',
    clone: 'Clonar',
    chooseDest: 'Elegir destino',
    home: 'Inicio',
    myDrive: 'Mi unidad',
    useThisFolder: 'Usar esta carpeta',
    up: 'Subir',
    cancel: 'Cancelar',
    noSubfolders: 'Sin subcarpetas',
    tooManyFolders: 'Se muestran las primeras $1 carpetas. Para otra, pega su link en la pantalla anterior.',
    notDriveLink: 'Ese link no parece de Drive.',
    destMustBeFolder: 'El destino debe ser una carpeta.',
    needEmails: 'Escribe al menos un correo para «Definir nuevos».',
    bgOn: 'Sigue copiando sola en segundo plano. Pulsa Actualizar para ver el avance.',
    counting: 'Contando archivos… $1',
    progressLine: 'Copiando: $1/$2 ($3 %)',
    bgOff: 'Pulsa Continuar para avanzar otro tramo.',
    done: 'Listo: $1 copiados.',
    aborted: 'Se detuvo: $1',
    cancelled: 'Copia cancelada. Lo ya copiado queda en el destino.',
    nowCopying: 'Copiando ahora:',
    ofN: '$1 de $2',
    continue: 'Continuar',
    refresh: 'Actualizar',
    close: 'Cerrar',
    openCopy: 'Abrir copia',
    errors: 'Errores',
    skipped: 'Omitidos',
    permWarnings: 'Avisos de permisos',
    destInsideSource: 'El destino está dentro de la carpeta de origen.',
    noCopyAllowed: '$1: no permite copias',
    listFailed: '$1: no se pudo listar el contenido ($2)',
    permsUnreadable: '$1: no se pudieron leer los permisos ($2)',
    permNotApplied: '$1: permiso de $2 no aplicado ($3)',
  },
  en: {
    selectHint: 'Select the files or folders you want to clone in Drive.',
    source: 'Source',
    destination: 'Destination',
    change: 'Change',
    orPasteFolderLink: 'or paste a folder link',
    copyName: 'Name of the copy',
    permissions: 'Permissions',
    permsInherit: 'Inherit from destination',
    permsKeep: 'Keep the original ones',
    permsNew: 'Set new ones',
    emails: 'Emails',
    emailsHint: 'Comma separated',
    role: 'Role',
    roleReader: 'Viewer',
    roleCommenter: 'Commenter',
    roleWriter: 'Editor',
    notify: 'Notify by email',
    resume: 'Resume: skip what already exists in the destination',
    clone: 'Clone',
    chooseDest: 'Choose destination',
    home: 'Home',
    myDrive: 'My Drive',
    useThisFolder: 'Use this folder',
    up: 'Up',
    cancel: 'Cancel',
    noSubfolders: 'No subfolders',
    tooManyFolders: 'Showing the first $1 folders. For another one, paste its link on the previous screen.',
    notDriveLink: "That doesn't look like a Drive link.",
    destMustBeFolder: 'The destination must be a folder.',
    needEmails: 'Enter at least one email for “Set new ones”.',
    bgOn: 'It keeps copying on its own in the background. Press Refresh to see progress.',
    counting: 'Counting files… $1',
    progressLine: 'Copying: $1/$2 ($3 %)',
    bgOff: 'Press Continue to advance another batch.',
    done: 'Done: $1 copied.',
    aborted: 'Stopped: $1',
    cancelled: 'Copy cancelled. What was already copied stays in the destination.',
    nowCopying: 'Copying now:',
    ofN: '$1 of $2',
    continue: 'Continue',
    refresh: 'Refresh',
    close: 'Close',
    openCopy: 'Open copy',
    errors: 'Errors',
    skipped: 'Skipped',
    permWarnings: 'Permission warnings',
    destInsideSource: 'The destination is inside the source folder.',
    noCopyAllowed: '$1: copying not allowed',
    listFailed: '$1: could not list contents ($2)',
    permsUnreadable: '$1: could not read permissions ($2)',
    permNotApplied: '$1: permission for $2 not applied ($3)',
  },
};

function translator(locale) {
  var dict = MESSAGES[String(locale || '').slice(0, 2).toLowerCase()] || MESSAGES.en;
  return function (key) {
    var args = arguments;
    return dict[key].replace(/\$(\d)/g, function (_, n) {
      return String(args[n]);
    });
  };
}

// ---------- API de Drive ----------

function api(path, opt) {
  opt = opt || {};
  var params = Object.assign({ supportsAllDrives: 'true' }, opt.params);
  var query = Object.keys(params)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    })
    .join('&');
  for (var attempt = 0; ; attempt++) {
    var res = UrlFetchApp.fetch(API + '/' + path + '?' + query, {
      method: opt.method || 'get',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      contentType: 'application/json',
      payload: opt.body ? JSON.stringify(opt.body) : undefined,
      muteHttpExceptions: true,
    });
    var status = res.getResponseCode();
    var data = {};
    try {
      data = JSON.parse(res.getContentText() || '{}');
    } catch (e) {
      // cuerpo no JSON (p. ej. un 5xx con HTML): se trata por el código de estado
    }
    if (status < 300) return data;
    var err = data.error || {};
    var reason = (err.errors && err.errors[0] && err.errors[0].reason) || '';
    var retryable = status === 429 || status >= 500 || (status === 403 && /rateLimitExceeded/i.test(reason));
    // Menos reintentos que la extensión: aquí cada segundo de espera sale del tramo de 18 s.
    if (retryable && attempt < 3) {
      Utilities.sleep(Math.pow(2, attempt) * 1000);
      continue;
    }
    var error = new Error(err.message || 'HTTP ' + status);
    error.status = status;
    error.reason = reason;
    throw error;
  }
}

function listAll(path, params, key) {
  var out = [];
  var pageToken;
  do {
    var page = api(path, { params: Object.assign({}, params, pageToken ? { pageToken: pageToken } : {}) });
    out = out.concat(page[key] || []);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

function getFile(id) {
  return api('files/' + id, { params: { fields: FILE_FIELDS } });
}

// El origen elegido puede ser un acceso directo (así quedan en Mi unidad las carpetas compartidas): se clona su destino real.
function getSource(id) {
  var f = getFile(id);
  return f.mimeType === SHORTCUT ? getFile(f.shortcutDetails.targetId) : f;
}

function children(id, foldersOnly) {
  return listAll(
    'files',
    {
      q: "'" + id + "' in parents and trashed = false" + (foldersOnly ? " and mimeType = '" + FOLDER + "'" : ''),
      fields: 'nextPageToken,files(' + FILE_FIELDS + ')',
      includeItemsFromAllDrives: 'true',
      orderBy: 'folder,name,createdTime',
      pageSize: 1000,
    },
    'files',
  );
}

function listDrives() {
  return listAll('drives', { fields: 'nextPageToken,drives(id,name)', pageSize: 100 }, 'drives');
}

function listPerms(id) {
  return listAll(
    'files/' + id + '/permissions',
    {
      fields: 'nextPageToken,permissions(id,type,role,emailAddress,domain,allowFileDiscovery,deleted)',
      pageSize: 100,
    },
    'permissions',
  );
}

function addPerm(fileId, body, notify) {
  return api('files/' + fileId + '/permissions', {
    method: 'post',
    params: { sendNotificationEmail: String(!!notify) },
    body: body,
  });
}

function isInside(id, ancestorId) {
  for (var cur = id; cur; ) {
    var f = getFile(cur);
    if (f.id === ancestorId) return true;
    cur = f.parents && f.parents[0];
  }
  return false;
}

function parseId(text) {
  var s = String(text || '').trim();
  var m = s.match(/\/(?:folders|d)\/([\w-]+)/) || s.match(/[?&]id=([\w-]+)/) || s.match(/^([\w-]{15,})$/);
  return m ? m[1] : null;
}

// ---------- Trabajo de copia (por tramos) ----------
//
// job: { sources[], destId, name, perms: { mode, list[], notify }, resume, locale,
//        id, roots: { [sourceId]: { id, webViewLink } }, me, done, status: 'running'|'done'|'aborted', message,
//        counted, total, seen: recuento previo del origen y cuántos ítems van recorridos (el x/y del avance),
//        bgError, bgRanAt: por qué no se pudo programar el siguiente tramo, y cuándo corrió el último en segundo plano,
//        errors[], skipped[], warnings[],
//        cursor: [índice de origen, índice de hijo en cada nivel…] del ítem donde se retoma,
//        trail: [[índice, total del nivel, nombre]…] de ese mismo ítem, para mostrar el avance }
//
// ponytail: el cursor son posiciones en el listado ordenado; si el origen cambia a mitad de la copia, un ítem
// puede quedar sin copiar. Volver a clonar con «Retomar» lo completa.

function loadJob() {
  var raw = PropertiesService.getUserProperties().getProperty('job');
  return raw ? JSON.parse(raw) : null;
}

function saveJob(job) {
  // Una propiedad admite ~9 KB: las listas se recortan.
  var slim = Object.assign({}, job);
  ['errors', 'skipped', 'warnings'].forEach(function (k) {
    slim[k] = job[k].slice(0, 15).map(function (s) {
      return String(s).slice(0, 200);
    });
  });
  PropertiesService.getUserProperties().setProperty('job', JSON.stringify(slim));
}

// Falso si el trabajo se canceló (o se reemplazó por otro) mientras este tramo corría.
function isCurrent(job) {
  var now = loadJob();
  return !!now && now.id === job.id;
}

// Lo que ya hay en una carpeta de destino, por tipo y nombre (puede haber nombres repetidos).
function existingIn(folderId) {
  var map = {};
  children(folderId).forEach(function (f) {
    var key = (f.mimeType === FOLDER ? 'd:' : 'f:') + f.name;
    (map[key] = map[key] || []).push(f);
  });
  return map;
}

/** Avanza el trabajo hasta terminar o hasta agotar `budgetMs`; deja el resultado en job.status. */
function runSlice(job, budgetMs) {
  var deadline = Date.now() + budgetMs;
  var lastSave = Date.now();
  var T = translator(job.locale);
  var resumeAt = job.cursor || [];
  var trail = []; // [índice, total del nivel, nombre] por nivel hasta el ítem en curso
  var created = 0;
  var counted = 0;
  job.message = '';

  // Copia a `copyId` los permisos de `srcId` que el padre no aporta ya por herencia.
  // Con apply=false solo calcula las claves (carpeta que ya existía: sus permisos se pusieron al crearla).
  function keepPerms(srcId, copyId, path, parentKeys, apply) {
    var list;
    try {
      list = listPerms(srcId);
    } catch (e) {
      if (apply) job.warnings.push(T('permsUnreadable', path, e.message));
      return parentKeys;
    }
    var keys = {};
    list.forEach(function (p) {
      if (p.deleted || p.id === job.me) return;
      var role = ROLE[p.role] || p.role;
      var key = p.id + ':' + role;
      keys[key] = true;
      if (!apply || parentKeys[key]) return;
      try {
        addPerm(copyId, {
          type: p.type,
          role: role,
          emailAddress: p.emailAddress,
          domain: p.domain,
          allowFileDiscovery: p.allowFileDiscovery,
        });
      } catch (e) {
        job.warnings.push(T('permNotApplied', path, p.emailAddress || p.domain || p.type, e.message));
      }
    });
    return keys;
  }

  function newPerms(rootId, rootName) {
    job.perms.list.forEach(function (p) {
      var body = { role: p.role, emailAddress: p.email };
      try {
        // Un grupo exige type 'group'; no se puede saber por el correo, así que se prueba.
        try {
          addPerm(rootId, Object.assign({ type: 'user' }, body), job.perms.notify);
        } catch (e) {
          addPerm(rootId, Object.assign({ type: 'group' }, body), job.perms.notify);
        }
      } catch (e) {
        job.warnings.push(T('permNotApplied', rootName, p.email, e.message));
      }
    });
  }

  // Guarda el avance; si entre tanto cancelaron, corta el tramo en vez de revivir el trabajo.
  // El ítem en curso se guarda como no recorrido: al retomar se vuelve a pasar por él.
  function checkpoint(inProgress) {
    if (!isCurrent(job)) throw { cancelled: true };
    mark();
    if (inProgress) job.seen--;
    saveJob(job);
    if (inProgress) job.seen++;
    lastSave = Date.now();
  }

  // Cuenta lo que hay en el origen (job.total) antes de copiar, para mostrar x/y. Usa el mismo cursor que la copia.
  function count(item, skipTo) {
    var descending = skipTo && skipTo.length; // carpeta ya contada por la que solo se baja al retomar
    if (!descending) {
      if (counted && Date.now() > deadline) throw { timeout: true };
      job.total++;
      counted++;
    }
    if (item.mimeType !== FOLDER) return;
    var kids = [];
    try {
      kids = children(item.id);
    } catch (e) {
      // el error se reporta al copiar esa carpeta
    }
    var first = descending ? skipTo[0] : 0;
    for (var i = first; i < kids.length; i++) {
      trail.push([i, kids.length, kids[i].name]);
      count(kids[i], i === first && skipTo ? skipTo.slice(1) : null);
      trail.pop();
    }
  }

  // Anota en el trabajo por dónde va, para retomar ahí y para mostrarlo.
  function mark() {
    job.cursor = trail.map(function (level) {
      return level[0];
    });
    job.trail = trail.map(function (level) {
      return [level[0], level[1], String(level[2]).slice(0, 60)];
    });
  }

  // `found`: la copia de este ítem si ya existe. `sourceId` solo viene en la raíz de cada origen.
  // `skipTo`: índices de hijos por los que hay que bajar para llegar al punto donde se retoma.
  function walk(item, parentId, newName, path, parentKeys, found, sourceId, skipTo) {
    // Cada tramo crea al menos un ítem antes de cortar, para que siempre avance.
    if (created && Date.now() > deadline) throw { timeout: true };
    var fresh = !(skipTo && skipTo.length); // falso en las carpetas por las que solo se baja al retomar
    if (fresh) job.seen++;
    var isFolder = item.mimeType === FOLDER;
    var copy = found;
    if (!copy) {
      try {
        var body = { name: newName, parents: [parentId] };
        var params = { fields: 'id,webViewLink' };
        if (isFolder) copy = api('files', { method: 'post', params: params, body: Object.assign({ mimeType: FOLDER }, body) });
        else if (item.mimeType === SHORTCUT)
          copy = api('files', {
            method: 'post',
            params: params,
            body: Object.assign({ mimeType: SHORTCUT, shortcutDetails: { targetId: item.shortcutDetails.targetId } }, body),
          });
        else if (item.capabilities && item.capabilities.canCopy === false) return void job.skipped.push(T('noCopyAllowed', path));
        else copy = api('files/' + item.id + '/copy', { method: 'post', params: params, body: body });
      } catch (e) {
        if (/(quota|limit)Exceeded/i.test(e.reason)) {
          if (fresh) job.seen--; // se reintenta al continuar
          throw e; // sin cuota: no tiene sentido seguir
        }
        return void job.errors.push(path + ': ' + e.message);
      }
      job.done++;
      created++;
    }
    if (sourceId) {
      // La raíz se guarda de inmediato: si este tramo muere, el siguiente no debe crear otra.
      job.roots[sourceId] = { id: copy.id, webViewLink: copy.webViewLink };
      checkpoint(fresh);
      if (!found && job.perms.mode === 'new') newPerms(copy.id, newName);
    } else if (Date.now() - lastSave > 10000) checkpoint(fresh);
    if (found && !isFolder) return;
    var keys = job.perms.mode === 'keep' ? keepPerms(item.id, copy.id, path, parentKeys, !found) : parentKeys;
    if (isFolder) {
      var kids = [];
      var have = {};
      try {
        kids = children(item.id);
        if (found) have = existingIn(copy.id);
      } catch (e) {
        job.errors.push(T('listFailed', path, e.message));
      }
      var first = skipTo && skipTo.length ? skipTo[0] : 0;
      for (var i = first; i < kids.length; i++) {
        var kid = kids[i];
        var bucket = have[(kid.mimeType === FOLDER ? 'd:' : 'f:') + kid.name];
        trail.push([i, kids.length, kid.name]);
        walk(kid, copy.id, kid.name, path + '/' + kid.name, keys, bucket && bucket.shift(), null, i === first && skipTo ? skipTo.slice(1) : null);
        trail.pop();
      }
    }
  }

  try {
    if (!job.counted) {
      for (var c = resumeAt[0] || 0; c < job.sources.length; c++) {
        var counting = getSource(job.sources[c]);
        trail = [[c, job.sources.length, job.name || counting.name]];
        count(counting, c === resumeAt[0] ? resumeAt.slice(1) : null);
      }
      job.counted = true;
      resumeAt = [];
      trail = [];
    }
    if (job.perms.mode === 'keep' && !job.me) job.me = api('about', { params: { fields: 'user(permissionId)' } }).user.permissionId;
    for (var s = resumeAt[0] || 0; s < job.sources.length; s++) {
      var sourceId = job.sources[s];
      var src = getSource(sourceId);
      var name = job.name || src.name;
      var found = job.roots[sourceId];
      if (!found) {
        if (src.mimeType === FOLDER && isInside(job.destId, src.id)) throw new Error(T('destInsideSource'));
        if (job.resume) found = (existingIn(job.destId)[(src.mimeType === FOLDER ? 'd:' : 'f:') + name] || [])[0];
      }
      trail = [[s, job.sources.length, name]];
      walk(src, job.destId, name, name, {}, found, sourceId, s === resumeAt[0] ? resumeAt.slice(1) : null);
    }
    job.status = 'done';
  } catch (e) {
    if (e.cancelled) return null;
    mark();
    job.status = e.timeout ? 'running' : 'aborted';
    if (!e.timeout) job.message = e.message;
  }
  return job;
}

function clearTriggers() {
  try {
    ScriptApp.getProjectTriggers().forEach(function (trigger) {
      if (trigger.getHandlerFunction() === 'runJob') ScriptApp.deleteTrigger(trigger);
    });
  } catch (e) {
    // sin permiso para gestionar activadores: no hay nada que limpiar
  }
}

// Programa el siguiente tramo en segundo plano. Devuelve '' si quedó programado, o el motivo si Google no lo
// permitió; en ese caso la copia sigue funcionando a clics y la tarjeta lo dice.
function schedule() {
  clearTriggers();
  try {
    ScriptApp.newTrigger('runJob').timeBased().after(60 * 1000).create();
    return '';
  } catch (e) {
    return e.message || String(e);
  }
}

/** Corre un tramo si nadie más lo está corriendo y devuelve el trabajo actualizado. */
function advance(budgetMs, fromTrigger) {
  var lock = LockService.getUserLock();
  if (!lock.tryLock(500)) {
    if (fromTrigger) schedule(); // otro tramo sigue en curso: se reintenta luego para no cortar la cadena
    return loadJob();
  }
  try {
    var job = loadJob();
    if (!job || job.status === 'done' || (fromTrigger && job.status !== 'running')) return job;
    if (!runSlice(job, budgetMs) || !isCurrent(job)) return loadJob(); // cancelado a mitad del tramo
    if (job.status === 'running') job.bgError = schedule();
    else clearTriggers();
    if (fromTrigger) job.bgRanAt = Date.now();
    saveJob(job);
    return job;
  } finally {
    lock.releaseLock();
  }
}

/** Activador en segundo plano. */
function runJob() {
  advance(BACKGROUND_MS, true);
}

// ---------- Tarjetas ----------

function localeOf(e) {
  return (e.commonEventObject && e.commonEventObject.userLocale) || e.userLocale || 'en';
}

function paramsOf(e) {
  return e.parameters || (e.commonEventObject && e.commonEventObject.parameters) || {};
}

function formOf(e) {
  if (e.formInput) return e.formInput;
  var out = {};
  var inputs = (e.commonEventObject && e.commonEventObject.formInputs) || {};
  Object.keys(inputs).forEach(function (k) {
    var v = inputs[k].stringInputs;
    if (v && v.value.length) out[k] = v.value[0];
  });
  return out;
}

// Estado de la pantalla, que viaja en los parámetros de cada acción:
// { items: [{ id, title, mimeType }], dest: { id, name }, form: {...}, path: [{ id, name }] }
function stateOf(e) {
  return JSON.parse(paramsOf(e).st);
}

function act(fn, st, extra) {
  return CardService.newAction()
    .setFunctionName(fn)
    .setParameters(Object.assign(st ? { st: JSON.stringify(st) } : {}, extra));
}

function button(text, action, filled) {
  var b = CardService.newTextButton().setText(text).setOnClickAction(action);
  return filled ? b.setTextButtonStyle(CardService.TextButtonStyle.FILLED) : b;
}

function text(s) {
  return CardService.newTextParagraph().setText(s);
}

function nav(card) {
  return CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(card)).build();
}

function toast(message) {
  return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(message)).build();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hintCard(T) {
  return CardService.newCardBuilder()
    .addSection(CardService.newCardSection().addWidget(text(T('selectHint'))))
    .build();
}

function mainCard(st, T) {
  var f = st.form || {};
  var mode = f.mode || 'inherit';
  var card = CardService.newCardBuilder();

  card.addSection(
    CardService.newCardSection()
      .setHeader(T('source'))
      .addWidget(
        text(
          st.items
            .map(function (i) {
              return (i.mimeType === FOLDER ? '📁 ' : '📄 ') + escapeHtml(i.title);
            })
            .join('<br>'),
        ),
      ),
  );

  card.addSection(
    CardService.newCardSection()
      .setHeader(T('destination'))
      .addWidget(
        CardService.newDecoratedText()
          .setText('📁 ' + escapeHtml(st.dest.name))
          .setWrapText(true)
          .setButton(button(T('change'), act('browse', Object.assign({}, st, { path: [] }), { save: '1' }))),
      )
      .addWidget(CardService.newTextInput().setFieldName('destLink').setTitle(T('orPasteFolderLink')).setValue(f.destLink || '')),
  );

  var options = CardService.newCardSection();
  if (st.items.length === 1)
    options.addWidget(CardService.newTextInput().setFieldName('name').setTitle(T('copyName')).setValue(f.name || st.items[0].title));
  options.addWidget(
    CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.RADIO_BUTTON)
      .setFieldName('mode')
      .setTitle(T('permissions'))
      .addItem(T('permsInherit'), 'inherit', mode === 'inherit')
      .addItem(T('permsKeep'), 'keep', mode === 'keep')
      .addItem(T('permsNew'), 'new', mode === 'new')
      .setOnChangeAction(act('modeChanged', st)),
  );
  // Las tarjetas no permiten deshabilitar campos: los de compartir solo se muestran con «Definir nuevos».
  if (mode === 'new')
    options
      .addWidget(CardService.newTextInput().setFieldName('emails').setTitle(T('emails')).setHint(T('emailsHint')).setValue(f.emails || ''))
      .addWidget(
        CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.DROPDOWN)
          .setFieldName('role')
          .setTitle(T('role'))
          .addItem(T('roleReader'), 'reader', !f.role || f.role === 'reader')
          .addItem(T('roleCommenter'), 'commenter', f.role === 'commenter')
          .addItem(T('roleWriter'), 'writer', f.role === 'writer'),
      )
      .addWidget(
        CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName('notify')
          .addItem(T('notify'), '1', f.notify === '1'),
      );
  options
    .addWidget(
      CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('resume')
        .addItem(T('resume'), '1', f.resume === '1'),
    )
    .addWidget(button(T('clone'), act('startClone', st), true));
  return card.addSection(options).build();
}

function browseCard(st, T) {
  var path = st.path;
  var here = path[path.length - 1];
  var folders = here ? children(here.id, true) : [{ id: 'root', name: T('myDrive') }].concat(listDrives());
  var withPath = function (p) {
    return Object.assign({}, st, { path: p });
  };

  var top = CardService.newCardSection().addWidget(
    text(
      [T('home')]
        .concat(
          path.map(function (p) {
            return escapeHtml(p.name);
          }),
        )
        .join(' › '),
    ),
  );
  var buttons = CardService.newButtonSet();
  if (here) {
    buttons.addButton(button(T('useThisFolder'), act('pickDest', st), true));
    buttons.addButton(button(T('up'), act('browse', withPath(path.slice(0, -1)))));
  }
  buttons.addButton(button(T('cancel'), act('backToMain', st)));
  top.addWidget(buttons);

  var list = CardService.newCardSection();
  folders.slice(0, MAX_FOLDERS).forEach(function (f) {
    list.addWidget(
      CardService.newDecoratedText()
        .setText('📁 ' + escapeHtml(f.name))
        .setWrapText(true)
        .setOnClickAction(act('browse', withPath(path.concat({ id: f.id, name: f.name })))),
    );
  });
  if (!folders.length) list.addWidget(text(T('noSubfolders')));
  if (folders.length > MAX_FOLDERS) list.addWidget(text(T('tooManyFolders', MAX_FOLDERS)));

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(T('chooseDest')))
    .addSection(top)
    .addSection(list)
    .build();
}

function statusCard(job, T) {
  var running = job.status === 'running';
  var pct = job.total ? Math.min(100, Math.floor((job.seen * 100) / job.total)) : 0;
  var progress = job.counted ? T('progressLine', job.seen, job.total, pct) : T('counting', job.total);
  var line =
    job.status === 'done'
      ? T('done', job.done)
      : running
        ? '<b>' + progress + '</b><br>' + T(backgroundAlive(job) ? 'bgOn' : 'bgOff') + (job.bgError ? ' (' + escapeHtml(job.bgError) + ')' : '')
        : T('aborted', escapeHtml(job.message)) + '<br>' + progress;
  var section = CardService.newCardSection().addWidget(text(line));
  if (job.status !== 'done' && job.counted && job.trail && job.trail.length)
    section.addWidget(
      text(
        '<b>' + T('nowCopying') + '</b><br>' +
          job.trail
            .map(function (level, depth) {
              var where = level[1] > 1 ? ' (' + T('ofN', level[0] + 1, level[1]) + ')' : '';
              return new Array(depth + 1).join('&nbsp;&nbsp;') + escapeHtml(level[2]) + where;
            })
            .join('<br>'),
      ),
    );

  var buttons = CardService.newButtonSet();
  // Un solo botón: con el segundo plano activo solo refresca; si no, copia el siguiente tramo.
  if (job.status !== 'done') buttons.addButton(button(T(running && backgroundAlive(job) ? 'refresh' : 'continue'), act('continueJob'), true));
  buttons.addButton(button(T(job.status === 'done' ? 'close' : 'cancel'), act('closeJob')));
  section.addWidget(buttons);

  Object.keys(job.roots).forEach(function (id) {
    var url = job.roots[id].webViewLink;
    if (url) section.addWidget(CardService.newTextButton().setText(T('openCopy')).setOpenLink(CardService.newOpenLink().setUrl(url)));
  });

  var card = CardService.newCardBuilder().addSection(section);
  [
    ['errors', job.errors],
    ['skipped', job.skipped],
    ['permWarnings', job.warnings],
  ].forEach(function (pair) {
    if (pair[1].length)
      card.addSection(
        CardService.newCardSection()
          .setHeader(T(pair[0]))
          .addWidget(text(pair[1].map(escapeHtml).join('<br>'))),
      );
  });
  return card.build();
}

// ---------- Puntos de entrada ----------

// Google deja aceptar solo algunos permisos al autorizar; sin todos, la copia falla a medias.
// Esto vuelve a mostrar la pantalla de autorización cuando falta alguno.
function requireScopes() {
  if (ScriptApp.requireAllScopes) ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
}

function onHomepage(e) {
  requireScopes();
  var T = translator(localeOf(e));
  var job = loadJob();
  return job ? statusCard(job, T) : hintCard(T);
}

function onItemsSelected(e) {
  requireScopes();
  var T = translator(localeOf(e));
  var job = loadJob();
  if (job && job.status === 'running') return statusCard(job, T);
  var items = e.drive.selectedItems.map(function (i) {
    return { id: i.id, title: i.title, mimeType: i.mimeType };
  });
  return mainCard({ items: items, dest: { id: 'root', name: T('myDrive') }, form: {} }, T);
}

function browse(e) {
  var st = stateOf(e);
  if (paramsOf(e).save) st.form = formOf(e); // se sale de la pantalla principal: no perder lo escrito
  return nav(browseCard(st, translator(localeOf(e))));
}

function pickDest(e) {
  var st = stateOf(e);
  st.dest = st.path[st.path.length - 1];
  st.form.destLink = '';
  return nav(mainCard(st, translator(localeOf(e))));
}

// Al cambiar la opción de permisos se redibuja la tarjeta, conservando lo ya escrito.
function modeChanged(e) {
  var st = stateOf(e);
  var before = st.form || {};
  var now = formOf(e);
  st.form = Object.assign({}, before, now);
  // Una casilla desmarcada no viaja en el formulario: hay que apagarla a mano, si estaba en pantalla.
  st.form.resume = now.resume;
  if (before.mode === 'new') st.form.notify = now.notify;
  return nav(mainCard(st, translator(localeOf(e))));
}

function backToMain(e) {
  return nav(mainCard(stateOf(e), translator(localeOf(e))));
}

function startClone(e) {
  var T = translator(localeOf(e));
  var st = stateOf(e);
  var f = formOf(e);
  var dest = st.dest;
  if (f.destLink) {
    var id = parseId(f.destLink);
    if (!id) return toast(T('notDriveLink'));
    try {
      dest = getFile(id);
    } catch (err) {
      return toast(err.message);
    }
    if (dest.mimeType !== FOLDER) return toast(T('destMustBeFolder'));
  }
  var mode = f.mode || 'inherit';
  var list =
    mode === 'new'
      ? String(f.emails || '')
          .split(/[\s,;]+/)
          .filter(Boolean)
          .map(function (email) {
            return { email: email, role: f.role || 'reader' };
          })
      : [];
  if (mode === 'new' && !list.length) return toast(T('needEmails'));

  saveJob({
    id: String(Date.now()),
    sources: st.items.map(function (i) {
      return i.id;
    }),
    destId: dest.id,
    name: st.items.length === 1 ? String(f.name || '').trim() : '',
    perms: { mode: mode, list: list, notify: f.notify === '1' },
    resume: f.resume === '1',
    locale: localeOf(e),
    roots: {},
    done: 0,
    total: 0,
    seen: 0,
    counted: false,
    status: 'running',
    errors: [],
    skipped: [],
    warnings: [],
  });
  return nav(statusCard(advance(INLINE_MS), T));
}

function continueJob(e) {
  var T = translator(localeOf(e));
  var job = loadJob();
  // Si el segundo plano está trabajando de verdad basta con mostrar el estado; si no, este clic copia un tramo.
  if (!(job && job.status === 'running' && backgroundAlive(job))) job = advance(INLINE_MS);
  return nav(job ? statusCard(job, T) : hintCard(T));
}

function closeJob(e) {
  clearTriggers();
  var T = translator(localeOf(e));
  var job = loadJob();
  PropertiesService.getUserProperties().deleteProperty('job');
  var response = CardService.newActionResponseBuilder().setNavigation(CardService.newNavigation().updateCard(hintCard(T)));
  if (job && job.status !== 'done') response.setNotification(CardService.newNotification().setText(T('cancelled')));
  return response.build();
}
