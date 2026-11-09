# Nuevo diseño visual (estilo Spenza): guía para portarlo a la app móvil

La app web (Vue) cambió su identidad visual completa. Este documento describe ese diseño para replicarlo en la app Flutter (`restaurant-fronted-mobile`) sin tener que leer el código web.

**Alcance:** solo es visual. No cambia flujos, pantallas, textos, endpoints ni modelos de datos.

- **Referencia de inspiración:** [spenza.app](https://spenza.app/).
- **Fuente de la verdad en web:** `src/assets/main.css` (tokens y reglas globales).
- **Afecta a toda la app:** el comensal y el portal del dueño o del personal. Ya no existen dos paletas: la web antes tenía una para el comensal y el azul para el portal; ahora es una sola marca.

---

## 1. Idea general

En una frase: verde esmeralda brillante con azul petróleo, títulos geométricos muy gruesos, todo en píldora y fondos neutros limpios.

| Elemento | Cómo se ve |
| --- | --- |
| Acción principal | Relleno verde esmeralda `#00CA83` con texto azul petróleo `#0B3549` (no blanco). |
| Títulos | Poppins ExtraBold (800), azul petróleo `#155983`. A veces una palabra clave va en verde. |
| Bloques destacados | Fondo azul petróleo oscuro con texto blanco y acentos verdes. |
| Botones y chips | Forma de píldora (`StadiumBorder`). |
| Fondos | Blanco y gris muy claro, neutros y sin tinte verdoso. |
| Tarjetas | Muy redondeadas (24 px) y blancas sobre el fondo gris claro. |

---

## 2. Paleta de colores

Los nombres de token son los mismos que ya usa `AppColors` en Flutter (Material 3). Solo cambian los valores, y se agregan **6 tokens nuevos** (sección 2.3).

### 2.1 Tema claro

| Token | Valor | Notas |
| --- | --- | --- |
| background | `#F6F8F8` | |
| surface | `#F6F8F8` | |
| surfaceBright | `#F6F8F8` | |
| surfaceContainerLowest | `#FFFFFF` | Tarjetas |
| surfaceContainerLow | `#F0F3F3` | |
| surfaceContainer | `#E9EEEE` | Buscadores, botones secundarios |
| surfaceContainerHigh | `#E2E8E8` | |
| surfaceContainerHighest | `#DBE2E3` | |
| surfaceDim | `#D3DBDC` | |
| onSurface | `#0F2430` | Texto principal (casi negro azulado) |
| onSurfaceVariant | `#4A5C67` | Texto secundario |
| secondary | `#4F6170` | |
| secondaryContainer | `#DDE6E8` | |
| onSecondaryContainer | `#3C4D57` | |
| outline | `#6F7F86` | |
| outlineVariant | `#CDD6D8` | Bordes suaves y divisores |
| **primary** | `#00CA83` | Verde Spenza: **solo relleno** (ver 2.4) |
| primaryContainer | `#00B373` | Estado presionado o hover del botón principal |
| **onPrimary** | `#0B3549` | Texto sobre el verde: azul petróleo |
| onPrimaryContainer | `#0B3549` | |
| primaryFixed | `#D4F7E8` | Fondos suaves verdes (pastillas "Mesa 02", indicador de la barra inferior) |
| primaryFixedDim | `#7FE5BF` | |
| onPrimaryFixed | `#00573A` | Texto sobre `primaryFixed` |
| tertiary | `#9A5B00` | |
| tertiaryContainer | `#F5B74E` | |
| onTertiaryContainer | `#4A2C00` | |
| tertiaryFixed | `#FFE2B0` | |
| error | `#BA1A1A` | Sin cambios |
| onError | `#FFFFFF` | Sin cambios |
| errorContainer | `#FFDAD6` | Sin cambios |
| onErrorContainer | `#93000A` | Sin cambios |
| success | `#1B6B3A` | Sin cambios |
| onSuccess | `#FFFFFF` | Sin cambios |
| successContainer | `#D4F2DC` | Sin cambios |
| onSuccessContainer | `#0B3D1D` | Sin cambios |
| warning | `#8A5300` | Sin cambios |
| onWarning | `#FFFFFF` | Sin cambios |
| warningContainer | `#FFE3B8` | Sin cambios |
| onWarningContainer | `#4F2F00` | Sin cambios |

### 2.2 Tema oscuro

| Token | Valor | Notas |
| --- | --- | --- |
| background | `#0F171C` | Azul noche |
| surface | `#131C22` | |
| surfaceBright | `#2A3942` | |
| surfaceContainerLowest | `#172128` | Tarjetas |
| surfaceContainerLow | `#1C272E` | |
| surfaceContainer | `#223038` | |
| surfaceContainerHigh | `#2A3942` | |
| surfaceContainerHighest | `#34444E` | |
| surfaceDim | `#0F171C` | |
| onSurface | `#EAF2F5` | |
| onSurfaceVariant | `#BCCBD2` | |
| secondary | `#B9C8D2` | |
| secondaryContainer | `#2C3B44` | |
| onSecondaryContainer | `#D8E5EA` | |
| outline | `#87979F` | |
| outlineVariant | `#3C4B54` | |
| **primary** | `#00CA83` | El mismo verde que en el tema claro |
| primaryContainer | `#00B373` | |
| **onPrimary** | `#0B3549` | |
| onPrimaryContainer | `#0B3549` | |
| primaryFixed | `#0B3B2B` | |
| primaryFixedDim | `#00A56B` | |
| onPrimaryFixed | `#B5F3D9` | |
| tertiary | `#F2B95A` | |
| tertiaryContainer | `#8A5A10` | |
| onTertiaryContainer | `#FFDCA0` | |
| tertiaryFixed | `#5A3C00` | |
| error | `#FFB4AB` | Sin cambios |
| onError | `#690005` | Sin cambios |
| errorContainer | `#5C1110` | Sin cambios |
| onErrorContainer | `#FFDAD6` | Sin cambios |
| success | `#8EE0A8` | Sin cambios |
| onSuccess | `#00391A` | Sin cambios |
| successContainer | `#134D29` | Sin cambios |
| onSuccessContainer | `#C9F5D6` | Sin cambios |
| warning | `#FFC66D` | Sin cambios |
| onWarning | `#3A2400` | Sin cambios |
| warningContainer | `#5A3A00` | Sin cambios |
| onWarningContainer | `#FFE3B8` | Sin cambios |

### 2.3 Tokens nuevos

Hay que agregarlos a `AppColors`, incluidos `copyWith` y `lerp`.

| Token | Claro | Oscuro | Para qué |
| --- | --- | --- | --- |
| `primaryInk` | `#007A52` | `#00CA83` | Versión **legible** del verde: textos, enlaces, íconos, bordes y anillos de foco en verde. |
| `heading` | `#155983` | `#DCECF5` | Color de los títulos de página y de sección. |
| `headingAccent` | `#009E64` | `#00CA83` | La palabra destacada en verde dentro de un título. |
| `deep` | `#0B3549` | `#145A78` | Fondo de los bloques azul petróleo. |
| `onDeep` | `#FFFFFF` | `#FFFFFF` | Texto sobre `deep`. |
| `deepAccent` | `#00CA83` | `#7FF5C8` | Acento verde sobre `deep`: etiquetas y puntos de estado. |

### 2.4 Regla clave de contraste

El verde `#00CA83` **solo se usa como relleno**. Sobre blanco solo da un contraste de 2,15:1, así que no sirve como color de texto.

- Botón, FAB, contador o badge con fondo verde: usa `primary`, con texto o ícono en `onPrimary` (azul petróleo, 6,0:1).
- Texto, enlace, ícono suelto, borde de input enfocado, check o radio en verde: usa siempre `primaryInk`, nunca `primary`.
  - En Flutter, revisa los usos de `colors.primary` como `color:` de `Text` o `Icon`, y los de `focusedBorder`, `NavigationBar` (`labelTextStyle` e `iconTheme`) y `Checkbox`/`Radio` (`activeColor`/`fillColor`).
- Contrastes verificados (WCAG AA):

| Combinación | Contraste |
| --- | --- |
| `onPrimary` sobre `primary` | 6,04 |
| `primaryInk` sobre blanco | 5,38 |
| `primaryInk` sobre `background` | 5,04 |
| `heading` sobre `background` | 7,06 |
| `headingAccent` sobre `background` (solo para títulos grandes) | 3,24 |
| blanco sobre `deep` (claro) | 12,97 |
| blanco sobre `deep` (oscuro) | 7,6 |
| `deepAccent` sobre `deep` (claro) | 6,04 |
| `deepAccent` sobre `deep` (oscuro) | 5,72 |

---

## 3. Tipografía

- **Fuente:** Poppins para todo. Spenza usa Galano Grotesque, que es de pago; Poppins es la alternativa gratuita más parecida.
  - Hoy Flutter usa la fuente del sistema, así que hay que agregar Poppins con el paquete `google_fonts` (`GoogleFonts.poppinsTextTheme`) o como asset en `pubspec.yaml`, con los pesos 400, 500, 600, 700 y **800**.
- **Títulos de página y de sección:** peso **800**, `letterSpacing ≈ -0.025 × fontSize` (por ejemplo -0,7 en 28 px y -0,9 en 36 px) y color `heading`.
  - Título de página: 36 px (`text-4xl`) en las pantallas principales del comensal y 30 px en el portal.
  - Título de sección (categoría de la carta, "Restaurantes", "Recientes"): 20 px.
- **Título a dos tonos:** el título va en `heading` y una palabra clave en `headingAccent`. Se arma con `Text.rich` y dos `TextSpan`. Textos exactos:

| Pantalla | Título |
| --- | --- |
| Inicio del comensal | ¿Dónde comemos **hoy?** |
| Entrada por QR | ¿Estás en esta **mesa?** |
| Carrito | Tu **orden** |
| Carrito enviado | ¡Pedido **enviado!** |
| Seguimiento | Tu **pedido** |
| Cuenta | Tu **cuenta** |
| Resultado del checkout | ¡Pedido **confirmado!** |
| Landing para restaurantes | Tu restaurante conectado, **de la mesa a la cocina**. |

  La landing va sin cursiva.
- **Títulos sobre fondos oscuros o de color:** van en el color de ese bloque, por ejemplo `onDeep`, no en `heading`.
- **Marca en la barra superior:** el nombre de la app o del restaurante en peso 800 y color `heading`.

---

## 4. Formas y espaciado

| Elemento | Forma |
| --- | --- |
| Todos los botones (principal, secundario, contorno, texto con fondo) | **Píldora**: `StadiumBorder()`, alto mínimo 48 (o 44 en botones compactos). |
| Chips y filtros | Píldora. |
| Pestañas de categorías | Píldora (ver sección 5.3). |
| Buscadores | Píldora, relleno `surfaceContainer` y **sin borde**. |
| Tarjetas grandes (secciones, productos, restaurantes) | Radio 24. |
| Tarjetas de indicadores (KPI) y cajas internas | Radio 16. |
| Inputs de formulario | Radio 14 (sin cambios). |
| Logo de la app | Cuadrado verde con radio 12 y el ícono en `onPrimary`. |

Cambios concretos en `app_theme.dart`:

```dart
const buttonShape = StadiumBorder(); // antes: RoundedRectangleBorder(radius 14)
// cardTheme.shape → RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))
// focusedBorder → BorderSide(color: c.primaryInk, width: 2)
// navigationBarTheme: color seleccionado → c.primaryInk (indicador sigue en c.primaryFixed)
// headlineLarge/Medium/Small y titleLarge → Poppins w800, color c.heading, letterSpacing negativo
```

---

## 5. Componentes y pantallas

### 5.1 Comunes

- **Botón principal:**
  - relleno `primary`, texto `onPrimary` en peso 600 y píldora;
  - al presionarlo pasa a `primaryContainer`.
- **Botón secundario:** relleno `surfaceContainer`, texto `onSurface` y píldora.
- **Contadores o badges de cantidad** (carrito en la barra superior o inferior): círculo `primary` con número en `onPrimary` y un anillo del color de la superficie.
- **Barra inferior del comensal:** el ítem activo lleva texto e ícono en `primaryInk` sobre el indicador `primaryFixed`.

### 5.2 Comensal

**Inicio (elegir restaurante)**
- Saludo "Hola, {nombre} 👋" y debajo el título a dos tonos "¿Dónde comemos hoy?" (36 px, interlineado 1,05).
- Tarjeta **"Continuar en tu mesa"** como **bloque azul petróleo**:
  - fondo `deep`, radio 24 y sombra media;
  - etiqueta "CONTINUAR EN TU MESA" en mayúsculas, pequeña, con tracking y color `deepAccent`;
  - debajo "{Restaurante} · Mesa {n}" en `onDeep`, peso 700;
  - a la derecha, un círculo verde (`primary`) de 40 px con una flecha → en `onPrimary`.
- Filtros por tipo de local:
  - activo: chip píldora `primary`/`onPrimary`;
  - inactivos: blanco con borde `outlineVariant`.
- Títulos "Restaurantes" y "Recientes" con estilo de título de sección (800, 20 px, `heading`).
- Tarjetas de restaurante con radio 24 y botón "Ver carta" en píldora.

**Entrada por QR ("¿Estás en esta mesa?")**
- Título centrado a dos tonos en 30 px.
- "Sí, es mi mesa · ver la carta" es un botón principal píldora. "No es mi mesa" es un botón secundario píldora.

**Carta**
- Ficha del restaurante: nombre en 800 y `heading`.
- Buscador: píldora `surfaceContainer` sin borde.
- **Pestañas de categorías → píldoras:**
  - van en una fila con scroll horizontal, separación 8 y padding vertical 10;
  - activa: fondo `deep`, texto `onDeep` y sombra leve;
  - inactivas: fondo `surfaceContainerLowest`, texto `onSurfaceVariant` y borde `outlineVariant`;
  - ya **no** llevan subrayado.
- Encabezado de cada categoría: título de sección (800, 20 px, `heading`).
- Barra flotante **"Ver carrito"**:
  - píldora `primary` con texto `onPrimary`;
  - a la izquierda, el número de productos en un **círculo `deep`** con texto `onDeep`; en el centro "Ver carrito"; a la derecha, el total.
- El botón "Agregar" del detalle de producto también es píldora.

**Carrito, checkout y cuenta**
- Títulos a dos tonos ("Tu orden", "¡Pedido enviado!", "Tu cuenta", "¡Pedido confirmado!").
- Todos los botones en píldora.

**Seguimiento del pedido ("Tu pedido")**
- Título a dos tonos en 36 px.
- Tarjeta de estado **en preparación** como **bloque azul petróleo**:
  - fondo `deep`, texto `onDeep`, radio 24 y sombra;
  - el punto animado ("ping") a la izquierda va en `deepAccent`.
- Los otros estados no cambian: "listo" usa `successContainer` y "esperando" usa `surfaceContainer`.
- El tracker de 4 pasos sigue igual: círculos `primary` con ícono `onPrimary`, y `success` para "Listo".

### 5.3 Portal del dueño o del personal

- **Barra superior:**
  - logo cuadrado verde con radio 12;
  - "Restaurant-CMR" en 800 y `heading`;
  - el selector de sede ("● L'Étoile Atelier · Cambiar") en una píldora `surfaceContainerLow`.
- **Menú lateral (drawer):**
  - ítems en píldora con padding horizontal 16;
  - **ítem activo: fondo `deep` y texto/ícono `onDeep`**, con sombra leve;
  - inactivos: `onSurfaceVariant`, y `surfaceContainer` al presionar;
  - los badges rojos de pendientes (`error`/`onError`) no cambian.
- **Encabezados de página:** el título en 800 y `heading`. La miga de pan, la sede y la sección siguen en `onSurfaceVariant`.
- **Todos los botones de acción** van en píldora:
  - "+ Pedido manual", "Nueva sede", "Ir a gestión de pedidos";
  - "Confirmar →", "Marcar listo →" y "Marcar entregado →" en las tarjetas del tablero;
  - "Imprimir QR", "Pisos", "+ Mesa", los botones de los diálogos (Guardar o Cancelar) y los de inventario, roles, empleados y cierre del día.
- **Directorio de sedes:**
  - panel principal con radio 24;
  - KPIs con radio 16, sin borde y con fondo `surfaceContainerLow`;
  - barra de filtros con radio 24, chips de categoría en píldora (activo `primary`/`onPrimary`) y buscador en píldora;
  - tarjetas de sede con radio 24;
  - la etiqueta de tono "blue" de las sedes ahora usa `deep`/`onDeep`.
- **Gráficos (Finanzas y Métricas):** **no cambian.** Su paleta por series identifica cada sede.
- **Login y landing para restaurantes:**
  - botones en píldora;
  - el llamado final de la landing ("Lleva tu restaurante a RentaSol") es un bloque `deep` con texto `onDeep`: botón blanco con texto `deep` y botón con contorno blanco, ambos en píldora.

---

## 6. Checklist para Flutter

1. `lib/core/theme/app_colors.dart`:
   - reemplazar los valores `light`/`dark` por las tablas 2.1 y 2.2;
   - agregar los tokens nuevos (`primaryInk`, `heading`, `headingAccent`, `deep`, `onDeep`, `deepAccent`) al constructor y en `copyWith` y `lerp`;
   - actualizar el comentario de cabecera, que todavía dice "paleta verde salvia".
2. `lib/core/theme/app_theme.dart`:
   - Poppins como fuente;
   - títulos en w800 y `heading`;
   - `StadiumBorder` en todos los botones;
   - tarjetas con radio 24;
   - `focusedBorder` y `NavigationBar` en `primaryInk`.
3. `pubspec.yaml`: agregar `google_fonts`, o Poppins como asset con el peso 800.
4. Buscar los usos de `colors.primary` como **color de texto o ícono** y cambiarlos por `colors.primaryInk`.
5. Widgets base:
   - `base_button.dart` en píldora;
   - `page_header.dart` con título 800 y `heading`, y opción de palabra destacada;
   - `status_badge.dart` sin cambios.
6. Pantallas del comensal:
   - títulos a dos tonos (tabla de la sección 3);
   - bloque `deep` en "Continuar en tu mesa" y en el estado "en preparación";
   - pestañas de la carta en píldora con la activa en `deep`;
   - contador `deep` en la barra "Ver carrito".
7. Portal (`portal_shell.dart` y drawer):
   - ítem activo en `deep`;
   - botones en píldora;
   - directorio de sedes con radios 24/16.
8. Verificar en claro y oscuro que ningún texto verde use `primary` directamente.
