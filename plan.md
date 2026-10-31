# plan.md — To-Do List móvil (Evaluación Sumativa Unidad 1)

> **Este archivo es la guía de trabajo para un agente de IA** que acompaña el desarrollo.
> Léelo completo antes de hacer cualquier cosa. Si algo contradice lo que dice el usuario en el chat, manda el usuario.

---

## 1. Instrucciones para el agente

### 1.1 Cómo trabajar con esta usuaria
- **Una fase a la vez.** Al terminar cada fase, ejecuta las verificaciones, resume qué quedó hecho y **detente a esperar confirmación** antes de pasar a la siguiente.
- **Aprendizaje práctico.** La usuaria quiere entender *por qué* funcionan las cosas, no recibir todo resuelto. Antes de escribir un archivo o comando importante, explica en 2–4 líneas qué hace y por qué se hace así. Cada fase trae notas "Por qué" que puedes usar de base.
- **Pasos pequeños.** Evita generar de golpe muchos archivos sin explicar. Prefiere cambios cortos que se puedan probar de inmediato.
- **Nivel de la usuaria:** entre básico e intermedio en TypeScript/JS y Python; conoce Express, SQL, PostgreSQL, Docker y React a nivel básico. React Native y Expo son nuevos para ella: explica sus conceptos (componentes nativos, Metro, Expo Go, Expo Router).
- **Preguntas puntuales.** Si falta información, haz **una** pregunta concreta (no un cuestionario). Si hay una decisión razonable por defecto, propónla y sigue.
- **Idioma:** conversa en español. Identificadores de código en inglés; textos visibles en la app en español; comentarios de código breves y en español.

### 1.2 Reglas de seguridad y alcance
- **No cambies el stack** definido en la sección 3 sin preguntar. No agregues librerías fuera de la lista sin explicar para qué y pedir permiso.
- **No inventes versiones ni APIs de memoria.** Expo, Expo Router, React Native Paper y Prisma cambian seguido: consulta la documentación oficial o usa `npx create-expo-app@latest` / `npm install <paquete>` y verifica con la versión realmente instalada.
- **Comandos destructivos requieren confirmación explícita:** `rm -rf`, `docker compose down -v`, `docker volume rm`, `git reset --hard`, `git push --force`, borrar migraciones.
- **Secretos:** nunca subas `.env` al repositorio. Mantén un `.env.example` con valores de ejemplo.
- **Alcance:** solo lo que pide la evaluación (listar, agregar, editar, eliminar). Autenticación, almacenamiento local y APIs externas son de unidades futuras: no los implementes, solo deja el diseño preparado.
- **Verifica antes de afirmar.** No digas "funciona" sin haber corrido el comando de verificación de la fase. Si no puedes ejecutarlo (por ejemplo, ver la app en el teléfono), pídele a la usuaria que lo pruebe y te cuente el resultado.
- **Control de versiones:** commits pequeños con mensajes tipo Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`), una rama por fase (`fase-1-expo`, `fase-2-ui`, ...) y merge a `main` al cerrar la fase.

### 1.3 Preguntas abiertas (resolver en la Fase 0)
1. ¿Probará en teléfono físico (Expo Go) o en emulador Android? Define la URL de la API en la Fase 6.
2. ¿Sistema operativo del computador? (Windows, macOS, Linux; en Windows revisar WSL2/Docker Desktop).
3. ¿Prisma o `pg` con SQL directo? **Por defecto: Prisma.** Si quiere practicar SQL puro, `pg`.


---

## 2. Contexto del proyecto

**Qué se construye:** app móvil para registrar y visualizar una lista de tareas pendientes (To-Do List).

**Requisitos funcionales (obligatorios):**
- Cada tarea tiene **título** y **descripción** (ambos obligatorios).
- **Listar** tareas (cada una con título y descripción).
- **Agregar** tarea: el formulario **debe limpiar los campos** después de guardar.
- **Editar** tarea.
- **Eliminar** tarea: botón de eliminar **junto a cada tarea**.
- Debe poder verse la aplicación funcionando (el enunciado original esperaba verla en `localhost`; con Expo se ve en el servidor de desarrollo, normalmente `http://localhost:8081`, o en el navegador con `npx expo start --web`).


**Evolución futura (solo diseñar con esto en mente, no implementar):** almacenamiento local, autenticación de usuarios, consumo de APIs externas.


## 3. Stack definido

| Capa | Tecnología | Por qué |
|---|---|---|
| App móvil | Expo + React Native + TypeScript (`strict`) | Stack elegido y aprobado por el profesor; Expo permite probar en el teléfono con Expo Go sin configurar Android Studio. |
| Navegación | Expo Router | Rutas por archivos; la estructura de carpetas explica la navegación. |
| UI | React Native Paper | Componentes listos (equivalentes a `ion-*`). |
| Formularios | React Hook Form + Zod (+ `@hookform/resolvers`) | Validación con mensajes claros; el esquema Zod se reutiliza en el backend. |
| Datos en la app | TanStack Query (desde Fase 6) | Maneja carga, errores y refresco tras cada mutación. |
| Backend | Node.js + Express + TypeScript (`tsx` para desarrollo) | Ya lo conoce; base para auth y APIs en unidades futuras. |
| Acceso a datos | Prisma (alternativa: `pg`) | Tipos automáticos y migraciones versionadas. |
| Base de datos | PostgreSQL en Docker Compose | Reproducible con un comando. |
| Calidad | ESLint + Prettier | Código consistente. |
| Pruebas | Jest + React Native Testing Library (app); Jest + Supertest (API) | Pocas pero suficientes para respaldar el CRUD. |
| Herramientas | Bruno / Postman, DBeaver / pgAdmin (opcional), Git + GitHub | Probar API y BD; historial de trabajo. |

---

## 4. Estructura de carpetas objetivo

```
EVU1_APELLIDO_NOMBRE/
├── docker-compose.yml
├── README.md                # ENTREGABLE principal
├── plan.md
├── docs/
│   └── screenshots/         # capturas para el README
├── mobile/                  # App Expo
│   ├── app/                 # Rutas (Expo Router)
│   │   ├── _layout.tsx
│   │   ├── index.tsx        # Lista de tareas
│   │   └── task/
│   │       ├── new.tsx      # Agregar
│   │       └── [id].tsx     # Editar
│   ├── src/
│   │   ├── components/      # TaskItem, TaskForm, EmptyState
│   │   ├── hooks/           # useTasks
│   │   ├── services/        # api.ts
│   │   ├── schemas/         # taskSchema.ts (Zod)
│   │   └── types/           # Task.ts
│   └── package.json
└── server/                  # API Express
    ├── src/
    │   ├── index.ts
    │   ├── routes/tasks.ts
    │   ├── controllers/tasksController.ts
    │   ├── schemas/taskSchema.ts
    │   └── db/
    ├── prisma/schema.prisma
    ├── .env.example
    └── package.json
```

Modelo de datos y API (referencia para las fases 4 y 5):

```ts
export interface Task {
  id: string;           // en la BD puede ser SERIAL; en la app se maneja como string
  title: string;        // obligatorio, máx. 100
  description: string;  // obligatorio
  createdAt?: string;
  updatedAt?: string;
}
```

| Método | Ruta | Acción | Códigos |
|---|---|---|---|
| GET | `/health` | Estado del servidor | 200 |
| GET | `/tasks` | Listar | 200 |
| POST | `/tasks` | Crear | 201, 400 |
| PUT | `/tasks/:id` | Editar | 200, 400, 404 |
| DELETE | `/tasks/:id` | Eliminar | 204, 404 |

---

## 5. Fases

Formato de cada fase: **Objetivo → Tareas del agente → Por qué → Verificación → Checkpoint**.

### Fase 0 — Preparación y verificación del entorno
**Objetivo:** confirmar que el entorno permite trabajar y resolver las preguntas abiertas (sección 1.3).

**Tareas**
- [x] Preguntar lo pendiente de la sección 1.3 (de a una).
- [x] Verificar versiones: `node -v`, `npm -v`, `git --version`, `docker --version`, `docker compose version`.
- [x] Crear el repositorio Git con `.gitignore` (`node_modules`, `.expo`, `.env`, builds) y rama `main`.
- [x] Pedirle que instale Expo Go en el teléfono o configure el emulador, según lo que elija.

**Por qué:** si Docker o Node no están bien instalados, los errores aparecen mezclados con los del proyecto y cuesta entender qué falla.

**Verificación:** todos los comandos responden con versión; `git status` funciona.

**Checkpoint:** resumir versiones y decisiones tomadas; esperar "ok" para continuar.

---

### Fase 1 — Creación del proyecto móvil
**Objetivo:** app Expo + TypeScript corriendo.

**Tareas**
- [x] Crear el proyecto en `mobile/` con `npx create-expo-app@latest` (plantilla en blanco con TypeScript; si la plantilla no incluye Expo Router, instalarlo siguiendo la documentación vigente).
- [x] Levantar con `npx expo start`; abrir en teléfono/emulador y en navegador con `--web`.
- [x] Instalar: `react-native-paper`, `react-native-safe-area-context` (si falta), `react-hook-form`, `zod`, `@hookform/resolvers`.
- [x] Activar `"strict": true` en `tsconfig`; configurar ESLint + Prettier con scripts `lint` y `format`.
- [x] Crear la estructura `src/` y el tipo `Task`.
- [x] Commit: `chore: crear proyecto Expo con TypeScript`.

**Por qué:** explicar qué es Metro (el servidor que empaqueta el código), qué hace Expo Go y por qué `strict` evita errores silenciosos.

**Verificación:** la app abre sin errores en al menos un destino; `npx tsc --noEmit` y `npm run lint` pasan.

**Checkpoint:** pedir captura de la app corriendo (servirá para el README) y confirmación.

---

### Fase 2 — Interfaz de usuario con datos de ejemplo
**Objetivo:** pantallas completas, sin lógica real todavía.

**Tareas**
- [x] Envolver la app en `PaperProvider` (en `_layout.tsx`).
- [x] Pantalla de lista (`app/index.tsx`): header, `FlatList`, estado vacío ("No hay tareas pendientes").
- [x] Componente `TaskItem`: título, descripción, botón editar y botón eliminar (aún sin acción).
- [x] Componente `TaskForm`: `TextInput` de título, `TextInput` multilínea de descripción, `Button` "Guardar".
- [x] Botón flotante (FAB) para ir a "Nueva tarea"; ruta `task/new`.
- [x] Usar un arreglo `mockTasks` para ver la lista.

**Por qué:** separar componentes (`TaskItem`, `TaskForm`) permite reutilizar el formulario para agregar y editar; `FlatList` renderiza solo lo visible, a diferencia de `ScrollView`.

**Verificación:** se navega lista ↔ formulario; la lista muestra los datos de ejemplo; sin errores de TypeScript ni advertencias en consola.

**Checkpoint:** capturas de lista y formulario.

---

### Fase 3 — CRUD local (sin backend)
**Objetivo:** cumplir los requisitos con estado local. **Es el plan de respaldo**: si Docker o la API fallan, la entrega mínima ya existe.

**Tareas**
- [ ] Crear `useTasks` (estado con `useState`/`useReducer` o Context) con `addTask`, `updateTask`, `deleteTask`.
- [ ] Esquema Zod `taskSchema` (título y descripción obligatorios, título máx. 100) integrado con React Hook Form; mensajes de error bajo cada campo.
- [ ] **Agregar:** guardar y **limpiar los campos** del formulario.
- [ ] **Editar:** formulario con datos precargados (`task/[id]`).
- [ ] **Eliminar:** botón por tarea con confirmación (`Dialog` de Paper).

**Por qué:** construir primero la lógica sin red permite entender el flujo de datos y la validación sin mezclar problemas de conexión.

**Verificación (manual):** agregar → aparece y el formulario queda vacío; editar → cambia; eliminar → desaparece; enviar vacío → muestra errores.

**Checkpoint:** capturas de agregar, editar y eliminar; confirmación.

---

### Fase 4 — PostgreSQL en Docker
**Objetivo:** base de datos reproducible con un comando.

**Tareas**
- [ ] Crear `docker-compose.yml` en la raíz con servicio `db` (imagen `postgres:16`, volumen `pgdata`, puerto 5432, credenciales desde variables de entorno con valores por defecto de desarrollo).
- [ ] `docker compose up -d`; verificar con `docker compose ps` y conectarse con DBeaver/pgAdmin.
- [ ] Definir la tabla `tasks` (`id` autoincremental, `title VARCHAR(100) NOT NULL`, `description TEXT NOT NULL`, `created_at`, `updated_at`) mediante migración de Prisma o script SQL.
- [ ] Crear `server/.env.example` con `DATABASE_URL` de ejemplo.

**Por qué:** el volumen conserva los datos aunque se destruya el contenedor; las variables de entorno evitan credenciales fijas en el código.

**Verificación:** el contenedor está `running`/`healthy` y la tabla `tasks` existe (consulta `SELECT * FROM tasks;` sin error).

**Checkpoint:** confirmar que la BD responde.

---

### Fase 5 — API REST con Express + TypeScript
**Objetivo:** backend con CRUD probado fuera de la app.

**Tareas**
- [ ] Inicializar `server/` con TypeScript, `express`, `cors`, `dotenv`, `zod` y Prisma (o `pg`); script `dev` con `tsx`.
- [ ] Implementar los endpoints de la sección 4 con rutas → controladores → acceso a datos.
- [ ] Validar el body con Zod; responder con los códigos de la tabla.
- [ ] Middleware de errores y CORS.
- [ ] Probar cada endpoint con Bruno/Postman y guardar la colección en `docs/api/`.
- [ ] (Opcional) Pruebas con Jest + Supertest.

**Por qué:** probar la API sola aísla errores: si falla en Postman, el problema es del servidor; si funciona ahí pero no en la app, es de la integración.

**Verificación:** `curl http://localhost:3000/health` responde 200; los 4 endpoints funcionan contra PostgreSQL; `npx tsc --noEmit` pasa.

**Checkpoint:** mostrar resultados de las pruebas de los endpoints.

---

### Fase 6 — Integración app ↔ API
**Objetivo:** reemplazar el estado local por datos reales.

**Tareas**
- [ ] Crear `src/services/api.ts` con la URL base en `EXPO_PUBLIC_API_URL`.
- [ ] URL según el destino:
  - Teléfono físico: IP local del computador (`http://192.168.x.x:3000`), misma red Wi-Fi.
  - Emulador Android: `http://10.0.2.2:3000`.
  - Navegador (web): `http://localhost:3000`.
- [ ] Instalar TanStack Query; reescribir `useTasks` con `useQuery` (listar) y `useMutation` (agregar/editar/eliminar) invalidando la caché.
- [ ] Mostrar estados de carga y error ("No se pudo conectar con el servidor").
- [ ] Mantener que el formulario se limpie al agregar.

**Por qué:** `localhost` en el teléfono apunta al propio teléfono, no al computador; por eso la URL cambia según dónde corre la app. TanStack Query evita escribir a mano el manejo de carga/errores.

**Verificación:** el CRUD completo funciona desde la app; los datos persisten al cerrar y reabrir; con el servidor apagado, la app muestra el error sin cerrarse.

**Checkpoint:** capturas finales de la app funcionando con datos reales.

---

### Fase 7 — Pruebas y pulido
**Tareas**
- [ ] Prueba manual completa: campos vacíos, texto muy largo, servidor apagado, eliminar la última tarea.
- [ ] (Opcional) Prueba de `TaskForm` con React Native Testing Library (valida y limpia campos).
- [ ] `npm run lint`, `npx tsc --noEmit` y formato sin errores en `mobile/` y `server/`.
- [ ] Revisar que no queden `console.log` de depuración ni credenciales.
- [ ] Revisar tamaños táctiles de botones y legibilidad.

**Verificación:** todos los comandos pasan; checklist manual completa.

---

### Fase 8 — README.md y entrega
**Objetivo:** el `README.md` es el entregable; debe permitir que alguien levante todo sin ayuda.

**Contenido del README (en este orden)**
1. Título, descripción breve y contexto (asignatura, Unidad 1, nombre de la estudiante).
2. Tecnologías usadas (con una línea de por qué), incluyendo que el uso de React Native fue indicado por el profesor.
3. Requisitos previos (Node, Docker, Expo Go/emulador) con versiones usadas.
4. Instalación y ejecución paso a paso: BD (`docker compose up -d`), API, app; variables de entorno (`.env.example`).
5. Estructura de archivos (árbol comentado).
6. Componentes principales y su función (`TaskItem`, `TaskForm`, pantallas, `useTasks`).
7. Endpoints de la API.
8. Funcionalidades con capturas (`docs/screenshots/`): lista, agregar, editar, eliminar.
9. Próximos pasos (almacenamiento local, autenticación, APIs externas).

**Tareas**
- [ ] Pedirle a la usuaria las capturas (el agente no puede tomarlas del teléfono) y guardarlas en `docs/screenshots/` con nombres claros (`01-lista.png`, `02-agregar.png`, ...).
- [ ] Redactar el README y probarlo: seguir los pasos desde cero en una carpeta limpia.
- [ ] Limpiar antes de comprimir: sin `node_modules/`, `.expo/` ni `.env`.
- [ ] Comprimir como `EVU1_APELLIDO_NOMBRE.zip` (incluye `docker-compose.yml`, `.env.example`, `README.md`, `docs/`).
- [ ] Descomprimir el zip en otra carpeta y comprobar que el README basta para levantarlo.

**Verificación:** el zip abre, contiene todo lo anterior y pesa poco (sin dependencias).

**Checkpoint final:** la usuaria sube el zip a la plataforma.

---

## 6. Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| La app no llega a la API desde el teléfono | Se usa `localhost` o hay redes distintas | Usar IP local; mismo Wi-Fi; probar `/health` desde el navegador del teléfono. |
| Error de CORS en la versión web | Falta configurar `cors` en Express | Habilitar CORS en desarrollo. |
| Expo Go no abre el proyecto | Versión de Expo Go no coincide con el SDK | Actualizar Expo Go o probar en emulador/web. |
| Puerto 5432 ocupado | Otro PostgreSQL local corriendo | Cambiar el puerto expuesto en Compose o detener el otro servicio. |
| Prisma no encuentra la BD | `DATABASE_URL` mal escrita o contenedor apagado | Revisar `.env` y `docker compose ps`. |

---

## 7. Definición de terminado

- [ ] La app lista, agrega (limpiando el formulario), edita y elimina tareas con título y descripción.
- [ ] Los datos persisten en PostgreSQL (Docker) mediante la API Express.
- [ ] `npx tsc --noEmit` y `npm run lint` pasan en `mobile/` y `server/`.
- [ ] El README permite levantar todo desde cero y incluye estructura, componentes y capturas.
- [ ] El zip se llama `EVU1_APELLIDO_NOMBRE.zip`, sin `node_modules`, `.expo` ni `.env`.

---

## 8. Registro de progreso (el agente actualiza esto al cerrar cada fase)

| Fase | Estado | Notas |
|---|---|---|
| 0 Preparación | ✅ Completada | Node 24.20.0; npm 11.19.0; Git 2.53.0; Docker 29.7.2 / Compose 5.5.1; Windows; teléfono físico; Prisma; `main`; Expo Go verificada en Fase 1. |
| 1 Proyecto móvil | ✅ Completada | Expo SDK 57 + Router; TypeScript strict; Paper, React Hook Form, Zod; ESLint/Prettier; web verificada y Expo Go confirmada por la usuaria; commit `644c471`. |
| 2 Interfaz | ✅ Completada | PaperProvider; FlatList/mockTasks; TaskItem y TaskForm; navegación web lista↔formulario sin errores ni advertencias. FAB visual con Pressable; Paper TextInput en móvil y nativo en web; Metro resuelto al sincronizar `main`; commit `1a62a59` publicado en `main` y `fase-2-ui`. |
| 3 CRUD local | ⬜ Pendiente | |
| 4 PostgreSQL Docker | ⬜ Pendiente | |
| 5 API Express | ⬜ Pendiente | |
| 6 Integración | ⬜ Pendiente | |
| 7 Pruebas y pulido | ⬜ Pendiente | |
| 8 README y entrega | ⬜ Pendiente | |
