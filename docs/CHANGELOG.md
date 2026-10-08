# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

## [No publicado]

### Agregado

- Gestor headless de paneles (`createManager`): registro, grupos `free`/`single`, z-order por
  bandas con nombre, foco, minimizar, maximizar, acople y tamaño acoplado como estado.
- Pila de Escape con prioridades (`mode`, `surface`, `menu`, `modal`): una Esc cierra solo la capa
  de arriba y no llega a los listeners de la app.
- Persistencia versionada con adaptador de storage, migraciones y campos configurables.
- Evento único `onEvent` para analytics.
- Capa React: `BiomboProvider`, `usePanel` con `getWindowProps`, `useEscape` y `useGlobalMode`.
- Acople en los cuatro bordes con política por borde (`replace`, `stack`, `tabs`): arriba y abajo
  ocupan el ancho y los lados el alto restante; el área útil se publica en `snapshot.area` y en
  `onAreaChange`.
- Viewport (`setViewport`): al cambiar se vuelven a acotar las ventanas flotantes y los tamaños
  acoplados.
- Ventanas flotantes con `defaultSize`, centradas en el área útil y en cascada; maximizar llena el
  área útil.
- Arrastre (`getHandleProps`) con umbral, imán a bordes permitidos (`snapAt`, `useSnapPreview`) y
  desacople al arrastrar un panel acoplado (`undockOnDrag`).
- Tirador (`getResizerProps`) para el tamaño acoplado y para redimensionar flotantes desde lados y
  esquinas.
- Cambios transitorios (`{ transient: true }`) que no persisten ni emiten evento.
- Hooks `useArea`, `useSnapPreview`, `useEdge` y `useViewport`.
- Demo en Vite y pruebas e2e con Playwright.
