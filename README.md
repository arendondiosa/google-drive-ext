# Clonar en Drive

Clona archivos o carpetas de Google Drive eligiendo destino, nombre y permisos. Existe como extensión de Chrome (raíz del repo) y como complemento de Google Workspace (`addon/`).

- **Guía de uso**: <https://google-drive-ext.rendon.co/> ([English](https://google-drive-ext.rendon.co/en/))
- **Documentación para desarrolladores** (instalar desde el código, tests, publicar): <https://google-drive-ext.rendon.co/dev/> · fuente en [`docs/dev.md`](docs/dev.md)
- **Textos para las tiendas y la verificación de Google**: [`STORE.md`](STORE.md)

```sh
npm test      # lógica de las dos versiones contra un Drive simulado
npm run zip   # dist/extension.zip, el paquete de la extensión
```

El sitio es la carpeta `docs/`, publicada con GitHub Pages por el workflow `.github/workflows/pages.yml` (Settings → Pages → Source: **GitHub Actions**). Google Analytics se activa definiendo la variable del repositorio `GOOGLE_TAG_ID` con el ID de medición `G-XXXXXXXXXX` (Settings → Secrets and variables → Actions → Variables); sin ella el sitio se publica sin analíticas.
