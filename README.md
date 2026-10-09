# Clonar en Drive

Clona archivos o carpetas de Google Drive eligiendo destino, nombre y permisos. Hay dos versiones con la misma lógica:

- **Extensión de Chrome** (raíz del repo): Manifest V3, sin backend ni dependencias. Sin límite de tiempo y con avance en vivo; es la mejor opción para carpetas grandes.
- **Complemento de Google Workspace** (`addon/`): Apps Script. Funciona en cualquier navegador, dentro de la barra derecha de Drive, pero copia por tramos (ver más abajo).

Página del producto y política de privacidad: <https://arendondiosa.github.io/google-drive-ext/> (carpeta `docs/`, publicada con GitHub Pages desde la rama `main`).

# Extensión de Chrome

## Configuración (una vez)

1. Abre `chrome://extensions`, activa **Modo de desarrollador**, **Cargar descomprimida** y elige esta carpeta. Copia el **ID** de la extensión.
2. En [Google Cloud Console](https://console.cloud.google.com/): crea un proyecto y habilita **Google Drive API**.
3. Configura la pantalla de consentimiento OAuth (tipo *Externo*), agrega el scope `https://www.googleapis.com/auth/drive` y tu cuenta como usuario de prueba.
4. Crea credenciales → **ID de cliente de OAuth** → tipo **Extensión de Chrome**, con el ID del paso 1.
5. Pega el client ID en `manifest.json` (`oauth2.client_id`) y recarga la extensión.

## Uso

Abre Drive, haz clic en el ícono de la extensión y en el panel lateral:

1. **Origen**: selecciona ítems en Drive y pulsa *Usar selección de Drive*, o pega un link.
2. **Destino**: navega hasta la carpeta (queda marcada la última de las migas) o pega su link.
3. **Nombre**: editable cuando clonas un solo ítem.
4. **Permisos**: heredar los del destino, conservar los originales o definir nuevos.

Mantén el panel abierto hasta que termine: si se cierra, la copia se detiene.

Notas sobre *Conservar los originales*: quien clona pasa a ser dueño de la copia y el dueño original queda como editor; no se envían correos de notificación.

## Tests

```sh
npm test
```

Cubren la lógica de las dos versiones contra un Drive simulado (`fake-drive.js`); la interfaz de ambas se prueba a mano.

## Publicar en la Chrome Web Store

- **Versiones**: se manejan desde los releases de GitHub. Publica un release con una etiqueta de la forma `v1.2.3` y el workflow `.github/workflows/release.yml` corre los tests, pone esa versión en el manifest y adjunta `clonar-en-drive-v1.2.3.zip` al release; ese es el archivo que se sube a la tienda. La `version` de `manifest.json` en el repo es solo para desarrollo.
- **Client ID de la tienda**: guárdalo como variable del repositorio `STORE_OAUTH_CLIENT_ID` (Settings → Secrets and variables → Actions → Variables) y el workflow lo pone en el zip, sin tocar el de desarrollo.
- `npm run zip` arma el mismo paquete en local (`dist/extension.zip`), con la versión y el client ID que haya en el repo.
- Los textos para los formularios (justificación de permisos, descripciones) están en `STORE.md`.
- El ID de la extensión publicada es distinto al de la carga descomprimida: sube primero un borrador para conocerlo y crea con él un segundo client OAuth tipo *Extensión de Chrome*; ese es el `STORE_OAUTH_CLIENT_ID`.
- El scope `drive` es **restringido**: para salir del modo Testing (máx. 100 usuarios) Google exige verificación de la app: dominio verificado, página de inicio, política de privacidad (`docs/privacy.md`), justificación del scope y video de demostración. La extensión no tiene servidor, lo que normalmente la exime de la auditoría de seguridad CASA; confírmalo en el formulario de verificación.
- En la ficha de la Store: propósito único, justificación de `identity`, `sidePanel`, `scripting` y del acceso a `drive.google.com`, y declaración de uso de datos (*Limited Use*).

# Complemento de Google Workspace

## Instalarlo para probar

1. Abre [script.google.com](https://script.google.com) y crea un **Proyecto nuevo**.
2. En **Configuración del proyecto** (engranaje), marca **Mostrar el archivo de manifiesto "appsscript.json" en el editor**.
3. En el editor, reemplaza el contenido de `Código.gs` por el de `addon/Code.js`, y el de `appsscript.json` por el de `addon/appsscript.json`. Guarda.
4. **Implementar → Probar implementaciones → Instalar**.
5. Abre o recarga Drive: el ícono aparece en la barra derecha. Selecciona un archivo o carpeta, ábrelo y autoriza marcando todos los permisos.

Con [clasp](https://github.com/google/clasp) se puede subir sin copiar y pegar: `clasp create --type standalone --rootDir addon` y luego `clasp push`.

## Cómo copia

Apps Script limita cada clic a unos 30 segundos, así que la copia avanza por tramos y guarda dónde quedó:

- Primero cuenta los archivos del origen; después muestra el avance como `57/240 (23 %)` y el archivo en curso.
- Al terminar cada tramo programa el siguiente en segundo plano (un activador de Apps Script), así la copia sigue sola aunque cierres Drive. La tarjeta no puede refrescarse sola: **Actualizar** muestra el avance.
- Si Google no permite programarlo, la tarjeta lo dice y muestra **Continuar**, que copia un tramo por clic.
- Si el segundo plano lleva varios minutos sin avanzar (los activadores tienen un tope diario de tiempo), **Actualizar** copia un tramo y lo vuelve a programar.
- Si se acaba la cuota (espacio o límite diario de 750 GB), se detiene; **Continuar** retoma desde ahí cuando haya cuota.

Solo hay una copia en curso por usuario. Si la carpeta de origen cambia mientras se copia, puede quedar algún ítem sin copiar: volver a clonar con **Retomar** lo completa.

## Publicar en Workspace Marketplace

Los textos para la ficha y la verificación están en `STORE.md`. Requiere pasar el proyecto de Apps Script a un proyecto estándar de Google Cloud, configurar ahí el **Google Workspace Marketplace SDK** y la misma verificación del scope `drive` que la extensión (puede ser el mismo proyecto de Cloud).
