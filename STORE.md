# Textos para publicar

Textos listos para pegar en los formularios de Google. Las justificaciones van en inglés porque las leen revisores de Google; las descripciones de la ficha van en los dos idiomas.

## 0. Direcciones

| Campo | URL |
|---|---|
| Página principal | `https://google-drive-ext.rendon.co/` |
| Política de privacidad | `https://google-drive-ext.rendon.co/privacy.html` |
| Términos del servicio | `https://google-drive-ext.rendon.co/terms.html` |
| Ayuda / soporte | `https://google-drive-ext.rendon.co/` (español) · `https://google-drive-ext.rendon.co/en/` (inglés) |
| Dominio autorizado | `rendon.co` |

## 1. Verificación OAuth (Google Auth Platform)

### Justificación del scope `https://www.googleapis.com/auth/drive`

> Clone in Drive lets a user duplicate any file or folder they can access in Google Drive, including items shared with them, into a destination folder they choose, optionally renaming the copy and choosing its permissions.
>
> To do this the app must: (1) list the contents of the user-chosen source folder recursively, (2) copy each file with files.copy and recreate each folder with files.create in the destination, (3) list the folders in the user's Drive and shared drives so they can pick a destination, and (4) when the user selects "keep original permissions", read the permissions of the source items and create the same permissions on the copies.
>
> Narrower scopes cannot support this:
> - drive.file only grants access to files the app created or that the user opened individually with the app. Selecting a folder does not grant access to its descendants, so a folder cannot be cloned, and permissions of source items cannot be read.
> - drive.readonly cannot create the copies, and is itself a restricted scope.
> - drive.metadata.readonly cannot copy files or create permissions.
>
> The app has no backend server. The Chrome extension calls the Drive API directly from the user's browser; the Workspace add-on runs on Google Apps Script. File contents are never downloaded: copies are made server-side by Drive. No Drive data is stored outside the user's Google account, shared with third parties, or accessed by humans.

### Scopes del complemento (no restringidos)

| Scope | Justificación |
|---|---|
| `drive.addons.metadata.readonly` | Receive the id, title and type of the items the user has selected in Drive, to offer them as the source to clone. |
| `script.external_request` | Call the Google Drive REST API v3 (`www.googleapis.com`). No other host is contacted. |
| `script.locale` | Show the add-on interface in the user's language (English or Spanish). |
| `script.scriptapp` | Create and delete a time-based trigger that continues a long copy in the background, since a single add-on action is limited to about 30 seconds. |

### Guion del video de demostración

1. Mostrar la pantalla de consentimiento con el nombre de la app y el scope de Drive.
2. Seleccionar una carpeta compartida en Drive y abrir la app.
3. Elegir destino, cambiar el nombre y elegir "Conservar los originales".
4. Clonar y mostrar el avance.
5. Abrir la copia en Drive y mostrar su contenido y con quién quedó compartida.
6. Mostrar la URL de la política de privacidad.

## 2. Chrome Web Store

### Propósito único (Single purpose)

> Clone Google Drive files or folders into a folder the user chooses, with an optional new name and a choice of permissions for the copy.

### Justificación de permisos

| Permiso | Justificación |
|---|---|
| `identity` | Sign the user in with their Google account (chrome.identity.getAuthToken) to call the Google Drive API on their behalf. |
| `sidePanel` | The whole interface (source, destination, name, permissions, progress) lives in Chrome's side panel so it stays open next to Drive during long copies. |
| `scripting` | When the user clicks "Use Drive selection", read the ids of the items currently selected in the active Google Drive tab so they do not have to paste links. |
| Host `https://drive.google.com/*` | Needed for the previous point, to read the URL of the open Drive folder, and to add a button in Drive's side rail that opens the panel. The extension runs on no other site. |
| Código remoto | No, I am not using remote code. All code is packaged in the extension. |

### Uso de datos (pestaña Privacidad)

- Marcar **Website content**: lee los identificadores de los ítems seleccionados en la página de Drive.
- Marcar **Personally identifiable information**: los correos que el usuario escribe para compartir la copia, que se envían solo a Google Drive.
- Certificar las tres declaraciones (no se venden datos, no se usan para fines ajenos al propósito único, no se usan para solvencia ni préstamos).

### Descripción corta (viene del manifest, máx. 132 caracteres)

- **es**: Clona archivos y carpetas de Drive, incluso las compartidas contigo, eligiendo destino, nombre y permisos.
- **en**: Clone Drive files and folders, including ones shared with you, choosing destination, name and permissions.

### Descripción — español

> Clona archivos y carpetas completas de Google Drive, incluidas las que otros compartieron contigo, eligiendo dónde va la copia, con qué nombre y con qué permisos.
>
> TU PROPIA COPIA DE LAS CARPETAS COMPARTIDAS
> Drive no tiene «hacer una copia» para carpetas, y lo que te comparten depende de que su dueño lo siga compartiendo. Clonar en Drive crea en tu unidad una copia independiente de toda la carpeta, de la que tú eres propietario:
> • Sigue siendo tuya aunque te quiten el acceso o borren el original.
> • Puedes editarla, reorganizarla y compartirla sin tocar el original.
> • Conserva toda la estructura de subcarpetas, sin copiar archivo por archivo.
>
> TÚ ELIGES
> • Destino: Mi unidad, cualquier subcarpeta o una unidad compartida.
> • Nombre de la copia.
> • Permisos: privada, con las mismas personas que el original, o con quien tú indiques.
>
> CÓMO FUNCIONA
> Selecciona los archivos en Drive, abre el panel, elige destino y pulsa Clonar. Verás el avance en vivo, con opción de cancelar y de retomar una copia incompleta.
>
> PRIVACIDAD
> No tiene servidores propios: tu navegador habla directamente con Google Drive y tus archivos no se descargan.
>
> Los archivos cuyo dueño desactivó la copia se omiten y se listan al final. Úsalo solo con contenido que tengas derecho a copiar.

### Descripción — inglés

> Clone Google Drive files and whole folders, including the ones others shared with you, choosing where the copy goes, its name and its permissions.
>
> YOUR OWN COPY OF SHARED FOLDERS
> Drive has no "make a copy" for folders, and what is shared with you lasts only as long as its owner keeps sharing it. Clone in Drive creates an independent copy of the whole folder in your own Drive, owned by you:
> • It stays yours even if your access is removed or the original is deleted.
> • You can edit, reorganize and share it without touching the original.
> • It keeps the entire subfolder structure, with no copying file by file.
>
> YOU CHOOSE
> • Destination: My Drive, any subfolder or a shared drive.
> • The name of the copy.
> • Permissions: private, the same people as the original, or whoever you specify.
>
> HOW IT WORKS
> Select the files in Drive, open the panel, pick a destination and press Clone. You get live progress, with the option to cancel and to resume an incomplete copy.
>
> PRIVACY
> There are no servers of our own: your browser talks directly to Google Drive and your files are not downloaded.
>
> Files whose owner disabled copying are skipped and listed at the end. Use it only with content you have the right to copy.

## 3. Google Workspace Marketplace

### Descripción corta (máx. 200 caracteres)

- **es**: Clona archivos y carpetas completas de Drive, incluso las compartidas contigo, eligiendo destino, nombre y permisos. En la barra lateral de Drive, desde cualquier navegador.
- **en**: Clone Drive files and whole folders, including ones shared with you, choosing destination, name and permissions. In the Drive side panel, from any browser.

### Descripción detallada — español

> Clona archivos y carpetas completas de Google Drive, incluidas las que otros compartieron contigo, eligiendo dónde va la copia, con qué nombre y con qué permisos.
>
> TU PROPIA COPIA DE LAS CARPETAS COMPARTIDAS
> Drive no tiene «hacer una copia» para carpetas, y lo que te comparten depende de que su dueño lo siga compartiendo. Clonar en Drive crea en tu unidad una copia independiente de toda la carpeta, de la que tú eres propietario:
> • Sigue siendo tuya aunque te quiten el acceso o borren el original.
> • Puedes editarla, reorganizarla y compartirla sin tocar el original.
> • Conserva toda la estructura de subcarpetas, sin copiar archivo por archivo.
>
> TÚ ELIGES
> • Destino: Mi unidad, cualquier subcarpeta o una unidad compartida.
> • Nombre de la copia.
> • Permisos: privada, con las mismas personas que el original, o con quien tú indiques.
>
> CÓMO FUNCIONA
> Selecciona los archivos en Drive, abre el complemento en la barra lateral, elige destino y pulsa Clonar. Las copias grandes continúan solas en segundo plano, con avance y opción de cancelar. No hay nada que instalar en el navegador.
>
> Los archivos cuyo dueño desactivó la copia se omiten y se listan al final. Úsalo solo con contenido que tengas derecho a copiar.

### Descripción detallada — inglés

> Clone Google Drive files and whole folders, including the ones others shared with you, choosing where the copy goes, its name and its permissions.
>
> YOUR OWN COPY OF SHARED FOLDERS
> Drive has no "make a copy" for folders, and what is shared with you lasts only as long as its owner keeps sharing it. Clone in Drive creates an independent copy of the whole folder in your own Drive, owned by you:
> • It stays yours even if your access is removed or the original is deleted.
> • You can edit, reorganize and share it without touching the original.
> • It keeps the entire subfolder structure, with no copying file by file.
>
> YOU CHOOSE
> • Destination: My Drive, any subfolder or a shared drive.
> • The name of the copy.
> • Permissions: private, the same people as the original, or whoever you specify.
>
> HOW IT WORKS
> Select the files in Drive, open the add-on in the side panel, pick a destination and press Clone. Large copies keep going on their own in the background, with progress and the option to cancel. There is nothing to install in the browser.
>
> Files whose owner disabled copying are skipped and listed at the end. Use it only with content you have the right to copy.
