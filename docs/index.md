# Clonar en Drive

[English](en.md)

Clona archivos y carpetas completas de Google Drive, eligiendo dónde va la copia, con qué nombre y con qué permisos. Esta página explica cómo usarlo.

- **Carpetas enteras**, con todas sus subcarpetas, incluidas las que otros compartieron contigo.
- **Destino a elección**: Mi unidad, cualquier subcarpeta o una unidad compartida.
- **Permisos a elección**: heredar los del destino, conservar los del original o definir nuevos.
- **Avance visible**, con opción de cancelar y de retomar una copia incompleta.

## Dos formas de usarlo

Las opciones son las mismas en las dos; cambia dónde aparecen y cómo se ve el avance.

| | Extensión de Chrome | Complemento de Google Workspace |
|---|---|---|
| Dónde funciona | Chrome de escritorio | Cualquier navegador, en la barra lateral de Drive |
| Copias grandes | Sin límite de tiempo, avance en vivo | Continúan solas en segundo plano |
| Instalación | [Descargar la última versión](https://github.com/arendondiosa/google-drive-ext/releases/latest) | Próximamente en Google Workspace Marketplace |

## Abrirlo

- **Extensión de Chrome**: abre Google Drive y haz clic en el ícono de Clonar en Drive, en la barra lateral derecha de Drive o en la barra de extensiones de Chrome. Se abre un panel junto a Drive.
- **Complemento**: selecciona en Drive lo que quieres clonar y haz clic en el ícono de Clonar en Drive en la barra lateral derecha.

La primera vez Google pide autorización para acceder a tu Drive. Marca todos los permisos: sin ellos la copia no puede completarse.

## 1. Origen: qué se clona

- Selecciona en Drive uno o varios archivos o carpetas. En la extensión, pulsa **Usar selección de Drive**; el complemento los toma solo.
- En la extensión también puedes pegar el link de un archivo o carpeta.
- Si eliges un acceso directo, se clona el archivo o la carpeta real al que apunta. Es el caso habitual de las carpetas que otros compartieron contigo.

## 2. Destino: dónde queda la copia

- Navega por las carpetas hasta la que quieras: el destino es la última que aparece en la ruta.
- Puedes elegir Mi unidad, cualquier subcarpeta o una unidad compartida.
- También puedes pegar el link de la carpeta de destino.

## 3. Nombre

Si clonas un solo ítem puedes cambiarle el nombre. Si clonas varios, cada copia conserva el nombre original.

## 4. Permisos

| Opción | Qué hace |
|---|---|
| **Heredar los del destino** | No agrega a nadie. La copia queda con el acceso de la carpeta donde la pones; en una carpeta privada, solo tú la ves. |
| **Conservar los originales** | La copia queda compartida con las mismas personas que el original. No se envían correos de aviso. |
| **Definir nuevos** | Escribes los correos y el rol (lector, comentador o editor), y decides si se les avisa por correo. Se aplican a la copia principal y su contenido los hereda. |

En Mi unidad, quien clona es siempre el propietario de la copia. Con *Conservar los originales*, el propietario del original queda como editor.

## 5. Clonar y seguir el avance

- **Extensión**: primero cuenta los archivos y luego muestra una barra con el avance exacto y el archivo en curso. Mantén el panel abierto hasta que termine.
- **Complemento**: muestra el avance como `57/240 (23 %)`. Las copias largas continúan solas en segundo plano, aunque cierres Drive; pulsa **Actualizar** para ver cómo van. Mientras el segundo plano arranca, el botón dice **Continuar** y cada clic adelanta un tramo. Solo puede haber una copia en curso a la vez.

Al terminar aparece un enlace para abrir la copia y, si los hubo, la lista de archivos omitidos o con error.

## Cancelar y retomar

- **Cancelar** detiene la copia. Lo que ya se copió queda en el destino.
- **Retomar** sirve para completar una copia que quedó a medias: márcalo y clona de nuevo con el mismo destino y el mismo nombre. Reutiliza las carpetas que ya existen y solo copia los archivos que faltan. Compara por nombre; no detecta si un archivo cambió por dentro.

## Preguntas frecuentes

**¿Se descargan mis archivos?**
No. La copia la hace Google dentro de Drive; nada pasa por tu equipo ni por servidores nuestros.

**¿La copia ocupa espacio?**
Sí, cada copia cuenta en tu almacenamiento como cualquier archivo tuyo.

**¿Por qué se detuvo con un aviso de cuota?**
Drive permite copiar hasta 750 GB por día, y rechaza copias si tu almacenamiento está lleno. Cuando vuelva a haber cuota, usa *Retomar* (o *Continuar* en el complemento) y sigue donde quedó.

**¿Por qué se omitieron algunos archivos?**
Sus dueños desactivaron la opción de copiar para lectores y comentadores. Aparecen en la lista de omitidos.

**¿Qué pasa con los accesos directos que hay dentro de una carpeta?**
Se recrean como accesos directos al mismo destino; no se clona aquello a lo que apuntan.

**¿Se copian los comentarios y el historial de versiones?**
No. Se copia el contenido actual de cada archivo.

**¿Qué pasa si la carpeta original cambia mientras se copia?**
Puede quedar algún archivo sin copiar. Al terminar, vuelve a clonar con *Retomar* para completarla.

## Por qué pide acceso a Google Drive

Para clonar una carpeta hay que leer todo su contenido, crear las copias en el destino y, si lo pides, leer y repetir sus permisos. Ese es el único uso que se le da al acceso: no hay servidores propios, no se descargan tus archivos y no se comparte ningún dato. Los detalles están en la [política de privacidad](privacy.md).

## Ayuda

[Reportar un problema](https://github.com/arendondiosa/google-drive-ext/issues) · arendondiosa@gmail.com

[Política de privacidad](privacy.md) · [Términos del servicio](terms.md) · [Para desarrolladores](dev.md)
