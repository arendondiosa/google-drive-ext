# Clonar en Drive

Clona archivos o carpetas de Google Drive eligiendo destino, nombre y permisos. Existe como extensión de Chrome (raíz del repo) y como complemento de Google Workspace (`addon/`).

- **Guía de uso**: <https://rendon.co/google-drive-ext/> ([English](https://rendon.co/google-drive-ext/en/))
- **Documentación para desarrolladores** (instalar desde el código, tests, publicar): <https://rendon.co/google-drive-ext/dev/> · fuente en [`docs/dev.md`](docs/dev.md)
- **Textos para las tiendas y la verificación de Google**: [`STORE.md`](STORE.md)

```sh
npm test      # lógica de las dos versiones contra un Drive simulado
npm run zip   # dist/extension.zip, el paquete de la extensión
```

El sitio es la carpeta `docs/`, publicada con GitHub Pages (Settings → Pages → rama `main`, carpeta `/docs`).
