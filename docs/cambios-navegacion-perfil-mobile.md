# Dos cambios de navegación para portar a la app móvil

Estos dos cambios ya están hechos en la app web (Vue) y hay que replicarlos en la app Flutter (`restaurant-fronted-mobile`). Ninguno cambia endpoints, modelos ni stores: solo cambia qué se muestra.

| # | Cambio | Archivo en web | Archivo en Flutter |
| --- | --- | --- | --- |
| 1 | "Carrito" siempre visible en la barra inferior | `src/components/navigation/DinerBottomNav.vue` | `lib/layouts/customer_shell.dart` |
| 2 | El menú de perfil muestra un solo tipo de cuenta | `src/components/navigation/ProfileMenu.vue` | `lib/widgets/navigation/profile_menu.dart` |

---

## 1. "Carrito" siempre visible en la barra inferior del comensal

### Problema

Al entrar sin mesa y con el carrito vacío, la barra inferior solo tenía **Carta** y **Perfil/Ingresar**. "Carrito" aparecía solo si el comensal ya estaba en una mesa o tenía productos.

### Comportamiento nuevo

"Carrito" se muestra **siempre**, como segundo botón.

| Situación | Barra inferior |
| --- | --- |
| Sin mesa y sin pedido | Carta · Carrito · Perfil (o Ingresar) |
| Con un pedido abierto en la mesa | Carta · Carrito · Mi pedido · Cuenta · Perfil (o Ingresar) |

- Con el carrito vacío, la pantalla del carrito muestra su estado vacío ("Tu carrito está vacío" y un botón para ir a la carta). No hace falta crear nada nuevo.
- El contador con la cantidad sobre el ícono no cambia: solo aparece cuando hay productos.

### En Flutter

En `_navItems` de `lib/layouts/customer_shell.dart`, quitar la condición que envuelve al ítem "Carrito":

```dart
// Antes
if (diner.isReadyToOrder || cart.itemCount > 0)
  _NavItem(
    label: 'Carrito',
    ...
  ),

// Después: siempre visible; sin productos, la pantalla del carrito muestra su estado vacío.
_NavItem(
  label: 'Carrito',
  to: Routes.cart,
  icon: Icons.shopping_bag_outlined,
  selectedIcon: Icons.shopping_bag_rounded,
  badge: cart.itemCount,
  matches: (path) => path == Routes.cart,
),
```

Hay que comprobar que la ruta del carrito no tenga un `redirect` que exija mesa. En web no lo tiene.

---

## 2. El menú de perfil muestra un solo tipo de cuenta

### Problema

En el mismo dispositivo pueden coexistir una sesión de **cliente** (`DinerStore.customer`) y otra de **dueño o personal** (`SessionStore`). El menú del ícono de perfil del área del comensal mostraba:

- las **dos secciones a la vez** ("Cliente" y "Restaurante") cuando había ambas sesiones;
- un acceso a la otra cuenta ("Ingresar como cliente" en Flutter, "Iniciar sesión con otra cuenta" en web).

### Comportamiento nuevo

El menú muestra **un solo tipo de cuenta**:

| Sesiones activas | Qué muestra el menú |
| --- | --- |
| Ninguna | Igual que antes: "Bienvenido a RentaSol", Iniciar sesión, Crear cuenta y "¿Tienes un restaurante?" |
| Solo cliente | **Solo cliente:** nombre, Mi perfil, Mis visitas y Cerrar sesión |
| Solo dueño o personal | **Solo restaurante:** nombre, Mi perfil (del personal), Ir al portal y Cerrar sesión del portal |
| Ambas | **Solo cliente**, porque estamos en el área del comensal |

Además:

- **Se elimina** el acceso a la otra cuenta ("Ingresar como cliente"). Para entrar con otra cuenta se usa la pantalla de acceso o "Ingresar" en la barra inferior.
- **Las iniciales del avatar** del ícono corresponden a la cuenta que se muestra. Con las dos sesiones activas son las del cliente.
- El menú del **portal del dueño** no cambia: ya mostraba solo datos del dueño.

### En Flutter

En `lib/widgets/navigation/profile_menu.dart`:

1. Calcular una sola vez qué cuenta se muestra. Se puede hacer como un helper dentro del archivo, porque se usa en `build` y en la hoja:

```dart
enum _MenuAccount { customer, staff }

/// Solo un tipo de cuenta a la vez. Si hay sesión de cliente y de personal,
/// en el área del comensal manda la del cliente.
_MenuAccount? _accountFor(DinerStore diner, SessionStore session) {
  if (diner.customer != null) return _MenuAccount.customer;
  return session.isAuthenticated ? _MenuAccount.staff : null;
}
```

2. En `build`, que el nombre del avatar salga de esa cuenta:

```dart
final account = _accountFor(diner, session);
final name = switch (account) {
  _MenuAccount.customer => diner.customer?.name,
  _MenuAccount.staff => session.user?.name,
  null => null,
};
```

3. En la hoja (`showModalBottomSheet`):
   - reemplazar `hasAny` por `final account = _accountFor(diner, session);`;
   - el bloque de bienvenida pasa de `if (!hasAny)` a `if (account == null)`;
   - el bloque "Cliente" pasa de `if (diner.customer != null)` a `if (account == _MenuAccount.customer)`;
   - el bloque "Restaurante" pasa de `if (session.isAuthenticated)` a `if (account == _MenuAccount.staff)`;
   - **eliminar** el bloque final `if (hasAny && diner.customer == null)` con su `Divider` y su `ListTile` "Ingresar como cliente".
4. Actualizar el comentario de la clase, que hoy dice "(un cliente, alguien del personal, ambos o nadie)", para indicar que muestra una sola cuenta.

---

## Cómo verificarlo

1. Sin sesión y sin mesa: la barra inferior muestra Carta · Carrito · Ingresar. Tocar Carrito lleva a la pantalla con el estado de carrito vacío.
2. Con productos en el carrito: Carrito muestra el contador.
3. Con sesión solo de cliente: el menú de perfil muestra solo opciones de cliente.
4. Con sesión solo de dueño (iniciar sesión en el portal y volver al área del comensal): el menú muestra solo datos del restaurante.
5. Con ambas sesiones: el menú muestra solo el cliente y el avatar tiene sus iniciales.
6. Revisar en tema claro y oscuro.
