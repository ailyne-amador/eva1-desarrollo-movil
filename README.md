# To-Do List móvil — Evaluación Sumativa, Unidad 1

**Asignatura:** Desarrollo Móvil  
**Estudiante:** Ailyne Amador

Aplicación móvil para crear, listar, editar y eliminar tareas. La app está desarrollada con Expo y React Native; una API REST en Express guarda los datos en PostgreSQL.

## Tecnologías

| Área | Tecnología | Uso |
|---|---|---|
| App móvil | Expo SDK 57, React Native 0.86.3, React 19 y TypeScript estricto | Desarrollo de la interfaz para Android y web. |
| Navegación | Expo Router | Define las pantallas mediante archivos dentro de `mobile/app/`. |
| Componentes visuales | React Native Paper 5 | Campos, botones, diálogos, indicadores y tema de la interfaz. |
| Formularios | React Hook Form, Zod y `@hookform/resolvers` | Gestiona el formulario y valida título y descripción. |
| Datos remotos | TanStack Query 5 | Carga las tareas y refresca la lista después de cada operación. |
| API | Node.js, Express 5 y TypeScript | Expone el CRUD y valida las solicitudes. |
| Acceso a datos | Prisma 7 con `@prisma/adapter-pg` | Consulta PostgreSQL y aplica migraciones versionadas. |
| Base de datos | PostgreSQL 16 en Docker Compose | Persiste las tareas en un volumen nombrado. |
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

### 3. Levantar PostgreSQL

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

Si el puerto local `5433` está ocupado, crea un archivo `.env` en la raíz con, por ejemplo, `POSTGRES_PORT=5434`; luego cambia `5433` por `5434` en `server/.env`. Si cambias el usuario, contraseña o nombre de la base en el `.env` raíz, actualiza también `DATABASE_URL` para que coincida. Estos valores son solo para desarrollo local, no para producción.

### 4. Instalar y arrancar la API

Abre una terminal en `server/`:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

`npm ci` instala las versiones fijadas por el lockfile. `prisma generate` genera el cliente desde `prisma/schema.prisma`; `migrate deploy` aplica las migraciones pendientes, incluida la creación de `tasks`. El proceso `npm run dev` deja la API escuchando en `http://localhost:3000` (puerto predeterminado).

Deja esa terminal abierta. En otra terminal, comprueba el estado del servidor desde el computador:

```text
http://localhost:3000/health
```

La respuesta esperada es `{"status":"ok"}`. La API también puede consultarse con `Invoke-RestMethod http://localhost:3000/health` en PowerShell.

### 5. Instalar y arrancar la app

Abre otra terminal en `mobile/`:

```bash
npm ci
npx expo start
```

Para abrirla en un teléfono, instala Expo Go compatible con SDK 57, escanea el QR que muestra Metro y permite que el teléfono acceda a la red local. Para abrirla en el navegador del computador, usa el script incluido:

```bash
npm run web
```

La app carga las tareas de la API. Para comprobar el CRUD, crea una tarea, confirma que el formulario se vacía y la tarea aparece en la lista; edítala y elimínala. Los datos se guardan en PostgreSQL, no solo en la memoria de la app.

### 6. Detener los procesos

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
├── plan.md                           # Plan y registro de las fases
├── docs/
│   └── images/                       # Capturas de la aplicación
├── mobile/                           # App Expo + React Native
│   ├── app/
│   │   ├── _layout.tsx               # Providers y navegación raíz
│   │   ├── index.tsx                 # Lista de tareas
│   │   └── task/
│   │       ├── new.tsx               # Alta de tarea
│   │       └── [id].tsx               # Edición por identificador
│   ├── src/
│   │   ├── components/
│   │   │   ├── ScreenHeader.tsx       # Encabezado de pantallas
│   │   │   ├── TaskForm.tsx           # Formulario reutilizable
│   │   │   └── TaskItem.tsx           # Fila de una tarea
│   │   ├── hooks/useTasks.tsx         # Consultas y mutaciones de tareas
│   │   ├── schemas/taskSchema.ts      # Validación del formulario
│   │   ├── services/api.ts            # Solicitudes HTTP a Express
│   │   ├── theme.ts                   # Colores y tema de Paper
│   │   └── types/Task.ts              # Tipo de tarea de la app
│   ├── .env.example                   # Plantilla de URL de la API
│   ├── app.json                       # Configuración Expo
│   ├── package.json
│   └── package-lock.json
└── server/                            # API Express + Prisma
    ├── src/
    │   ├── index.ts                   # Configura Express, CORS y /health
    │   ├── routes/tasks.ts             # Rutas /tasks
    │   ├── controllers/tasksController.ts # Lógica del CRUD
    │   ├── schemas/taskSchema.ts       # Validación del body
    │   ├── db/prisma.ts                # Cliente Prisma con adapter pg
    │   └── generated/prisma/           # Cliente Prisma generado
    ├── prisma/
    │   ├── schema.prisma               # Modelo Task
    │   └── migrations/                 # Historial SQL versionado
    ├── prisma.config.ts                # Configuración de Prisma 7
    ├── .env.example                    # Plantilla de DATABASE_URL
    ├── package.json
    └── package-lock.json
```

Los archivos `server/.env` y `mobile/.env.local` se crean localmente a partir de sus ejemplos y no se versionan.

## Componentes y flujo de datos

| Archivo o componente | Responsabilidad |
|---|---|
| `mobile/app/index.tsx` | Consulta y muestra tareas, estados de carga/error, estado vacío, acceso a crear/editar y confirmación de eliminación. |
| `mobile/app/task/new.tsx` | Presenta el formulario para crear; al guardar con éxito vuelve a la lista. |
| `mobile/app/task/[id].tsx` | Busca la tarea por ID, precarga el formulario y guarda sus cambios. |
| `TaskItem` | Muestra título y descripción; ofrece edición y un botón para eliminar junto a cada tarea. |
| `TaskForm` | Comparte el formulario de alta/edición, valida con React Hook Form y Zod, muestra errores y restablece los valores predeterminados tras guardar (vacíos para una tarea nueva). |
| `useTasks` | Usa TanStack Query para listar y mutar datos; invalida la consulta de tareas después de cada alta, edición o eliminación. |
| `src/services/api.ts` | Centraliza las solicitudes HTTP y convierte el ID numérico de PostgreSQL a `string` en el tipo usado por la app. |
| `server/src/routes/tasks.ts` | Asocia las rutas HTTP con el controlador. |
| `tasksController.ts` | Valida las solicitudes, ejecuta las operaciones Prisma y responde con los códigos HTTP. |
| `server/prisma/schema.prisma` | Define `Task`: ID autoincremental, título, descripción y fechas `createdAt`/`updatedAt`. |

### Reglas de las tareas

- `title`: obligatorio y con un máximo de 100 caracteres.
- `description`: obligatoria; no tiene un máximo definido por el esquema.
- El formulario móvil recorta espacios al inicio y al final y valida que quede texto. La API valida strings de longitud mínima 1 y limita el título a 100 caracteres, pero no recorta espacios; una solicitud directa con solo espacios puede pasar la validación del servidor.
- La base usa `SERIAL` para el ID y guarda las fechas `created_at` y `updated_at`.
- La app no implementa autenticación ni almacenamiento local; la persistencia corresponde a PostgreSQL mediante la API.

## API REST

La base URL predeterminada es `http://localhost:3000`. CORS está habilitado para permitir las solicitudes de la app web. El servidor también expone errores de validación como JSON.

| Método | Ruta | Body | Respuesta esperada |
|---|---|---|---|
| `GET` | `/health` | — | `200`, `{"status":"ok"}` |
| `GET` | `/tasks` | — | `200`, arreglo de tareas ordenado de más reciente a más antigua; puede ser `[]`. |
| `POST` | `/tasks` | `{"title":"...","description":"..."}` | `201` y la tarea creada; `400` si el body no valida. |
| `PUT` | `/tasks/:id` | `{"title":"...","description":"..."}` | `200` y la tarea actualizada; `400` si no valida; `404` si no existe. Requiere ambos campos. |
| `DELETE` | `/tasks/:id` | — | `204` sin body; `404` si no existe. |

Una tarea devuelta por la API tiene esta forma (fechas ISO serializadas en JSON e ID numérico):

```json
{
  "id": 1,
  "title": "Preparar evaluación",
  "description": "Revisar los requisitos del proyecto",
  "createdAt": "2026-11-01T12:00:00.000Z",
  "updatedAt": "2026-11-01T12:00:00.000Z"
}
```

Los errores de validación responden con `400` y un objeto `errors` con los campos que fallaron. Si una tarea no existe, `PUT` y `DELETE` responden `404` con `{"error":"Tarea no encontrada"}`. Los errores internos responden `500` con `{"error":"Error interno del servidor"}`.

## Funcionalidades y capturas

### Lista vacía

La pantalla informa cuando todavía no hay tareas y permite iniciar el alta.

![Lista vacía de tareas](docs/images/inicio_sin_to_do.jpg)

### Lista de tareas

Cada fila muestra el título y la descripción. Desde la fila se puede editar; el botón **Eliminar** está junto a cada tarea.

![Lista con tareas](docs/images/ver_to_do.jpg)

### Agregar tarea

Título y descripción son obligatorios. Al guardar correctamente, la app vuelve a la lista y limpia el formulario.

![Formulario para agregar una tarea](docs/images/nueva_to_do.jpg)

### Editar tarea

El formulario aparece precargado con los valores actuales.

![Formulario para editar una tarea](docs/images/editar_to_do.jpg)

### Eliminar tarea

La app solicita confirmación antes de borrar la tarea.

![Confirmación para eliminar una tarea](docs/images/eliminar_to_do.jpg)

## Verificación local

Ejecuta los comandos desde la carpeta correspondiente, después de completar la instalación:

```bash
# En mobile/
npx tsc --noEmit
npm run lint

# En server/
npm run typecheck
```

El recorrido manual esperado es: abrir la lista; crear una tarea y comprobar que el formulario se limpia; editarla; cancelar y confirmar una eliminación; intentar guardar campos vacíos; y apagar temporalmente la API para comprobar que la app muestra el error de conexión y permite reintentar. El paquete del servidor no define un script `lint` ni `test`; Jest y React Native Testing Library no están configurados en esta entrega.

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

## Próximos pasos (fuera del alcance de esta evaluación)

El diseño deja como posibles extensiones futuras el almacenamiento local, la autenticación de usuarios y el consumo de APIs externas. No forman parte de esta entrega y no están implementadas.
