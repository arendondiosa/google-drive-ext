# Textos para publicar

Textos listos para pegar en los formularios de Google. Las justificaciones van en inglés porque las leen revisores de Google; las descripciones de la ficha van en los dos idiomas.

## 0. Direcciones

| Campo | URL |
|---|---|
| Página principal | `https://rendon.co/google-drive-ext/` |
| Política de privacidad | `https://rendon.co/google-drive-ext/privacy.html` |
| Términos del servicio | `https://rendon.co/google-drive-ext/terms.html` |
| Ayuda / soporte | `https://rendon.co/google-drive-ext/guia.html` (español) · `https://rendon.co/google-drive-ext/guide.html` (inglés) |
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

### Descripción — español

> Clona archivos y carpetas completas de Google Drive, eligiendo dónde va la copia, con qué nombre y con qué permisos.
>
> • Carpetas enteras, con todas sus subcarpetas, incluidas las que otros compartieron contigo.
> • Destino a elección: Mi unidad, cualquier subcarpeta o una unidad compartida.
> • Permisos a elección: heredar los del destino, conservar los del original o definir nuevos.
> • Avance en vivo, con opción de cancelar y de retomar una copia incompleta.
>
> Funciona desde un panel junto a Drive: selecciona los archivos, elige destino y pulsa Clonar. No tiene servidores propios: tu navegador habla directamente con Google Drive.

### Descripción — inglés

> Clone Google Drive files and whole folders, choosing where the copy goes, its name and its permissions.
>
> • Entire folders with all their subfolders, including those others shared with you.
> • Destination of your choice: My Drive, any subfolder or a shared drive.
> • Permissions of your choice: inherit from the destination, keep the original ones or set new ones.
> • Live progress, with the option to cancel and to resume an incomplete copy.
>
> It works from a panel next to Drive: select the files, pick a destination and press Clone. There are no servers of our own: your browser talks directly to Google Drive.

## 3. Google Workspace Marketplace

### Descripción corta (máx. 200 caracteres)

- **es**: Clona archivos y carpetas completas de Drive eligiendo destino, nombre y permisos. Funciona en la barra lateral de Drive, en cualquier navegador.
- **en**: Clone Drive files and whole folders choosing destination, name and permissions. Works in the Drive side panel, in any browser.

### Descripción detallada — español

> Clona archivos y carpetas completas de Google Drive desde la barra lateral, sin instalar nada en el navegador.
>
> • Carpetas enteras, con todas sus subcarpetas, incluidas las que otros compartieron contigo.
> • Destino a elección: Mi unidad, cualquier subcarpeta o una unidad compartida.
> • Permisos a elección: heredar los del destino, conservar los del original o definir nuevos.
> • Las copias grandes continúan solas en segundo plano, con avance y opción de cancelar.
>
> Selecciona los archivos en Drive, abre el complemento, elige destino y pulsa Clonar.

### Descripción detallada — inglés

> Clone Google Drive files and whole folders from the side panel, with nothing to install in the browser.
>
> • Entire folders with all their subfolders, including those others shared with you.
> • Destination of your choice: My Drive, any subfolder or a shared drive.
> • Permissions of your choice: inherit from the destination, keep the original ones or set new ones.
> • Large copies keep going on their own in the background, with progress and the option to cancel.
>
> Select the files in Drive, open the add-on, pick a destination and press Clone.
