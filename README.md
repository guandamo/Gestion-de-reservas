# 🏟️ Gestión de Reservas de Canchas

Aplicación web para administrar canchas deportivas, consultar disponibilidad, reservar turnos y gestionar pagos mediante Mercado Pago.

El sistema reúne dos experiencias:

- **Usuario:** consulta disponibilidad, reserva y gestiona sus propias operaciones.
- **Administrador:** supervisa reservas, administra canchas y usuarios, y consulta reportes.
---

## 📑 Contenido

1. Objetivo del sistema
2. Tecnologías utilizadas
3. Arquitectura y organización
4. Roles y funcionalidades
5. Funcionamiento de la aplicación
6. Estados y reglas de negocio
7. Modelo de datos
8. Autenticación, seguridad y auditoría

    
---

## 🎯 1. Objetivo del sistema

La aplicación busca centralizar la gestión de un complejo deportivo y facilitar la relación entre disponibilidad, reservas y pagos.

Una organización manual puede generar problemas como:

- Reservas superpuestas.
- Horarios desactualizados.
- Dificultades para identificar qué reservas están pagadas.
- Turnos bloqueados por operaciones que no se completaron.
- Falta de información para supervisar la actividad.

El sistema permite que los clientes consulten horarios y reserven, mientras el administrador mantiene el control de la operación.

### Conceptos principales

| Concepto | Descripción |
|---|---|
| **Cancha** | Espacio deportivo que puede reservarse, con tipo, precio y horario de funcionamiento. |
| **Turno** | Fecha y horario concreto de una cancha. |
| **Reserva** | Relación entre una cuenta y un turno seleccionado. |
| **Pago** | Operación económica asociada a una reserva. |

> Una reserva y un pago son conceptos diferentes. Puede existir una reserva pendiente sin un cobro confirmado, y cancelar una reserva no implica devolver automáticamente el dinero.

---

## 🛠️ 2. Tecnologías utilizadas

### Frontend

El frontend es la parte que se muestra en el navegador y con la que interactúa la persona.

| Tecnología | Uso en el proyecto |
|---|---|
| **React 19** | Construcción de pantallas mediante componentes reutilizables y actualización de la interfaz según su estado. |
| **React Router 7** | Navegación entre pantallas y organización de las vistas de cada rol. |
| **Tailwind CSS 3** | Estilos, distribución de elementos y adaptación a distintos tamaños de pantalla. |
| **Vite 8** | Entorno de desarrollo y compilación del frontend para su publicación. |
| **Fetch** | Comunicación con la API del backend. |
| **Context de React** | Administración y acceso compartido al estado de la sesión. |
| **SVG** | Iconos escalables integrados localmente en la aplicación. |

### Backend

El backend recibe las solicitudes del navegador, comprueba permisos y aplica las reglas del sistema.

| Tecnología | Uso en el proyecto |
|---|---|
| **Node.js** | Ejecución del código del servidor. |
| **Express 5** | Organización de la API y procesamiento de solicitudes y respuestas. |
| **Prisma 7** | Consulta y modificación de datos mediante modelos definidos en el proyecto. |
| **Adaptador PostgreSQL** | Conexión entre Prisma y la base de datos. |
| **JWT** | Representación de la sesión para validar solicitudes autenticadas. |
| **bcrypt** | Generación y comparación de hashes de contraseñas. |
| **SDK de Mercado Pago** | Integración del checkout y consultas relacionadas con los pagos. |
| **PDFKit** | Generación de reportes descargables en PDF. |
| **Helmet** | Incorporación de cabeceras de protección. |
| **CORS** | Control de los orígenes que pueden comunicarse con la API desde el navegador. |
| **Morgan** | Registro de solicitudes para facilitar el seguimiento y diagnóstico. |

Estas herramientas acompañan la seguridad, pero no reemplazan las validaciones de permisos y reglas de negocio implementadas en el backend.

### Base de datos

- **PostgreSQL:** almacena usuarios, canchas, turnos, reservas, pagos y auditoría.
- **Supabase:** aloja la base de datos utilizada por el proyecto.

La autenticación de esta aplicación está implementada en el backend propio con JWT y bcrypt.

### Trabajo colaborativo

- **Git:** control de versiones y trabajo mediante ramas.
- **GitHub:** publicación del código, colaboración y revisión mediante Pull Requests.

---

## 🧩 3. Arquitectura y organización

La aplicación está dividida en tres partes principales:

| Parte | Responsabilidad |
|---|---|
| **Frontend** | Presentar información y permitir que la persona realice acciones. |
| **Backend** | Validar solicitudes, controlar permisos y ejecutar reglas de negocio. |
| **Base de datos** | Conservar la información y las relaciones entre los registros. |

### Recorrido de una operación

```text
Persona
   ↓
Pantalla de la aplicación
   ↓
Solicitud a la API
   ↓
Autenticación y validaciones
   ↓
Servicio con reglas de negocio
   ↓
Base de datos
   ↓
Respuesta y actualización de la pantalla
```

En las operaciones de pago se agrega la comunicación entre el backend y Mercado Pago.

### Organización por responsabilidades

| Capa | Función |
|---|---|
| **Páginas y componentes** | Pantallas, botones, formularios, modales y presentación de información. |
| **Cliente HTTP** | Comunicación del frontend con el backend. |
| **Contexto de autenticación** | Estado de sesión y datos de la cuenta autenticada. |
| **Rutas** | Organización de las operaciones disponibles en la API. |
| **Middlewares** | Autenticación, autorización y manejo de errores. |
| **Controladores** | Interpretación de solicitudes y construcción de respuestas. |
| **Servicios** | Reglas de negocio y coordinación de operaciones. |
| **Modelos y migraciones** | Descripción de los datos e historial de cambios de estructura. |
| **Trabajos programados** | Revisión de reservas vencidas y regeneración de turnos. |

Esta separación permite modificar una pantalla sin trasladar las decisiones de seguridad al navegador.

---

## 👥 4. Roles y funcionalidades

### 👤 Usuario

La cuenta de usuario permite:

- Registrarse e iniciar sesión.
- Mostrar u ocultar la contraseña en el login.
- Consultar canchas, precios y horarios.
- Revisar disponibilidad.
- Seleccionar y reservar un turno.
- Acceder al checkout de Mercado Pago.
- Consultar sus reservas y estados.
- Retomar un pago pendiente mientras siga vigente.
- Cancelar reservas cuando las reglas lo permiten.
- Modificar los datos editables de su perfil.
- Cambiar su contraseña desde el perfil.
- Cerrar sesión desde el menú de la cuenta.

### 🛡️ Administrador

La cuenta administrativa permite:

- Consultar el calendario de disponibilidad.
- Revisar y gestionar reservas.
- Filtrar reservas por estado y período.
- Crear y editar canchas.
- Gestionar tipos de cancha.
- Definir horarios y precios.
- Desactivar canchas mediante baja lógica.
- Consultar y gestionar cuentas.
- Buscar usuarios por distintos datos, incluido el teléfono.
- Suspender o reactivar usuarios.
- Consultar reportes.
- Exportar reportes a PDF.
- Gestionar su propio perfil.

### Control de permisos

Cada rol tiene una navegación diferente, pero la protección no depende únicamente de lo que muestra la pantalla.

El backend comprueba:

- Que exista una sesión válida.
- Que el rol permita realizar la operación.
- Que la reserva pertenezca a quien intenta consultarla o modificarla, cuando corresponde.

---

## 📅 5. Funcionamiento de la aplicación

### 5.1. Registro

El formulario solicita los datos identificatorios y de contacto de la persona, una contraseña y su confirmación.

El teléfono es obligatorio para las nuevas cuentas y no puede estar asociado a otra cuenta.

Las validaciones se realizan tanto en el frontend como en el backend.

En el teléfono:

- Se comprueba el formato y la longitud admitida.
- Se aceptan separadores habituales al escribirlo.
- Se normaliza el valor antes de almacenarlo.
- No se verifica que el número exista realmente.

> El registro crea cuentas reales, pero el modal del código de correo todavía es simulado. No debe interpretarse como una verificación real del acceso a ese correo.

### 5.2. Inicio de sesión

La persona ingresa con su correo y contraseña.

El backend verifica las credenciales y el estado de la cuenta. Si son correctos, inicia la sesión y el frontend muestra el panel correspondiente al rol.

Una cuenta suspendida no puede iniciar sesión normalmente.

El botón del ojo permite mostrar u ocultar la contraseña escrita. Por defecto permanece oculta.

### 5.3. Selección de cancha

El usuario elige una cancha y consulta:

- Tipo de cancha.
- Precio del turno.
- Horario de funcionamiento.
- Fechas y horarios disponibles.
- Turnos pendientes de pago o reservados.

La disponibilidad se obtiene del servidor y puede cambiar mientras la persona navega.

### 5.4. Selección del turno

Al elegir un horario se presenta una confirmación con los datos de la operación.

Antes de crear la reserva, el backend vuelve a comprobar que:

- El turno exista.
- La cancha esté activa.
- La fecha esté dentro del rango admitido.
- El turno no haya comenzado.
- No haya otra reserva activa sobre ese turno.

Esta comprobación evita confiar únicamente en una pantalla que pudo quedar desactualizada.

### 5.5. Creación de la reserva

La reserva se crea inicialmente como **Pendiente**.

Al mismo tiempo, el turno se marca como **Reservado**, apartándolo para esa operación.

La toma del turno y la creación de la reserva se realizan dentro de una transacción para evitar que quede aplicada solo una parte.

### 5.6. Pago con Mercado Pago

La aplicación solicita al backend una preferencia de pago y abre el checkout externo.

El importe se obtiene de los datos del servidor, no de un precio enviado libremente por el navegador.

Los datos del medio de pago se introducen en Mercado Pago. La aplicación no almacena los datos de la tarjeta.

Volver del checkout no acredita por sí solo un cobro. El backend consulta el resultado real antes de confirmar la reserva.

### 5.7. Mis reservas

Esta pantalla permite consultar las operaciones propias y sus estados.

El listado se ordena por el momento en que se creó la reserva:

- La última reserva realizada aparece primero.
- No necesariamente aparece primero el turno más próximo.

Cuando una reserva está pendiente y vigente, muestra:

- Una cuenta regresiva.
- La opción **Pagar**.
- Las acciones que correspondan según sus reglas.

Reintentar el pago no extiende el vencimiento original.

### 5.8. Perfil

Desde **Mi perfil** pueden editarse:

- Nombre.
- Apellido.

Se muestran como datos de solo lectura:

- Correo electrónico.
- Teléfono.

La restricción se aplica en la pantalla y en el backend, tanto para usuarios como para administradores.

El teléfono se carga al registrarse. Las cuentas antiguas que no lo tengan requieren un procedimiento de corrección que todavía debe definirse.

### 5.9. Cambio de contraseña

El cambio desde el perfil es una operación real.

Solicita:

- Contraseña actual.
- Nueva contraseña.
- Confirmación de la nueva contraseña.

El backend comprueba que la contraseña actual sea correcta, que la nueva cumpla los requisitos y que no sea igual a la anterior.

### 5.10. Cierre de sesión

La opción **Cerrar sesión** está dentro del menú de la cuenta.

- En computadora se abre al tocar el avatar o pasar el cursor por el avatar o el texto de la cuenta.
- En móvil se abre al tocar el avatar dentro del menú lateral.

---

## ⚖️ 6. Estados y reglas de negocio

### Estados principales

| Elemento | Estado | Significado |
|---|---|---|
| **Turno** | Disponible | Puede tomarse para una reserva. |
| **Turno** | Reservado | Está ocupado por una reserva activa, pendiente o confirmada. |
| **Reserva** | Pendiente | Se creó y espera completar el pago. |
| **Reserva** | Confirmada | El servidor confirmó el pago asociado. |
| **Reserva** | Cancelada | Se canceló manualmente o venció. |
| **Pago** | Pendiente | Todavía no se registró como pagado. |
| **Pago** | Pagado | Se confirmó el cobro. |

### ⏱️ Tiempo para pagar

Por defecto, una reserva pendiente tiene **3 minutos de vigencia**.

Un trabajo periódico del backend revisa las reservas vencidas aproximadamente cada **30 segundos** y libera los turnos cuando corresponde.

Consideraciones:

- El reloj de la pantalla es informativo.
- La decisión final pertenece al backend.
- Cerrar la pestaña no prolonga el plazo.
- Un reintento de pago no reinicia el tiempo.
- La liberación puede ocurrir en la pasada posterior al vencimiento.

Si el backend está detenido o suspendido por el alojamiento, el trabajo no se ejecuta. Al arrancar realiza una revisión inmediata.

### 🔒 Prevención de reservas duplicadas

El backend vuelve a leer el turno y exige que continúe disponible.

Si dos personas intentan reservarlo al mismo tiempo, una puede recibir un mensaje indicando que debe elegir otro horario.

Esto es una protección del sistema frente a solicitudes simultáneas.

### 💳 Confirmación del pago

El backend puede conocer el resultado mediante:

- Una notificación de Mercado Pago.
- Una consulta al proveedor cuando la persona vuelve del checkout.

La información recibida desde el navegador no basta para acreditar un pago.

La aplicación busca evitar que las notificaciones repetidas confirmen dos veces la misma operación.

Los pagos tardíos o recibidos después de una cancelación requieren seguimiento y no recuperan automáticamente el turno.

### ❌ Cancelaciones

- El usuario puede cancelar una reserva propia pendiente y no pagada, con al menos **24 horas de anticipación**.
- El usuario no puede cancelar una reserva pagada mediante el flujo actual.
- El administrador puede cancelar reservas pendientes o confirmadas antes del inicio del turno.
- Cancelar una reserva confirmada no ejecuta una devolución automática.

La cancelación administrativa actual no muestra el cuadro nativo de confirmación antes de actuar. Por eso debe revisarse cuidadosamente la reserva seleccionada.

### 🗓️ Generación de disponibilidad

Se generan turnos de una hora para un horizonte de 30 días y se regeneran periódicamente.

El rango admitido de consulta y reserva llega hasta el mismo día del mes siguiente.

Ese límite de calendario no siempre equivale a 30 días exactos. La disponibilidad efectiva depende de los turnos generados.

### 📊 Interpretación de reportes

Los indicadores no representan necesariamente lo mismo:

- **Ingresos del mes:** utiliza pagos registrados como pagados.
- **Resumen económico de Reservas:** suma precios de reservas no canceladas, incluidas las pendientes.
- **Reservas confirmadas hoy:** cuenta reservas creadas hoy que se encuentran confirmadas dentro del período consultado.
- **Ocupación:** refleja turnos reservados, que pueden incluir operaciones pendientes.

Por lo tanto, no debe confundirse ocupación, importe de reservas y dinero efectivamente cobrado.

---

## 🗃️ 7. Modelo de datos

| Entidad | Propósito |
|---|---|
| **Usuario** | Cuenta, datos personales, rol y estado. |
| **Tipo de cancha** | Clasificación de los espacios deportivos. |
| **Cancha** | Espacio deportivo, horario, precio y estado activo. |
| **Turno** | Fecha y horario de una cancha. |
| **Reserva** | Asociación entre una cuenta y un turno. |
| **Pago** | Información económica vinculada a una reserva. |
| **Auditoría** | Historial de operaciones relevantes. |

### Relaciones principales

```text
Tipo de cancha
      ↓
    Cancha
      ↓
    Turno
      ↓
   Reserva ← Usuario
      ↓
     Pago
```

La auditoría registra acciones relevantes sobre estas entidades.

La conservación del historial permite mantener el contexto aunque cambien estados o se desactiven recursos.

---

## 🔐 8. Autenticación, seguridad y auditoría

### Autenticación

El inicio de sesión comprueba:

1. Los datos de acceso.
2. La existencia de la cuenta.
3. Su estado activo.
4. La coincidencia de la contraseña mediante bcrypt.

La sesión utiliza un token con vigencia limitada, actualmente de una hora.

El frontend conserva la información de sesión en el navegador y el backend valida las solicitudes protegidas.

Cerrar sesión elimina los datos locales de la cuenta. No equivale a revocar automáticamente todas las copias de un token ya emitido.

### Protección de operaciones

Las acciones sensibles se validan en el backend.

Esto incluye:

- Permisos administrativos.
- Acceso a reservas propias.
- Disponibilidad del turno.
- Estado y vigencia de la reserva.
- Restricciones de edición del perfil.
- Validación del cambio de contraseña.

### Auditoría

El sistema utiliza dos niveles:

**Nivel 1: última modificación**

Determinadas entidades conservan información sobre su creación, modificación y última operación.

**Nivel 2: historial global**

Se registran operaciones relevantes para identificar:

- Qué ocurrió.
- Sobre qué registro.
- Cuándo ocurrió.
- Quién realizó la acción, cuando corresponde.

El servicio excluye campos sensibles conocidos. Las operaciones también deben evitar enviar secretos al historial.

---

