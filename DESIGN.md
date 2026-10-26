# Diseño actual de Reportes

Este documento describe la experiencia implementada actualmente en el módulo de reportes del frontend. Es una referencia del estado presente, no una especificación de funcionalidades futuras.

## Alcance y rutas

- `/erp/reports/consolidated` es la vista integral y la entrada principal a reportes. El parámetro `view` permite abrir vistas temáticas: `consolidated`, `customers`, `suppliers`, `treasury`, `hr`, `documents` e `inventory`.
- `/erp/reports/management` es el reporte gerencial comercial/financiero.
- `/erp/reports/builder` contiene el diseñador de reportes. Su disponibilidad en navegación puede variar; no es parte del flujo principal descrito abajo.
- Tesorería, ventas y RR. HH. también tienen reportes específicos bajo sus respectivas áreas. Este documento se enfoca en las dos pantallas generales anteriores.

Las pantallas generales requieren autenticación y el middleware de acceso a reportes gerenciales.

## Mapa de vistas del consolidado

La pantalla se entiende como una secuencia vertical con dos zonas: **preparar** y **leer el resultado**. Las secciones principales conservan separación propia incluso cuando el resultado aparece condicionalmente.

```text
┌─ Encabezado de página ─────────────────────────────────────────────┐
│ Título + descripción                                               │
└───────────────────────────────────────────────────────────────────┘
┌─ Prepará tu reporte ───────────────────────────────────────────────┐
│ Contador de empresas                                               │
│ 1. Empresas                                                       │
│    [Empresa] [Empresa] [Empresa]    Seleccionar/Quitar todas       │
│ 2. Período                                                        │
│    [Desde]                         [Hasta]                         │
│ Vista de resultados                                                │
│    [Juntas] [Por empresa]                                          │
│ Resumen de selección                         [Generar reporte]      │
└───────────────────────────────────────────────────────────────────┘
┌─ Resultado ────────────────────────────────────────────────────────┐
│ Cantidad de empresas + período                 [Descargar ▾]       │
│ [Tabla] [Gráficos] [Resumen]                                      │
│ Área: [General] [Clientes] [Proveedores] [Tesorería] ...          │
│ Contexto breve del modo/área activa                               │
│ Tabla tipo planilla / gráfico comparativo / resumen ejecutivo       │
└───────────────────────────────────────────────────────────────────┘
```

El espacio vertical entre bloques debe resolverse con un wrapper DOM real (`flex flex-col gap-*`) cuando el contenido provenga de slots o templates condicionales. No depender sólo de `space-y-*` aplicado a `UPage` para separar fragmentos. Dentro de cada bloque, usar el `gap` del grid o wrapper correspondiente.

### Configuración: distribución por ancho

| Elemento | Móvil | Escritorio |
|---|---|---|
| Tarjetas de empresa | Una columna, tile compacto de ancho completo | Dos columnas en tablet y hasta cuatro en escritorio |
| Selector de fechas | Desde y Hasta apilados | Campos compactos en la misma fila |
| Vista de resultados | Botones ocupan el ancho disponible | Botones agrupados junto a su descripción |
| Acción principal | Botón ancho completo al final | Botón alineado a la derecha, junto al resumen de selección |

La tarjeta de empresa completa es un target seleccionable. Checkbox, nombre, subdominio y rol quedan juntos; selección visual además del checkbox. El botón **Seleccionar todas/Quitar todas** pertenece al encabezado de la sección de empresas, no al pie del formulario.

### Resultado: modos de visualización y distribución

- **Antes de generar:** mostrar únicamente la configuración; el botón principal indica cuándo falta una empresa o hay un período inválido.
- **Durante la generación inicial:** mostrar skeletons en la zona del resultado, manteniendo la configuración visible.
- **Con resultado:** mostrar primero período/alcance y **Descargar**, luego las pestañas y el contenido activo.
- **Al actualizar criterios:** descartar el resultado anterior para evitar confundir datos viejos con los nuevos.
- **Exportación:** el menú **Descargar** agrupa PDF, Excel (.xlsx) y CSV; no ocupar la barra con tres botones persistentes.

El selector principal organiza cuatro vistas: **Hoja de cálculo** es la predeterminada; **Gráficos**, **Tablas** y **Resumen** son vistas independientes. Las áreas temáticas se conservan como segundo nivel sólo en Tablas. En móvil, las pestañas pueden desplazarse horizontalmente sin comprimir sus etiquetas.

| Modo principal | Contenido y navegación |
|---|---|
| **Hoja de cálculo** (predeterminada) | Comparativo global de sólo lectura con indicadores en filas y empresas en columnas, una moneda por fila. Grilla `AsteriskTable` con líneas entre celdas, encabezado fijo, búsqueda, filtros, orden y scroll horizontal; conserva la apariencia de planilla sin permitir alterar datos provenientes de la consulta. |
| **Gráficos** | Dashboard con comparación del indicador seleccionado por empresa, composición por empresa y totales globales por indicador. Métrica y moneda seleccionables; cada visualización conserva la separación de monedas. |
| **Tablas** | Detalle por áreas temáticas en `AsteriskTable`, con búsqueda, filtros y orden; General no se duplica aquí porque su comparativo está en Hoja de cálculo y Resumen. |
| **Resumen** | Vista integral independiente del área activa: KPIs globales, comparativo por empresa, alertas y lectura ejecutiva, más todas las tablas disponibles de todas las áreas. En modo Juntas combina filas e identifica empresa; en Por empresa agrupa todas las secciones dentro de cada empresa. |

En **Hoja de cálculo**, se prioriza una grilla legible como planilla: encabezados de columnas, valores de consulta no editables, total por fila, controles de búsqueda/filtro/orden y scroll horizontal contenido en la tabla. La presentación no altera los datos consultados ni la fuente del reporte.

| Área temática | Orden del contenido en Tablas |
|---|---|
| **Hoja de cálculo** | Comparativo global por empresa con indicadores y moneda |
| **Resumen** | KPIs globales → criterio del reporte → comparativo por empresa → alertas y lectura ejecutiva → todas las tablas de todas las áreas (combinadas o agrupadas por empresa) |
| **Clientes** | Partes interesadas/cuentas corrientes → cobros por cliente → cuentas con saldo (en Tablas) |
| **Proveedores** | Partes interesadas/cuentas corrientes → pagos y gastos → saldos y obligaciones |
| **Tesorería** | Bancos y cajas → estados de pago/cobro y cheques → movimientos, transferencias y variación |
| **Personal** | Empleados/socios → movimientos y pendientes de vales/retiros |
| **Documentos** | Documentos comerciales agrupados por circuito, categoría y estado |
| **Inventario** | Documentos por artículo → movimientos de stock |

En **Resumen**, la grilla de KPIs pasa de una columna en móvil a dos en ancho mediano y tres en escritorio. En **Gráficos**, el gráfico ocupa el ancho disponible; los selectores (cuando aplican) permanecen junto al título. La Hoja de cálculo y las tablas anchas conservan overflow horizontal; no se deben convertir en tarjetas truncadas que oculten columnas clave.

### Juntas y por empresa

```text
Juntas                         Por empresa
Una tabla por tema              Una tarjeta por empresa
Empresa identificada por color  Alertas y tablas dentro del bloque
Comparación entre compañías     Lectura aislada de cada compañía
```

El selector **Juntas / Por empresa** permanece en la configuración, antes de generar. La elección modifica la composición de las tablas, no las empresas ni el período consultado. Los gráficos conservan una comparación conjunta entre las empresas seleccionadas.

## Reporte gerencial: mapa de vista

La ruta `/erp/reports/management` usa una distribución de análisis en una sola página:

```text
┌─ Encabezado: Reporte gerencial             [Actualizar reporte] ──┐
├─ Base del reporte: [Órdenes] [Facturas] [Cobros]                 ┤
│ Período | Agrupar | Estado de cobro | Moneda                      │
│ Filtros comerciales: cliente, vendedor, producto, punto de venta… │
├─ KPIs: Total | Cobrado | Pendiente | Monedas                      ┤
├─ Evolución (gráfico ancho)       | Composición por moneda         ┤
├─ Rendimiento comercial: productos / vendedores                    ┤
└─ Tabla de detalle                                                   ┘
```

- La selección de base ocupa el primer plano porque define qué significa cada monto; no mezclar órdenes, facturas y cobros.
- Los filtros están antes de los resultados y se agrupan por alcance: período/base y filtros comerciales.
- En pantallas estrechas, los pares de gráficos y los KPIs se apilan; en pantallas amplias usan grillas de dos o cuatro columnas según el bloque.
- Durante una primera carga se muestran placeholders; durante una actualización se conserva el resultado con un indicador superpuesto.
- Los gráficos resumen patrones; la tabla inferior permite buscar/filtrar los registros subyacentes.

## Componentes y reglas de composición

- Mantener componentes Nuxt UI existentes (`UPage`, `UPageCard`, `UButton`, `UFormField`, `UAlert`) y los tokens semánticos del tema. El color comunica selección, estado o prioridad, pero no reemplaza títulos, etiquetas o estructura.
- Las tablas de datos usan `AsteriskTable`, con filtros, orden y búsqueda adecuados a cada colección.
- Una card debe agrupar un tema o decisión; evitar cards anidadas sin una función clara.
- Dar aire entre cards con `gap` en el contenedor; usar padding interno para separar contenido del borde. No aplicar márgenes distintos a cada card para compensar un contenedor sin separación.
- Conservar overflow horizontal para tablas y pestañas cuando sea necesario, sin permitir que eso cree scroll horizontal en toda la página.

## Reporte consolidado

### Configuración

La página empieza con una tarjeta **Prepará tu reporte** que agrupa cuatro decisiones:

1. **Empresas:** lista de empresas asociadas al usuario, con nombre, subdominio y rol. Las empresas se seleccionan individualmente y también hay acción para seleccionar/quitar todas. El contador muestra seleccionadas sobre disponibles.
2. **Período:** campos **Desde** y **Hasta**; por defecto abarcan desde el primer día del mes actual hasta hoy.
3. **Vista de resultados:** selector entre **Juntas** (filas de todas las empresas combinadas por tema) y **Por empresa** (bloques separados por empresa).
4. **Generar reporte:** botón principal al pie de la configuración. Se deshabilita si no hay empresas seleccionadas o si la fecha inicial es posterior a la final. La selección o el cambio de fechas invalida el resultado anterior.

Al generarlo, la vista inicial es **Hoja de cálculo**. El selector superior organiza cuatro vistas: Hoja de cálculo (comparativo general tipo Excel), **Gráficos**, **Tablas** y **Resumen**. Gráficos conserva el selector de áreas incluyendo General; Tablas presenta las áreas de detalle sin duplicar el comparativo general.

La configuración debe ocupar poco alto y dejar espacio visible para el resultado. Mantener tiles de empresa compactos en una grilla responsiva, controles de fecha medianos y paneles de período/modalidad con padding reducido; conservar el contador, la acción de seleccionar todas y el botón principal claramente visibles.

### Resultado y navegación temática

Cuando hay resultados, el encabezado muestra número de empresas y período. **Descargar** abre un menú con **PDF**, **Excel (.xlsx)** y **CSV**.

En **Tablas**, el resultado se divide en pestañas por área:

| Pestaña | Contenido principal |
|---|---|
| Clientes | Clientes, cobros por cliente y saldos a cobrar |
| Proveedores | Proveedores, pagos/gastos, saldos a pagar y obligaciones |
| Tesorería | Bancos, cajas, cheques, transferencias, movimientos y variaciones |
| Personal | Empleados, socios y vales/retiros |
| Documentos | Documentos de compra y venta agrupados por tipo/estado |
| Inventario | Órdenes de venta por artículo y movimientos de stock |

Cada pestaña muestra sólo los bloques pertinentes; cambiar de pestaña no vuelve a generar el informe. El aviso de criterio explica que las métricas operativas corresponden al período y que algunos saldos son actuales. Las monedas no se mezclan en una misma suma.

En **Juntas**, las tablas combinan empresas y usan distintivos de color para indicar de cuál es cada fila. En **Por empresa**, cada bloque conserva el nombre de la empresa y el contenido de esa pestaña. Las tablas permiten filtrar, buscar y ordenar sin descargar todos los temas a la vez.

### Estados de interacción

- **Inicial/carga:** se cargan las empresas disponibles; por defecto se seleccionan todas cuando termina esa carga.
- **Configuración incompleta:** se informa si falta seleccionar una empresa o si el rango de fechas es inválido; el botón principal permanece deshabilitado.
- **Generando:** el botón muestra actividad y se presenta el estado de carga.
- **Resultado listo:** aparece el resumen de alcance, selector de exportación, pestañas y contenido.
- **Error:** se presenta una notificación cuando no se pueden cargar empresas, generar el informe o exportarlo.
- **Sin empresas disponibles:** alerta dentro de la configuración con indicación de que el usuario no tiene empresas asociadas.

## Reporte gerencial

La ruta `/erp/reports/management` ofrece análisis de una base por vez para evitar sumar órdenes de venta, facturas y cobros como si fueran lo mismo.

### Filtros

- **Base:** Órdenes de venta, Facturas o Cobros; se elige como selector visual de tarjetas.
- **Período**, **Agrupar** (mes, día, cliente, vendedor o moneda), **Estado de cobro** y **Moneda**.
- **Filtros comerciales:** cliente, vendedor (para órdenes), producto, punto de venta, estado de facturación y estado de entrega (para órdenes). Las listas de clientes/productos/puntos de venta son buscables.
- Los filtros actualizan el informe automáticamente con una espera breve para agrupar cambios; **Actualizar reporte** permite pedirlo manualmente.

### Presentación de resultados

- KPIs de total, cobrado, pendiente y desglose por moneda.
- Aviso cuando hay movimientos sin cotización histórica.
- Gráfico de evolución y composición por moneda.
- Cuando la respuesta contiene rendimiento comercial, se muestran rankings/gráficos de productos, rendimiento por vendedor y tablas detalladas.
- Los valores convertidos se presentan en ARS, y el desglose original por moneda permanece visible para evitar ocultar diferencias.

La carga inicial usa skeletons. Durante una actualización se conserva el último resultado con estado visual de carga para indicar que se está refrescando.

## Mantenimiento de esta referencia

Al cambiar la estructura, la distribución responsive, las vistas, los filtros, la navegación temática, los formatos de descarga o los estados de estas pantallas, actualizar este archivo junto con la implementación. La documentación operativa para usuarios permanece en `asterisksuite-docs/src/content/docs/procesos/reportes/`.
