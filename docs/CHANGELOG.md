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
