# To-Do List móvil — Evaluación Sumativa, Unidad 1

**Asignatura:** Desarrollo Móvil  
**Estudiante:** Ailyne Amador

Aplicación móvil para crear, listar, consultar, editar y eliminar tareas. La app está desarrollada con Expo y React Native; una API REST en Express guarda los datos en PostgreSQL.

## Tecnologías

| Área | Tecnología | Uso |
|---|---|---|
| App móvil | Expo SDK 57, React Native 0.86.3, React 19 y TypeScript estricto | Desarrollo de la interfaz para Android y web. |
| Navegación | Expo Router | Define las pantallas mediante archivos dentro de `mobile/app/`. |
| Componentes visuales | React Native Paper 5 | Campos, botones, diálogos, indicadores y tema de la interfaz. |
| Formularios | React Hook Form, Zod y `@hookform/resolvers` | Gestiona el formulario y valida título y descripción. |
| Datos locales | `expo-sqlite` | Guarda tareas, fotos y estado de sincronización en el teléfono. |
| Sincronización | TanStack Query 5 + cola manual | Lee/escribe primero en SQLite; sincroniza con la API cuando hay red. |
| Conexión | `@react-native-community/netinfo` | Dispara la sincronización al volver la red. |
| API | Node.js, Express 5 y TypeScript | Expone autenticación, CRUD y gestión de fotos. |
| Acceso a datos | Prisma 7 con `@prisma/adapter-pg` | Consulta PostgreSQL y aplica migraciones versionadas. |
| Base de datos | PostgreSQL 16 en Docker Compose | Persiste usuarios, refresh tokens y tareas en un volumen nombrado. |
| Autenticación | Argon2id + JWT | Hash de contraseñas en servidor; access token (15 min) y refresh token rotatorio (7 d). |
| Fotos | `expo-image-picker` + `expo-file-system` + `multer` | Toma fotos, las guarda localmente y las sincroniza con el servidor. |
| Ubicación | `expo-location` + BigDataCloud | Obtiene coordenadas y resuelve la ciudad sin clave de API. |
| Pruebas | `jest-expo` + RNTL en `mobile/`; `vitest` + Supertest en `server/` | Verifican componentes, hooks, servicios y endpoints. |
| Calidad | ESLint y Prettier | Revisa y mantiene el formato del código. |
| Control de versiones | Git | Registra los cambios del proyecto. |

Las versiones completas y los rangos de dependencias están en `mobile/package.json`, `mobile/package-lock.json`, `server/package.json` y `server/package-lock.json`.

## Requisitos previos

Versiones del entorno usadas durante el desarrollo; son una referencia reproducible, no una declaración de versiones mínimas:

| Herramienta | Versión usada |
|---|---:|
| Node.js | 24.20.0 |
| npm | 11.19.0 |
| Git | 2.53.0 |
| Docker Engine | 29.7.2 |
| Docker Compose | 5.5.1 |
| Expo Go | Versión compatible con Expo SDK 57 |

También se necesita un teléfono con Expo Go o un emulador Android. El computador y el teléfono deben estar en la misma red Wi-Fi cuando se pruebe por LAN. Para usar la versión web no hace falta Expo Go.

## Instalación y ejecución

Los siguientes pasos parten de una copia limpia del repositorio. No existe un paquete npm en la raíz: instala las dependencias por separado en `server/` y `mobile/`.

### 1. Obtener el proyecto y crear los archivos de entorno

Clona el repositorio o descomprime su ZIP y abre una terminal en la carpeta raíz, donde está `docker-compose.yml`.

En PowerShell, copia los ejemplos:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item mobile/.env.example mobile/.env.local
```

En macOS, Linux o Git Bash, el equivalente es:

```bash
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env.local
```

Los archivos `.env` y `.env.local` son locales y están excluidos de Git. No publiques contraseñas ni los archivos locales; conserva los `.env.example` como plantillas.

### 2. Configurar la URL que usará la app

Edita `mobile/.env.local`. El ejemplo trae `192.168.1.58`, que corresponde a una IP local de desarrollo y puede no ser la de tu computador. Usa la dirección según dónde abras la app:

| Destino de la app | Valor de `EXPO_PUBLIC_API_URL` |
|---|---|
| Teléfono físico con Expo Go | `http://<IPv4-del-computador>:3000` |
| Emulador Android | `http://10.0.2.2:3000` |
| Navegador web en el mismo computador | `http://localhost:3000` |

En Windows puedes encontrar la IPv4 con `ipconfig`; el teléfono y el computador deben estar en la misma Wi-Fi. Si el firewall de Windows pregunta, permite el acceso de Node.js en la red privada. `localhost` desde un teléfono apunta al propio teléfono, no al computador.

`EXPO_PUBLIC_API_URL` se incluye en el bundle de la app: solo debe contener la URL pública de la API, nunca credenciales. Si la cambias con Expo en ejecución, detén Metro con `Ctrl+C` y vuelve a iniciar Expo para cargarla.

### 3. Configurar variables de entorno del servidor

Copia `server/.env.example` a `server/.env` y completa al menos:

- `DATABASE_URL`: debe apuntar a la base PostgreSQL de Compose (por defecto `postgresql://eva1:eva1_dev@localhost:5433/tasks?schema=public`).
- `JWT_SECRET`: secreto aleatorio de **al menos 32 caracteres**. La API se niega a arrancar si falta o es corto.
- `JWT_ACCESS_EXPIRES_IN`: duración del access token (por ejemplo `15m`).
- `JWT_REFRESH_EXPIRES_IN`: duración del refresh token (por ejemplo `7d`).

Estos valores son solo para desarrollo local.

### 4. Permisos de la app

Los plugins de Expo solicitan permisos en tiempo de ejecución. En `app.json` ya están configurados los mensajes en español:

- **Cámara** (`expo-image-picker`): necesario para tomar fotos. En web la cámara puede no estar disponible; el teléfono físico es el mejor entorno para probar fotos.
- **Ubicación** (`expo-location`): necesario para añadir la ciudad a una tarea. El permiso solo se pide si el usuario activa **Añadir ubicación**; si se deniega, la tarea se guarda sin ubicación.

Para probar cámara y GPS se recomienda un teléfono físico con Expo Go; el emulador puede no tener cámara real y la ubicación simulada varía según el entorno.

### 5. Levantar PostgreSQL

Desde la raíz del proyecto:

```bash
docker compose up -d
docker compose ps
```

Espera a que el servicio `db` aparezca como `healthy`. La configuración está en `docker-compose.yml`:

- Imagen `postgres:16`.
- Base de datos `tasks`.
- Usuario `eva1` y contraseña de desarrollo `eva1_dev`.
- Puerto del contenedor `5432`, publicado solo en el computador como `127.0.0.1:5433`.
- Volumen nombrado `pgdata`, que conserva los datos al detener o recrear el contenedor.

El servidor usa la misma conexión por defecto en `server/.env.example`:

```text
postgresql://eva1:eva1_dev@localhost:5433/tasks?schema=public
```

Si el puerto local `5433` está ocupado, crea un archivo `.env` en la raíz con, por ejemplo, `POSTGRES_PORT=5434`; luego cambia `5433` por `5434` en `server/.env`. Si cambias el usuario, contraseña o nombre de la base en el `.env` raíz, actualiza también `DATABASE_URL` para que coincida. Estos valores son solo para desarrollo local.

### 6. Instalar y arrancar la API

Abre una terminal en `server/`:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

`npm ci` instala las versiones fijadas por el lockfile. `prisma generate` genera el cliente desde `prisma/schema.prisma`; `migrate deploy` aplica las migraciones pendientes. El proceso `npm run dev` deja la API escuchando en `http://localhost:3000` (puerto predeterminado).

Deja esa terminal abierta. En otra terminal, comprueba el estado del servidor desde el computador:

```text
http://localhost:3000/health
```

La respuesta esperada es `{"status":"ok"}`. La API también puede consultarse con `Invoke-RestMethod http://localhost:3000/health` en PowerShell.

### 7. Instalar y arrancar la app

Abre otra terminal en `mobile/`:

```bash
npm ci
npx expo start
```

Para abrirla en un teléfono, instala Expo Go compatible con SDK 57, escanea el QR que muestra Metro y permite que el teléfono acceda a la red local. Para abrirla en el navegador del computador, usa el script incluido:

```bash
npm run web
```

La app guarda las tareas primero en SQLite y las sincroniza con la API cuando hay red. Para comprobar el CRUD, crea una tarea, confirma que el formulario se vacía y la tarea aparece en la lista; edítala y elimínala. Prueba a desconectar la red, crear una tarea, cerrar la app y volver a abrirla: la tarea debe seguir ahí.

### 8. Detener los procesos

Detén Expo y la API con `Ctrl+C` en sus respectivas terminales. Para detener PostgreSQL sin borrar los datos:

```bash
docker compose stop
```

El volumen `pgdata` se conserva. No uses `docker compose down -v` si quieres mantener la base de datos.

## Estructura del proyecto

```text
.
├── docker-compose.yml               # PostgreSQL y volumen pgdata
├── README.md                         # Instrucciones de instalación y uso
├── documentacion.md                  # Guía técnica para agentes de IA
├── plan movil.md                     # Plan y registro de las fases
├── docs/
│   └── images/                       # Capturas de la aplicación
├── mobile/                           # App Expo + React Native
│   ├── app/
│   │   ├── _layout.tsx               # Providers, navegación y listener de sync
│   │   ├── login.tsx                 # Inicio de sesión
│   │   ├── register.tsx              # Registro
│   │   ├── index.tsx                 # Lista de tareas
│   │   └── task/
│   │       ├── new.tsx               # Alta de tarea
│   │       └── view/[id].tsx         # Detalle y edición en línea
│   ├── src/
│   │   ├── components/               # TaskForm, TaskItem, TaskPhoto, AuthScreen...
│   │   ├── context/AuthContext.tsx   # Estado de sesión
│   │   ├── db/                       # SQLite local y repositorio de tareas
│   │   ├── hooks/useTasks.tsx        # Consultas y mutaciones locales
│   │   ├── schemas/                  # Validación con Zod
│   │   ├── services/                 # API, sync, cámara, ubicación, fotos
│   │   ├── theme.ts                  # Colores y tema de Paper
│   │   └── types/Task.ts             # Tipo de tarea de la app
│   ├── .env.example                   # Plantilla de URL de la API
│   ├── app.json                       # Configuración Expo y permisos
│   ├── package.json
│   └── package-lock.json
└── server/                            # API Express + Prisma
    ├── src/
    │   ├── index.ts                   # Arranque del servidor
    │   ├── app.ts                     # App Express sin listen (tests)
    │   ├── routes/                    # auth.ts, tasks.ts
    │   ├── controllers/               # authController.ts, tasksController.ts
    │   ├── schemas/                   # Validación Zod
    │   ├── services/                  # Password, tokens, fotos
    │   ├── middleware/requireAuth.ts  # Bearer token
    │   ├── db/prisma.ts               # Cliente Prisma con adapter pg
    │   └── generated/prisma/          # Cliente Prisma generado
    ├── prisma/
    │   ├── schema.prisma              # Modelos User, RefreshToken, Task
    │   └── migrations/                # Historial SQL versionado
    ├── prisma.config.ts               # Configuración de Prisma 7
    ├── .env.example                   # Plantillas de entorno
    ├── package.json
    └── package-lock.json
```

Los archivos `server/.env` y `mobile/.env.local` se crean localmente a partir de sus ejemplos y no se versionan.

## Componentes y flujo de datos

| Archivo o componente | Responsabilidad |
|---|---|
| `mobile/app/index.tsx` | Consulta y muestra tareas, estados de carga/error, estado vacío, acceso a crear y abrir detalle, y confirmación de eliminación. |
| `mobile/app/task/new.tsx` | Presenta el formulario para crear; al guardar con éxito vuelve a la lista. |
| `mobile/app/task/view/[id].tsx` | Consulta `GET /tasks/:id`, muestra la tarjeta y permite editar título/descripción en línea o eliminar. |
| `TaskItem` | Muestra título y descripción; al pulsarla abre el detalle. Mantiene el botón para eliminar junto a la fila. |
| `TaskForm` | Formulario de alta; título obligatorio y descripción opcional, con validación React Hook Form + Zod. |
| `useTasks` / `useTask` | TanStack Query para lista, detalle y mutaciones; invalida las consultas de tareas tras cada operación. |
| `src/services/api.ts` | Centraliza las solicitudes HTTP, consulta tareas individuales y convierte el ID numérico a `string` en la app. |
| `server/src/routes/tasks.ts` | Asocia las rutas HTTP con el controlador. |
| `tasksController.ts` | Valida solicitudes, consulta Prisma y responde con los códigos HTTP. |
| `server/prisma/schema.prisma` | Define `Task`: ID, título, descripción nullable y fechas `createdAt`/`updatedAt`. |
| `server/prisma/migrations/20261121000000_optional_description/` | Permite guardar `description` como `NULL` sin perder los valores existentes. |

### Reglas de las tareas

- `title`: obligatorio y con un máximo de 100 caracteres.
- `description`: opcional y sin máximo. La API normaliza el valor ausente, nulo o en blanco a `NULL`; PostgreSQL permite `NULL`.
- El formulario recorta los espacios de ambos campos. La API recorta la descripción, pero no el título; una solicitud directa con un título formado solo por espacios puede pasar la validación del servidor.
- La base usa `SERIAL` para el ID y guarda las fechas `created_at` y `updated_at`.
- La app no implementa autenticación ni almacenamiento local; la persistencia corresponde a PostgreSQL mediante la API.

## API REST

La base URL predeterminada es `http://localhost:3000`. CORS está habilitado para permitir las solicitudes de la app web. El servidor también expone errores de validación como JSON.

| Método | Ruta | Auth | Body | Respuesta esperada |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | `{"email":"...","password":"..."}` | `201` `{ accessToken, refreshToken, user }`; `409` si el correo existe. |
| `POST` | `/auth/login` | No | `{"email":"...","password":"..."}` | `200` `{ accessToken, refreshToken, user }`; `401` credenciales inválidas. |
| `POST` | `/auth/logout` | No | `{"refreshToken":"..."}` | `204`; invalida el refresh token. |
| `POST` | `/auth/refresh` | No | `{"refreshToken":"..."}` | `200` con nuevos tokens; rota el refresh token. |
| `GET` | `/auth/me` | Sí | — | `200` `{ id, email }`. |
| `GET` | `/health` | No | — | `200`, `{"status":"ok"}` |
| `GET` | `/tasks` | Sí | — | `200`, arreglo ordenado de más reciente a más antigua; puede ser `[]`. |
| `GET` | `/tasks/:id` | Sí | — | `200` y la tarea; `400` si el ID no es un entero positivo; `404` si no existe o es de otro usuario. |
| `POST` | `/tasks` | Sí | `{"title":"...","description":"...","clientId":"..."}` (`description` y `clientId` opcionales) | `201` y la tarea creada; `400` si el body no valida. |
| `PUT` | `/tasks/:id` | Sí | Título obligatorio; descripción opcional | `200` y la tarea actualizada; `400` si el body no valida; `404` si no existe. La descripción omitida o en blanco se guarda como `null`. |
| `DELETE` | `/tasks/:id` | Sí | — | `204` sin body; `404` si no existe. |
| `POST` | `/tasks/:id/photo` | Sí | `multipart/form-data` campo `photo` | `200` tarea con `hasPhoto: true`; `400` tipo inválido; `413` > 5 MB. |
| `GET` | `/tasks/:id/photo` | Sí | — | Archivo de imagen; `404` si no hay foto. |
| `DELETE` | `/tasks/:id/photo` | Sí | — | `204`; `404` si no hay foto. |

Una tarea devuelta por la API incluye las coordenadas, ciudad, `clientId` y si tiene foto:

```json
{
  "id": 1,
  "title": "Preparar evaluación",
  "description": "Revisar los requisitos del proyecto",
  "latitude": 4.5,
  "longitude": -74.1,
  "locationName": "Bogotá",
  "clientId": "uuid-local",
  "hasPhoto": false,
  "createdAt": "2026-11-01T12:00:00.000Z",
  "updatedAt": "2026-11-01T12:00:00.000Z"
}
```
Cuando no se proporciona descripción, la respuesta de la API incluye `"description": null`. `clientId` es el UUID generado en el teléfono y hace idempotente el `POST /tasks`.

Los errores de validación responden con `400` y un objeto `errors` con los campos que fallaron. Si una tarea no existe, `GET`, `PUT` y `DELETE` responden `404` con `{"error":"Tarea no encontrada"}`; `GET` responde `400` para un ID inválido. Los errores internos responden `500` con `{"error":"Error interno del servidor"}`.

## Funcionalidades y capturas

### Lista vacía

La pantalla informa cuando todavía no hay tareas y permite iniciar el alta.

![Lista vacía de tareas](docs/images/inicio_sin_to_do.jpg)

### Lista de tareas

Cada fila muestra título y descripción; al pulsarla se abre su tarjeta. Toca el título o la descripción para sobrescribirlos.

![Lista con tareas](docs/images/ver_to_do.jpg)
![Detalle de tarea](docs/images/detalle-to-do.jpg)

### Agregar tarea

El título es obligatorio y la descripción opcional. Al guardar correctamente, la app vuelve a la lista y limpia el formulario.

![Formulario para agregar una tarea](docs/images/nueva_to_do.jpg)

### Editar desde la tarjeta

Toca el título o la descripción, cambia el texto y pulsa **Guardar**. **Cancelar** descarta el cambio; no hay una pantalla separada de edición.

![Formulario para agregar una tarea](docs/images/editar-to-do.jpg)

### Eliminar tarea

La app solicita confirmación antes de borrar la tarea.

![Confirmación para eliminar una tarea](docs/images/eliminar_to_do.jpg)

## Verificación local

### Comandos automáticos

Ejecuta los comandos desde la carpeta correspondiente, después de completar la instalación:

```bash
# En mobile/
npx tsc --noEmit
npm run lint
npm test

# En server/
npm run typecheck
npm test
```

`npm test` en `mobile/` ejecuta `jest-expo` con React Native Testing Library; en `server/` ejecuta `vitest` con Supertest.

### Recorrido manual esperado

- Registro/login/logout: crear cuenta, comprobar que la lista es privada; cerrar sesión y volver a login.
- Aislamiento entre usuarios: una tarea creada por A no la ve B.
- Refresco de token: dejar pasar ~15 min (o reiniciar la app) y verificar que sigue autenticado sin volver a escribir credenciales.
- CRUD: crear, editar desde la tarjeta y eliminar tareas; validar título vacío y de más de 100 caracteres; dejar descripción vacía debe permitir guardar.
- Foto: tomar/adjuntar foto, ver miniatura en lista, ver foto en detalle, eliminar foto.
- Ubicación: crear tarea con ubicación y verificar que muestra la ciudad; crear sin ubicación y verificar que no pide permiso.
- Offline: desconectar la red, crear/editar/eliminar tareas, cerrar y reabrir la app; volver a conectar y comprobar que se sincronizan.
- Apagar la API temporalmente: la app debe mostrar el error y permitir reintentar sin cerrarse.
- Persistencia: detener/reiniciar la app y la API manteniendo `pgdata`.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| El teléfono no conecta con la API | `localhost` apunta al teléfono, no al computador, o están en redes distintas. | Usa la IPv4 del computador en `mobile/.env.local`, conecta ambos a la misma Wi-Fi y revisa el firewall. Prueba `http://<IPv4-del-computador>:3000/health` desde el teléfono. |
| El emulador Android no conecta | Se configuró `localhost` para un emulador. | Usa `http://10.0.2.2:3000`. |
| La versión web muestra error de conexión | La API no está iniciada o la URL de Expo no corresponde al destino. | Comprueba `http://localhost:3000/health`, revisa `EXPO_PUBLIC_API_URL` y reinicia Metro después de editarla. CORS ya está habilitado en Express. |
| Expo Go no abre el proyecto | Expo Go no es compatible con el SDK del proyecto. | Usa Expo Go compatible con SDK 57 o prueba `npm run web`. |
| Metro informa que 8081 está ocupado | Otra instancia de Expo/Metro ya usa el puerto o la terminal no puede responder al diálogo interactivo. | Si identificas que la instancia es tuya, detenla y vuelve a ejecutar `npm run web`. Si no, conserva ese proceso y ejecuta Expo desde una terminal interactiva para aceptar el puerto alternativo que ofrece. |
| El puerto 5433 está ocupado | Otro servicio usa ese puerto. | Configura `POSTGRES_PORT=5434` en el `.env` raíz y cambia el puerto correspondiente en `server/.env`. |
| Prisma no alcanza PostgreSQL | El contenedor no está saludable o `DATABASE_URL` no coincide con Compose. | Revisa `docker compose ps`, el estado `healthy` y host, puerto, usuario, contraseña y base en ambos archivos de entorno. |
| La app muestra “No se pudo conectar con el servidor” | API apagada, URL incorrecta o acceso bloqueado por red/firewall. | Comprueba `/health` desde el mismo destino y usa **Reintentar** en la app. |

## Próximos pasos (fuera del alcance actual)

La aplicación ya incluye autenticación de usuarios, fotos, ubicación, almacenamiento local y sincronización. Posibles mejoras futuras:

- Descarga de fotos del servidor en segundo plano para visualización offline completa.
- Sincronización periódica en segundo plano y manejo de conflictos más sofisticado.
- Push notifications para recordatorios de tareas.
- Soporte de etiquetas/categorías y búsqueda local.
