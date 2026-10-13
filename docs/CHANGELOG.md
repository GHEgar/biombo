# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y versionado con
[SemVer](https://semver.org/lang/es/).

## [No publicado]

## [0.6.0] - 2026-10-13

Superficies efímeras: lo que modales, tooltips e InfoBox resolvían a mano en las apps del IIEG.

### Agregado

- `useFocusTrap`: trampa de foco con pila global (solo atiende la de arriba), lista de enfocables
  recalculada en cada Tab, contenedor enfocable si está vacío, recuperación del foco que escapa
  (`contain: 'strict'`), `inert` en el resto de la página (`inertOthers`) y foco devuelto al cerrar.
- `useScrollLock` y `lockScroll`: bloqueo del scroll de `body` con contador y compensación de la barra.
- `useDismissOutside`: descarte por presión fuera, solo si empezó y terminó fuera, solo la superficie
  de arriba; `getDismissProps` cuenta como dentro a los hijos en portal.
- `placeAnchored` (core) y `useAnchoredPosition`: posición junto a un elemento, un rect o un punto,
  con volteo, acotado al viewport o al área útil, `maxHeight`/`maxWidth` si no cabe, flecha, y
  seguimiento en scroll, resize y cambios de tamaño.
- `Portal`, SSR-seguro. `react-dom` pasa a peer opcional.
- `containRect` (core) y `contain: 'full'` con `containMargin` en `PanelConfig`: el flotante queda
  completo dentro del viewport.
- `useDraggable`: arrastre de cualquier elemento con contención, suelto o sobre una superficie anclada.
- `useDismissGesture`: deslizar para descartar con bloqueo de eje, umbral y variables CSS
  `--biombo-swipe` y `--biombo-swipe-progress`; solo táctil por defecto.
- `mergeRefs` y `focusableIn`.
- Demo: modal anidado, tooltips en las esquinas y en una lista con scroll, e InfoBox anclado al clic
  con tarjetas deslizables.

### Cambiado

- `manager.clampRect(rect, id?)` respeta el modo de contención del panel.
- El arrastre de `getHandleProps` comparte su seguimiento del puntero con `useDraggable` y
  `useDismissGesture`.

### Cambiado

- El lint usa `@ghegar/eslint-config` (presets `base`, `react` y `ts`) en lugar de una config propia.

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
