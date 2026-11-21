# Plan de expansión — To-Do List móvil

Amplía la app descrita en [`documentacion.md`](documentacion.md) con: fotos adjuntas a tareas, ubicación GPS al crear, pruebas automatizadas, almacenamiento local (offline) y autenticación con Argon2.

Este archivo es una guía para un agente de IA que trabaja junto a la usuaria. **Lee primero `documentacion.md`**: sus convenciones (español, stack, no leer `.env`, no operaciones destructivas) siguen vigentes y este plan solo las amplía donde se indica.

## 0. Reglas de trabajo

1. Una fase a la vez, en pasos pequeños. Al terminar cada fase: ejecutar las verificaciones de la fase, resumir qué cambió y **por qué funciona así**, y esperar el visto bueno de la usuaria antes de seguir.
2. La usuaria está aprendiendo: explicar brevemente las decisiones importantes y hacer una pregunta concreta cuando haya una bifurcación real, en vez de decidir en silencio.
3. **Dependencias:** este plan autoriza instalar únicamente las de la sección 2. Cualquier otra requiere preguntar. Paquetes de Expo se instalan con `npx expo install` (fija la versión compatible con SDK 57); el resto con `npm install`.
4. Antes de usar la API de una librería de Expo, comprobar su documentación para SDK 57 en `https://docs.expo.dev/versions/v57.0.0/sdk/` (las APIs de `expo-file-system` y otras cambiaron entre SDK). No escribir de memoria.
5. Cambios de esquema: siempre con migración versionada (`prisma migrate dev --name ...`). Si Prisma propone **resetear la base** por un desfase, detenerse y preguntar. No borrar `pgdata` ni migraciones.
6. Ningún secreto en código ni en Git. Las variables nuevas se agregan a los `.env.example` y se explican; no se leen los `.env` reales.
7. Todo comportamiento nuevo lleva su prueba automatizada en la misma fase (ver fase 1 para la infraestructura).

## 1. Decisiones de diseño

| Requisito | Tecnología elegida | Por qué |
|---|---|---|
| Tomar foto | `expo-image-picker` (`launchCameraAsync`) | Funciona en Expo Go, abre la cámara del sistema y devuelve un `uri`; no hace falta construir una pantalla de cámara. `expo-camera` solo se justifica si se quiere una cámara propia dentro de la app. |
| Guardar la foto en el teléfono | `expo-file-system` | El `uri` del picker queda en caché y el sistema puede borrarlo; hay que copiarlo a un directorio persistente. |
| GPS | `expo-location` (`getCurrentPositionAsync`) | Estándar de Expo; permisos en tiempo de ejecución y plugin de configuración. |
| Almacenamiento local | `expo-sqlite` | Base relacional local, funciona en Expo Go y encaja con el modelo ya relacional (PostgreSQL). Alternativas descartadas: AsyncStorage (clave/valor, mal para consultas y cola de sincronización) y WatermelonDB / MMKV (requieren compilación nativa, no corren en Expo Go). |
| Detectar conexión | `@react-native-community/netinfo` | Dispara la sincronización al volver la red. |
| ID local de tareas | `expo-crypto` (`randomUUID`) | Una tarea creada offline necesita ID antes de existir en el servidor. |
| Token de sesión | `expo-secure-store` | Almacenamiento cifrado del sistema. No existe en web: usar `localStorage` solo como respaldo en web, documentado como limitación. |
| Hash de contraseñas | `argon2` (Node, variante **Argon2id**) | Se hace **en el servidor**, nunca en la app. El paquete es un binding nativo con binarios precompilados y trae sus tipos (necesita `@types/node`). |
| Sesión API | JWT (`jsonwebtoken`) en `Authorization: Bearer` | Suficiente para "autenticación básica" y sin estado en el servidor. |
| Subida de fotos | `multer` (multipart) | Estándar con Express; permite limitar tamaño y tipo. |
| Pruebas móvil | `jest-expo` + `@testing-library/react-native` | Preset oficial de Expo + pruebas de componentes por comportamiento. |
| Pruebas servidor | `vitest` + `supertest` | Vitest ejecuta TypeScript/ESM sin configuración extra (el servidor ya usa `tsx`); Supertest prueba rutas HTTP sin levantar el puerto. |

## 2. Dependencias autorizadas

```bash
# mobile/
npx expo install expo-image-picker expo-location expo-sqlite expo-secure-store expo-file-system expo-crypto @react-native-community/netinfo
npx expo install jest-expo jest @types/jest -- --save-dev   # si falla esta sintaxis, usar npm install -D con las versiones que pida jest-expo
npm install -D @testing-library/react-native

# server/
npm install argon2 jsonwebtoken multer express-rate-limit
npm install -D @types/node @types/jsonwebtoken @types/multer vitest supertest @types/supertest
```

Scripts a agregar: `mobile` → `"test": "jest"`; `server` → `"test": "vitest run"`.

## 3. Contratos objetivo

### Esquema Prisma (propuesta; ajustar al generar la migración)

```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique @db.VarChar(255)
  passwordHash String   @map("password_hash")
  createdAt    DateTime @default(now()) @map("created_at")
  tasks        Task[]

  @@map("users")
}

model Task {
  id          Int      @id @default(autoincrement())
  title       String   @db.VarChar(100)
  description String?  @db.Text
  latitude    Float?
  longitude   Float?
  photoPath   String?  @map("photo_path")
  clientId    String?  @map("client_id") @db.Uuid   // ID creado en el teléfono; hace idempotente el POST
  userId      Int?     @map("user_id")
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@unique([userId, clientId])
  @@map("tasks")
}
```

`userId` queda **nullable** para no romper las filas existentes. Las tareas antiguas sin dueño no se devuelven en ningún endpoint. **Preguntar a la usuaria** si quiere asignarlas a su primer usuario o descartarlas; no decidirlo solo.

### Endpoints nuevos y cambios

| Método | Ruta | Auth | Detalle |
|---|---|---|---|
| `POST` | `/auth/register` | No | `{email, password}` → `201` `{token, user:{id,email}}`. `409` si el correo existe. Nunca devuelve `passwordHash`. |
| `POST` | `/auth/login` | No | `200` `{token, user}`; `401` con mensaje genérico `Credenciales inválidas` (no distinguir correo inexistente de contraseña errónea). Con límite de intentos. |
| `GET` | `/auth/me` | Sí | `200` `{id,email}`; sirve para validar el token guardado. |
| `*` | `/tasks...` | Sí | Todas filtradas por `userId` del token. Una tarea ajena responde `404` (no `403`, para no revelar que existe). |
| `POST` | `/tasks` | Sí | Acepta además `latitude`, `longitude` (ambos o ninguno) y `clientId`. Si ya existe `(userId, clientId)`, devuelve la existente (reintentos sin duplicar). |
| `POST` | `/tasks/:id/photo` | Sí | `multipart/form-data`, campo `photo`; `image/jpeg`, `image/png` o `image/webp`; máx. 5 MB (`413` si excede, `400` si el tipo no es válido). Reemplaza la foto anterior. |
| `GET` | `/tasks/:id/photo` | Sí | Devuelve el archivo; `404` si no hay. |
| `DELETE` | `/tasks/:id/photo` | Sí | Borra archivo y `photoPath`; `204`. |

La respuesta de tarea agrega `latitude`, `longitude`, `clientId` y `hasPhoto: boolean` (no expone la ruta del archivo en disco). Las fotos se guardan bajo `server/uploads/<userId>/` con nombre generado por el servidor (UUID); **nunca** usar el nombre que envía el cliente. Agregar `server/uploads/` al `.gitignore`.

Validación de reglas nuevas (Zod, en ambos lados): `latitude` ∈ [−90, 90], `longitude` ∈ [−180, 180]; contraseña de 8 a 128 caracteres (el máximo evita enviar textos enormes al hash); correo normalizado a minúsculas.

Variables nuevas en `server/.env.example`: `JWT_SECRET` (el servidor debe **negarse a arrancar** si falta o tiene menos de 32 caracteres) y `JWT_EXPIRES_IN` (por ejemplo `7d`).

### Modelo móvil objetivo (`src/types/Task.ts`)

```ts
type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
type PhotoStatus = 'none' | 'synced' | 'pending_upload' | 'pending_delete';

type Task = {
  id: string;              // UUID local (= clientId en el servidor); ya no es el ID numérico del servidor
  serverId: number | null; // null hasta que se sincroniza
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUri: string | null; // archivo en el almacenamiento persistente del teléfono
  photoStatus: PhotoStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};
```

La interfaz de `useTasks` / `useTask` (listar, crear, editar, eliminar) **se mantiene estable** para que las pantallas casi no cambien cuando entre el almacenamiento local en la fase 7.

---

## Fase 0 — Preparación

- [x] Crear una rama de trabajo (`git switch -c expansion`).
- [x] Verificar la línea base antes de tocar nada: `npx tsc --noEmit` y `npm run lint` en `mobile/`; `npm run typecheck` en `server/`; confirmar que la app abre y el CRUD actual funciona.
- [x] Comparar `documentacion.md` con el código: no se detectaron diferencias en el CRUD, contratos ni scripts revisados.

**Checkpoint:** línea base verde. Si algo ya falla, avisarlo, no arreglarlo de pasada.

## Fase 1 — Infraestructura de pruebas

Primero las herramientas, para que cada fase siguiente nazca con sus pruebas.

**Servidor**
- [x] Separar la creación de la app del arranque: mover Express, CORS, JSON, rutas y manejo de errores a `server/src/app.ts` (exporta `app`); `index.ts` carga `dotenv/config` y hace `listen`, sin cargar `.env` al importar `app` desde las pruebas. *Por qué:* Supertest necesita la app sin puerto abierto.
- [x] Configurar `vitest` (`vitest.config.ts`) e instalar el script `test`.
- [x] Prueba de humo: `GET /health` → `200 {"status":"ok"}`.
- [x] Para las pruebas de rutas, simular `db/prisma.ts` con `vi.mock` (rápidas, sin PostgreSQL). Las pruebas contra una base real son opcionales y deben usar una base distinta (por ejemplo `todo_test`), nunca la de desarrollo; el smoke test usa el mock.

**Móvil**
- [x] Configurar `jest-expo` (preset en `package.json`) y `@testing-library/react-native`; `test-renderer` queda en `1.2.0` para compatibilidad con React `19.2.3` de SDK 57.
- [x] Prueba de humo: renderizar `TaskItem` con una tarea y comprobar que muestra el título.
- [x] Confirmar que `npx tsc --noEmit` no se rompe con los tipos de Jest.

**Checkpoint:** `npm test` pasa en ambos paquetes.

## Fase 2 — Autenticación en el servidor (Argon2)

- [x] Modelo `User` y `userId` en `Task`; migración versionada (ver nota de filas antiguas arriba).
- [x] `server/src/services/password.ts`: `hashPassword(plain)` y `verifyPassword(hash, plain)` con `argon2.hash` / `argon2.verify` usando **Argon2id** (`type: argon2.argon2id`). Parámetros: como mínimo los de OWASP (19 MiB de memoria, 2 iteraciones, 1 hilo); el valor por defecto del paquete es más fuerte y también es válido. Recordar `await` en `verify` (sin él la comparación siempre sería "verdadera"). El orden de argumentos es `verify(hash, password)`.
- [x] `server/src/services/token.ts`: firmar y verificar JWT con `JWT_SECRET`; fallar al iniciar si el secreto no es válido.
- [x] Esquemas Zod de registro y login (correo, contraseña 8–128).
- [x] `routes/auth.ts` + `controllers/authController.ts`: `register`, `login`, `me`. Cuando el correo no existe en login, igualmente verificar contra un hash falso para no revelar por tiempo de respuesta qué correos existen.
- [x] `middleware/requireAuth.ts`: valida `Authorization: Bearer`, adjunta `req.userId`; `401` si falta o es inválido.
- [x] Aplicar `requireAuth` a `/tasks` y filtrar **todas** las consultas por `userId` (incluidas `PUT` y `DELETE`, que hoy convierten el ID sin validar: aprovechar para validar el ID con el mismo helper que ya usa `GET /tasks/:id`).
- [x] `express-rate-limit` en `/auth/login` y `/auth/register`.
- [x] Actualizar `.env.example`.

**Pruebas (Vitest + Supertest)**
- [x] `password`: el hash empieza con `$argon2id$`; `verify` acepta la contraseña correcta y rechaza una incorrecta; dos hashes de la misma contraseña son distintos (sal).
- [x] Registro: `201` sin `passwordHash` en la respuesta; correo duplicado → `409`; contraseña corta → `400`.
- [x] Login: correcto → token; incorrecto → `401` con el mismo mensaje que correo inexistente.
- [x] `/tasks` sin token → `401`; con token inválido → `401`.
- [x] Aislamiento: el usuario B no puede ver, editar ni borrar la tarea del usuario A (`404`).

**Checkpoint:** `npm test` y `npm run typecheck` en `server/`; smoke HTTP verificado: `/health` → `200`, `/tasks` sin token → `401` y con token → `200`, `/auth/me` con usuario inexistente → `401`, login de correo inexistente → `401`.

## Fase 3 — Autenticación en la app

- [ ] `src/services/authStorage.ts`: guardar/leer/borrar el token con `expo-secure-store` (respaldo `localStorage` solo en web).
- [ ] `src/context/AuthContext.tsx`: estado `loading | signedOut | signedIn`, `signIn`, `signUp`, `signOut`; al iniciar, leer el token y validarlo con `GET /auth/me`. **Si no hay red, mantener la sesión con el token guardado** (importante para la fase 7).
- [ ] `services/api.ts`: enviar `Authorization: Bearer <token>` en todas las llamadas; ante `401`, cerrar sesión.
- [ ] Pantallas `app/login.tsx` y `app/register.tsx` con React Hook Form + Zod + Paper (mismo patrón que `TaskForm`, respetando la bifurcación nativo/web de los inputs). Campo de contraseña con ocultar/mostrar y mensajes de error en español.
- [ ] `app/_layout.tsx`: proteger las rutas de tareas con `Stack.Protected` (o redirección equivalente según la documentación de Expo Router SDK 57) y mostrar login si no hay sesión.
- [ ] Botón **Cerrar sesión** en la lista. Al cambiar de usuario, limpiar la caché de TanStack Query (`queryClient.clear()`).
- [ ] Reglas de validación del formulario compartidas en espíritu con el servidor (8–128 caracteres).

**Pruebas (RNTL)**
- [ ] Login con campos vacíos muestra errores y no llama a la API.
- [ ] Login correcto guarda el token y navega a la lista (mock de `authStorage` y `api`).
- [ ] Login incorrecto muestra "Credenciales inválidas".
- [ ] Una respuesta `401` cierra la sesión.

**Checkpoint:** registrar dos usuarios y comprobar en la app que cada uno ve solo sus tareas.

## Fase 4 — Modelo ampliado (ubicación y foto)

- [ ] Migración: `latitude`, `longitude`, `photo_path`, `client_id` y la restricción `@@unique([userId, clientId])`.
- [ ] Actualizar, en este orden (como indica `documentacion.md`, sección 8): esquemas Zod móvil y servidor → `schema.prisma` + migración + `prisma generate` → `types/Task.ts` → `api.ts` → `tasksController.ts`.
- [ ] `POST /tasks` idempotente por `clientId`.

**Pruebas:** `latitude` fuera de rango → `400`; solo una de las dos coordenadas → `400`; `POST` repetido con el mismo `clientId` no crea un duplicado.

**Checkpoint:** `npm test` + `typecheck`; el CRUD existente sigue funcionando.

## Fase 5 — GPS al crear la tarea

- [ ] Plugin en `app.json`: `expo-location` con mensaje de permiso en español (`locationWhenInUsePermission`).
- [ ] `src/services/location.ts` → `getCurrentCoords()` devuelve un resultado tipado, sin lanzar excepciones:
  - `{ status: 'ok', latitude, longitude }`
  - `{ status: 'denied' }` (permiso rechazado)
  - `{ status: 'unavailable' }` (GPS apagado, error o **tiempo de espera agotado**; usar un límite de unos segundos con `Promise.race` para que crear una tarea nunca se quede colgado)
- [ ] Integrar en el alta: al guardar, pedir permiso (primera vez) y obtener coordenadas. **Si no se obtienen, la tarea se crea igual** con `latitude`/`longitude` en `null`. Mostrar un aviso discreto cuando no se pudo registrar la ubicación.
- [ ] Mostrar la ubicación en la tarjeta de detalle ("Ubicación: lat, lon") con un enlace "Ver en el mapa" usando `Linking.openURL` (URL de mapas con `lat,lon`; no requiere dependencias nuevas). Si no hay ubicación: "Sin ubicación".

**Pruebas (Jest)** — mockeando `expo-location`:
- [ ] Permiso concedido → devuelve las coordenadas del mock.
- [ ] Permiso denegado → `denied`, y no se llama a `getCurrentPositionAsync`.
- [ ] Error del GPS → `unavailable`.
- [ ] Tiempo de espera agotado → `unavailable` (usar fake timers).
- [ ] Alta con ubicación disponible → `addTask` recibe latitud y longitud.
- [ ] Alta con permiso denegado → `addTask` se llama igual con coordenadas `null`.

**Checkpoint:** en un teléfono físico, crear una tarea con y sin permiso y comprobar los datos guardados.

## Fase 6 — Fotos

**Servidor**
- [ ] `POST /tasks/:id/photo`, `GET /tasks/:id/photo`, `DELETE /tasks/:id/photo` según el contrato; `multer` con `memoryStorage` o `diskStorage`, límite de 5 MB y lista blanca de tipos MIME; nombre de archivo generado por el servidor; comprobar la propiedad de la tarea antes de escribir en disco.
- [ ] Al borrar una tarea, borrar también su archivo de foto. Si el archivo ya no existe, no fallar.
- [ ] `hasPhoto` en las respuestas.

**Móvil**
- [ ] Plugin `expo-image-picker` en `app.json` con `cameraPermission` en español (y `microphonePermission: false`, no se graban videos).
- [ ] `src/services/camera.ts` → `takePhoto()` devuelve un resultado tipado:
  - `{ status: 'ok', uri }` · `{ status: 'cancelled' }` · `{ status: 'denied' }` · `{ status: 'unavailable' }` (por ejemplo, dispositivo sin cámara)
  - Usa `launchCameraAsync` con `mediaTypes: ['images']` y `quality` moderada (~0.7) para reducir el tamaño. Pide permiso con la API de permisos de la librería antes de abrir la cámara.
- [ ] `src/services/photoStorage.ts`: copiar la foto al directorio persistente (`expo-file-system`, API vigente en SDK 57) con nombre `<taskId>.jpg`; funciones `savePhoto`, `deletePhoto`.
- [ ] `TaskForm`: botón **Tomar foto**, vista previa y botón para quitarla antes de guardar.
- [ ] `TaskItem` (lista): miniatura cuando la tarea tiene foto, con `accessibilityLabel`.
- [ ] `task/view/[id].tsx` (tarjeta de la tarea): foto grande y botón **Eliminar foto** con confirmación (mismo patrón de confirmación que el borrado de tareas). Si no hay foto, botón **Tomar foto** para adjuntar una. Tras eliminar, la miniatura desaparece de la lista (invalidar `['tasks']`).
- [ ] Mostrar una foto servida por la API requiere enviar el token: `Image` nativo admite `source={{ uri, headers }}`. En web esto no es fiable: tratar la web como mejor esfuerzo para fotos y documentarlo. (Con la fase 7 la app mostrará siempre el archivo local, y este punto casi desaparece.)

**Pruebas**
- Servidor (Supertest): subir imagen válida → `200/201` y `hasPhoto: true`; archivo no imagen → `400`; archivo > 5 MB → `413`; subir a una tarea ajena → `404`; `DELETE` elimina el archivo y deja `hasPhoto: false`.
- Móvil, `camera.ts` (mock de `expo-image-picker`): permiso concedido y foto tomada → `ok` con el `uri`; usuario cancela → `cancelled`; permiso denegado → `denied` sin abrir la cámara; error de la cámara → `unavailable`.
- Móvil, componentes (RNTL): `TaskForm` muestra la vista previa tras tomar una foto y permite quitarla; `TaskItem` muestra la miniatura solo si hay foto; el detalle muestra **Eliminar foto**, pide confirmación y, al confirmar, llama a la eliminación (y al cancelar no la llama).

**Checkpoint:** en un teléfono físico (la cámara del emulador es simulada): tomar foto, verla en la lista y en el detalle, eliminarla, reabrir la app.

## Fase 7 — Almacenamiento local y modo sin conexión

Se divide en dos mitades; cerrar y aprobar la 7A antes de empezar la 7B.

### 7A — Base de datos local como fuente de la interfaz

- [ ] `src/db/database.ts`: abrir la base con `expo-sqlite`, crear la tabla `tasks` (columnas según el modelo móvil objetivo más `user_id`) y manejar versiones de esquema con `PRAGMA user_version`.
- [ ] `src/db/taskRepository.ts`: `list(userId)`, `get(id)`, `create`, `update`, `markDeleted`, `upsertFromServer`; todas las consultas filtran por `user_id` y excluyen `pending_delete`.
- [ ] Refactor de `useTasks` / `useTask`: la `queryFn` lee del repositorio; las mutaciones escriben primero en local (`id` = UUID de `expo-crypto`, `syncStatus: pending_*`) y luego invalidan `['tasks']`. **Mantener la interfaz del hook** para no reescribir las pantallas.
- [ ] La foto vive en el almacenamiento persistente del teléfono; `photoStatus` indica qué falta por subir o borrar.
- [ ] Estado en la lista: indicador discreto de tareas "pendientes de sincronizar".

**Pruebas:** repositorio con una base SQLite en memoria o el mock de `expo-sqlite`: crear → leer; editar; borrado lógico; aislamiento por `user_id`; una tarea creada sin red aparece en la lista.

**Checkpoint 7A:** con la API apagada y sin red, crear, editar y eliminar tareas; cerrar y reabrir la app: los datos siguen ahí.

### 7B — Sincronización

- [ ] `src/services/sync.ts` con una cola simple y reglas claras:
  1. **Subir** (en orden de `updatedAt`): `pending_create` → `POST /tasks` con `clientId` (idempotente); `pending_update` → `PUT`; `pending_delete` → `DELETE` (un `404` cuenta como éxito). Luego fotos: `pending_upload` → `POST /tasks/:id/photo`; `pending_delete` → `DELETE /tasks/:id/photo`.
  2. **Bajar:** `GET /tasks` y `upsertFromServer` por `clientId`. Si la tarea local tiene cambios pendientes, **gana lo local**; si está sincronizada, gana el servidor. Tareas sincronizadas que ya no existen en el servidor se eliminan localmente. Las fotos que existen en el servidor y no en el teléfono se descargan al almacenamiento local (con el token).
  3. Un fallo en una tarea no detiene la cola: queda pendiente y se reintenta en el siguiente ciclo.
- [ ] Disparadores: al abrir la app con sesión, al volver la conexión (`NetInfo`), después de cada mutación local si hay red, y *pull to refresh* manual.
- [ ] Evitar sincronizaciones simultáneas (un candado simple en memoria).
- [ ] Limitación conocida que se debe documentar: **el primer inicio de sesión necesita conexión** (la contraseña solo la verifica el servidor); después, la sesión guardada funciona sin red.

**Pruebas (con `api` mockeada):** crear offline y luego sincronizar → se llama a `POST` una vez y la tarea pasa a `synced` con su `serverId`; un fallo de red deja la tarea pendiente; reintentar no duplica (mismo `clientId`); editar offline → `PUT`; eliminar offline → `DELETE`; la foto pendiente se sube después de crear la tarea; conflicto: gana lo local si hay cambios pendientes.

**Checkpoint 7B:** crear tareas con foto y ubicación sin red, volver a conectar y comprobar que aparecen en el servidor (y para el segundo usuario no).

## Fase 8 — Cierre

- [ ] Ejecutar todo: `npm test`, `npx tsc --noEmit` y `npm run lint` en `mobile/`; `npm test` y `npm run typecheck` en `server/`.
- [ ] Ampliar la lista de aceptación manual de `documentacion.md` (sección 7): registro/login/logout, aislamiento entre usuarios, foto (tomar, ver en lista, ver en detalle, eliminar), ubicación (con y sin permiso), modo avión (crear/editar/eliminar y sincronizar), reinicio de la app.
- [ ] Actualizar `documentacion.md`:
  - Sección 1: la línea que dice que autenticación y offline son "extensiones futuras" ya no aplica; actualizar también la regla de dependencias.
  - Secciones 2, 3 y 4: estado, estructura de carpetas nueva y diagrama (ahora la UI lee de SQLite y hay una capa de sincronización).
  - Sección 5: modelo, esquema Prisma, endpoints y validaciones nuevos.
  - Sección 6 y 7: variables `JWT_SECRET` / `JWT_EXPIRES_IN`, scripts `test`, carpeta `uploads/`.
  - Sección 9: reemplazar los límites obsoletos y listar los nuevos (web como mejor esfuerzo para fotos, primer login con conexión, resolución de conflictos simple, JWT sin revocación, CORS aún sin restringir).
  - Sección 10: estado del plan.
- [ ] Actualizar `README.md` (permisos de cámara/ubicación, variables de entorno nuevas, cómo correr las pruebas, nota sobre usar teléfono físico para cámara y GPS).
- [ ] Revisar que no se versionen secretos ni `server/uploads/`.

**Checkpoint final:** entrega con pruebas verdes y documentación al día. No marcar como ejecutado nada que no se haya corrido.
