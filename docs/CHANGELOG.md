# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

## [No publicado]

## [0.5.0] - 2026-10-08

Cambios que pidió la migración de mapalab.

### Agregado

- `useEscape` funciona sin provider con una pila global, y `useOptionalManager` para adaptadores.
- Grupos de obstáculos: `useObstacle(ref, { group })` y `groups` en `useClearance` y `useCovered`.
- `useCovered` e `isCovered`: si un elemento queda tapado por un panel visible o un obstáculo.
- `snapshot.interaction` y `useInteraction()`: el arrastre o el tirador en curso, para apagar
  transiciones mientras dura.

### Cambiado

- `useObstacle` mide en cada render y en cada cambio del gestor: un obstáculo que se mueve sin cambiar
  de tamaño ya no queda con un rectángulo viejo.
- `useObstacle`, `useClearance` y `useCovered` no truenan sin provider.

### Corregido

- Un panel que arranca abierto (persistido o por `initial`) se coloca con su `defaultSize` al
  registrarse o al llegar el viewport, igual que con `open()`.

## [0.4.0] - 2026-10-08

Primera versión empaquetada. No está en npm: mapalab la consume vendorizada mientras llega la 1.0.

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
- Modo compacto (`compactBreakpoint`, 768 por defecto): no hay acople ni área reservada y cada panel
  se presenta como `sheet`, `fullscreen` o `inline` según su `compact`. Estado `presentation` en cada
  panel, `snapshot.compact` y hook `useCompact`.
- Holgura: `clearance()` en el core y los hooks `useClearance` y `useObstacle`; un elemento esquiva
  los paneles visibles y los obstáculos registrados que tenga cerca de su borde, encadenándolos.
- F6 y Mayús+F6 recorren los paneles visibles y les dan foco (`manager.cycle`, `cycleKey`).
- Pestañas: `useTabs({ group } | { edge })` con roles ARIA, flechas, Inicio y Fin, y reordenamiento
  arrastrando. Con `onReorder` el orden es controlado por el consumidor; sin él, biombo lo guarda con
  `setGroupOrder` o `setEdgeOrder`. Estado `snapshot.groups` y evento `reorder`.
- `serialize()` y `hydrate()` para sincronizar el estado con un store externo.

### Corregido

- Un panel cerrado seguía tapando la página cuando el consumidor le ponía `display`: ahora lleva
  `display: none` además de `hidden`.
