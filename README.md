# github-mcp-agent

MCP Server en Node.js + TypeScript que expone un catálogo de *tools* para automatizar operaciones de GitHub (crear repositorios, abrir issues, listar recursos y hacer commits reales), pensado para ser consumido por un agente de IA (LLM) desde **Antigravity** vía el protocolo MCP (Model Context Protocol).

El servidor no tiene interfaz gráfica propia ni base de datos: el "frontend" es el LLM que interpreta pedidos en lenguaje natural y decide qué tool invocar, y el "storage" es GitHub mismo.

## Uso de IA en el desarrollo

Documentación completa y auditable del uso de IA durante este proyecto (bitácora, decisiones, preparación de la defensa): [carpeta de Google Drive](https://drive.google.com/drive/folders/1hySGV83Z9Fpu3wPlvTVSdCaUnRcKvEVt?usp=sharing).

---

## Índice

- [Uso de IA en el desarrollo](#uso-de-ia-en-el-desarrollo)
- [¿Qué hace y por qué es útil?](#qué-hace-y-por-qué-es-útil)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Obtener un GitHub Personal Access Token](#obtener-un-github-personal-access-token)
- [Configurar las variables de entorno](#configurar-las-variables-de-entorno)
- [Configurar el servidor en Antigravity](#configurar-el-servidor-en-antigravity)
- [Tools disponibles](#tools-disponibles)
- [Ejemplos de uso](#ejemplos-de-uso)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [Licencia](#licencia)

---

## ¿Qué hace y por qué es útil?

Le da a un agente de IA la capacidad de operar tu cuenta de GitHub usando lenguaje natural, en vez de que tengas que ejecutar comandos de `git`/`gh` o navegar la interfaz web a mano. Casos de uso típicos:

- **Crear un repositorio nuevo** para arrancar un proyecto, sin salir del chat con el agente.
- **Reportar o triagear issues** rápidamente, describiendo el problema en lenguaje natural.
- **Revisar qué repositorios tenés** o qué issues están abiertos en uno puntual, sin abrir el navegador.
- **Subir o actualizar un archivo** (por ejemplo un `README`, un `CHANGELOG`, un script) con un commit real, describiendo el cambio en texto.

Cada acción devuelve **evidencia verificable** (una URL, un número de issue, un SHA de commit) para que puedas confirmar en GitHub que la operación efectivamente ocurrió — el agente actúa y deja rastro auditable, no solo sugiere.

---

## Arquitectura

```
┌──────────────┐      ┌────────────────┐      ┌───────────────────┐      ┌─────────────────┐
│  Antigravity │─────▶│  LLM            │─────▶│  MCP Server        │─────▶│  API de GitHub   │
│  (Host)      │◀─────│  (Client)       │◀─────│  (este proyecto)   │◀─────│  (vía Octokit)   │
└──────────────┘      └────────────────┘      └───────────────────┘      └─────────────────┘
   gestiona la          interpreta el          expone las tools,           ejecuta la
   sesión y conecta      pedido y decide        valida inputs con           operación real
   los componentes       qué tool usar          Zod, ejecuta la             y devuelve el
                         y con qué params        operación y                resultado
                                                  traduce errores
```

La comunicación entre Antigravity y este servidor es exclusivamente por **stdio** (entrada/salida estándar del proceso), no por HTTP: Antigravity lanza el servidor como proceso hijo. Por eso `stdout` está reservado íntegramente al protocolo JSON-RPC 2.0 de MCP — todo el logging de diagnóstico va por `stderr`.

---

## Requisitos

- **Node.js 18+** (desarrollado y probado con Node `24.16.0`; ver `.nvmrc`). Si usás `nvm`, `nvm use` toma la versión automáticamente.
- Una cuenta de **GitHub** con posibilidad de generar un Personal Access Token (classic).
- **Antigravity** instalado, si querés conectar el servidor a un LLM real (no es necesario para desarrollar o correr los tests).

---

## Instalación

```bash
git clone https://github.com/ciro-castellaro/ProyectoM5-Ciro_Castellaro.git
cd ProyectoM5-Ciro_Castellaro
npm install
npm run build
```

Scripts disponibles (`package.json`):

| Script | Qué hace |
|---|---|
| `npm run build` | Compila TypeScript (`src/`) a JavaScript (`dist/`) |
| `npm run dev` | Corre el servidor directo desde TypeScript con recarga automática (`tsx watch`) |
| `npm start` | Corre la versión ya compilada (`node dist/server.js`) — la que usa Antigravity en producción |
| `npm run test` | Corre la suite de tests con Vitest |

---

## Obtener un GitHub Personal Access Token

1. En GitHub: **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. **Generate new token (classic)**.
3. Nombre descriptivo, por ejemplo `mcp-github-agent`.
4. Scopes necesarios:
   - **`repo`** — obligatorio. Es el que usan las 5 tools para leer/escribir repositorios, issues y commits.
   - **`user`** — recomendado, información básica del usuario autenticado.
   - **`admin:org`** — **no lo actives** salvo que necesites operar sobre organizaciones; no lo usa ninguna tool de este proyecto.
5. Generá el token y **copialo de inmediato** — GitHub no lo vuelve a mostrar.

> El token nunca debe pegarse en el código, en un commit, ni en la configuración de Antigravity en texto plano. Ver las dos secciones siguientes.

---

## Configurar las variables de entorno

Copiá la plantilla y completá tu token:

```bash
cp .env.example .env
```

`.env` (nunca se commitea, está en `.gitignore`):

```
GITHUB_TOKEN=ghp_tu_token_aca
LOG_LEVEL=info
```

- `GITHUB_TOKEN`: el Personal Access Token del paso anterior.
- `LOG_LEVEL`: `debug` | `info` | `warn` | `error` (opcional, default `info`). Todos los logs van por `stderr`, nunca por `stdout`.

El servidor carga `.env` automáticamente con la carga nativa de Node (`process.loadEnvFile()`, sin dependencia `dotenv`). Si `.env` no existe, asume que las variables ya están definidas en el entorno del sistema (por ejemplo, cuando Antigravity las inyecta directamente).

---

## Configurar el servidor en Antigravity

En Antigravity: click en `...` en el panel del agente → **MCP Servers → Manage MCP Servers → View raw config** para abrir el archivo de configuración real de tu instalación (el nombre y la ubicación exacta pueden variar según versión/sistema operativo — no asumirlo, abrirlo y confirmarlo ahí). En Windows suele estar en `%userprofile%\.gemini\config\mcp_config.json`.

Agregá la entrada del servidor:

```json
{
  "mcpServers": {
    "github-mcp-agent": {
      "command": "node",
      "args": ["/ruta/absoluta/a/donde/clonaste/el/proyecto/dist/server.js"]
    }
  }
}
```

Puntos clave:

- **`args` es una ruta absoluta que cada quien tiene que adaptar a su propia máquina** — `mcp_config.json` no es parte de este repositorio, vive en la instalación local de Antigravity de cada usuario. Si vos (u otra persona) clonaste el proyecto en, por ejemplo, `C:\Users\vos\proyectos\github-mcp-agent`, el `args` tiene que apuntar ahí, no a la ruta de otra persona. Esto es igual en cualquier MCP server (Claude Desktop, Cursor, etc.): el host necesita la ruta real del ejecutable en ese disco.
- **Usar la build compilada** (`node dist/server.js`), no `npx tsx src/server.ts` — eso queda solo para desarrollo activo.
- **No hace falta ningún bloque `env` en esta configuración.** El servidor carga su propio `GITHUB_TOKEN` directamente desde el `.env` del proyecto (`process.loadEnvFile()`, resuelto por la ubicación del propio archivo compilado, no por el directorio desde el que Antigravity lance el proceso) — alcanza con tener `.env` completo en la carpeta del proyecto, como se explicó arriba.
- **Se probó explícitamente pasar el token vía interpolación `${GITHUB_TOKEN}` en un bloque `env`, apoyándose en una variable de entorno del sistema operativo, y no funcionó de forma confiable**: en pruebas reales, Antigravity no heredaba los cambios de esa variable hacia el proceso del servidor, ni cerrando/reabriendo la app ni con un reinicio completo de Windows. Por eso la configuración final evita depender del entorno del sistema por completo y usa únicamente el `.env` del proyecto, que sí se probó robusto sin importar cómo se lance el proceso.
- Reiniciar Antigravity por completo (cerrar y volver a abrir) después de guardar `mcp_config.json` o de modificar el `.env`, para que el servidor arranque de cero y tome los cambios.

---

## Tools disponibles

Todas devuelven texto con evidencia verificable (URL, número, SHA) en caso de éxito, y un mensaje en lenguaje natural (sin stack traces ni datos sensibles) en caso de error.

### `create_repository`

Crea un nuevo repositorio en la cuenta autenticada (con un README inicial, para que quede listo para usar `create_commit` de inmediato).

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `name` | string | Sí | 3–100 caracteres, solo letras/números/puntos/guiones/guiones bajos |
| `description` | string | No | hasta 350 caracteres |
| `private` | boolean | No | default `false` |

**Ejemplo de prompt:** *"Creá un repositorio público llamado `demo-api` con la descripción 'API de prueba para el curso'."*

### `create_issue`

Abre un issue en un repositorio existente.

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `owner` | string | Sí | dueño del repositorio |
| `repo` | string | Sí | nombre del repositorio |
| `title` | string | Sí | hasta 256 caracteres |
| `body` | string | No | descripción del issue |
| `labels` | string[] | No | sin duplicados, hasta 100 |
| `assignees` | string[] | No | hasta 10 |
| `milestone` | number | No | número entero positivo del milestone existente en el repo |

**Ejemplo de prompt:** *"Abrí un issue en ciro-castellaro/demo-api con el título 'Agregar autenticación' explicando que falta el login con OAuth, y asignalo al milestone 3."*

### `list_repositories`

Lista los repositorios del usuario autenticado.

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `page` | number | No | default `1` |
| `perPage` | number | No | default `30`, máx. `100` |
| `sort` | enum | No | `created` \| `updated` \| `pushed` \| `full_name`, default `updated` |
| `direction` | enum | No | `asc` \| `desc`, default `desc` |
| `type` | enum | No | `all` \| `owner` \| `member`, default `owner` |

**Ejemplo de prompt:** *"Mostrame mis últimos 5 repositorios ordenados por fecha de actualización."*

### `create_commit`

Agrega o modifica un archivo en una rama existente, con el flujo de Git internals (blob → tree → commit → ref).

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `owner` | string | Sí | |
| `repo` | string | Sí | |
| `branch` | string | Sí | debe existir previamente |
| `path` | string | Sí | ruta del archivo dentro del repo |
| `content` | string | Sí | contenido completo del archivo |
| `message` | string | Sí | mensaje del commit |

**Ejemplo de prompt:** *"Agregá un archivo CHANGELOG.md al repositorio ciro-castellaro/demo-api en la rama main con el contenido '# Changelog\n\n## v1.0.0 - Lanzamiento inicial' y el mensaje 'Add initial changelog'."*

### `list_issues`

Lista los issues (nunca pull requests, se excluyen automáticamente) de un repositorio puntual.

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `owner` | string | Sí | |
| `repo` | string | Sí | |
| `state` | enum | No | `open` \| `closed` \| `all`, default `open` |
| `labels` | string[] | No | |
| `sort` | enum | No | `created` \| `updated` \| `comments`, default `created` |
| `direction` | enum | No | `asc` \| `desc`, default `desc` |
| `page` | number | No | default `1` |
| `perPage` | number | No | default `30`, máx. `100` |

**Ejemplo de prompt:** *"Mostrame los issues abiertos del repositorio ciro-castellaro/demo-api, ordenados por fecha de creación."*

### `ping`

Tool de diagnóstico sin parámetros, responde `"pong"`. Sirve para confirmar que el servidor está conectado antes de usar las tools reales — no ejecuta ninguna operación contra GitHub.

---

## Ejemplos de uso

Evidencia real generada durante el desarrollo (verificado con MCP Inspector contra una cuenta de GitHub real):

```
> create_repository { name: "mcp-agent-test", description: "..." }
Repositorio creado: ciro-castellaro/mcp-agent-test (https://github.com/ciro-castellaro/mcp-agent-test). Visibilidad: publico.

> create_issue { owner: "ciro-castellaro", repo: "mcp-agent-test", title: "Test issue from MCP agent", body: "..." }
Issue #1 creado: "Test issue from MCP agent" (https://github.com/ciro-castellaro/mcp-agent-test/issues/1).

> create_commit { owner: "ciro-castellaro", repo: "mcp-agent-test", branch: "main", path: "test-commit.md", content: "...", message: "Add test-commit.md via create_commit" }
Commit creado: bb4bdf0bbb9c0bdf19ff58bed23483d1527e18ba — "Add test-commit.md via create_commit" (https://github.com/ciro-castellaro/mcp-agent-test/commit/bb4bdf0bbb9c0bdf19ff58bed23483d1527e18ba).

> list_issues { owner: "ciro-castellaro", repo: "mcp-agent-test" }
- #1 [open] Test issue from MCP agent — https://github.com/ciro-castellaro/mcp-agent-test/issues/1

> list_repositories { perPage: 3 }
- ciro-castellaro/ProyectoM5-Ciro_Castellaro (publico) — https://github.com/ciro-castellaro/ProyectoM5-Ciro_Castellaro
- ciro-castellaro/mcp-agent-test (publico) — https://github.com/ciro-castellaro/mcp-agent-test
- ciro-castellaro/ProyectoM2-Ciro_Castellaro (publico) — https://github.com/ciro-castellaro/ProyectoM2-Ciro_Castellaro
```

Un ejemplo de un input inválido, rechazado **sin** llamar a la API de GitHub:

```
> create_repository { name: "ab" }
isError: true
"El nombre del repositorio debe tener al menos 3 caracteres"
```

Y de un error real de GitHub traducido a lenguaje natural:

```
> list_issues { owner: "ciro-castellaro", repo: "este-repo-no-existe" }
isError: true
"El recurso solicitado no fue encontrado en GitHub. Verifica el owner y el nombre del repositorio."
```

Podés probar cualquiera de estos directamente con **MCP Inspector**, sin necesidad de Antigravity:

```bash
npx @modelcontextprotocol/inspector --cli node dist/server.js --method tools/list
npx @modelcontextprotocol/inspector --cli node dist/server.js --method tools/call --tool-name list_repositories
```

---

## Tests

```bash
npm run test
```

39 tests con Vitest, deterministas, **sin ninguna llamada real a la API de GitHub** (el cliente de Octokit se mockea inyectándolo en el constructor de `GitHubClient`):

- `tests/tools.test.ts` — validación de los 5 schemas de Zod (inputs válidos e inválidos).
- `tests/github.test.ts` — las 5 operaciones de `GitHubClient` con Octokit mockeado, incluyendo casos de error (repositorio inexistente, credenciales inválidas) y el comportamiento de reintento ante errores recuperables.
- `tests/errors.test.ts` — clasificación y traducción de errores (401/403/404/422/429/5xx) a mensajes en lenguaje natural.

---

## Troubleshooting

| Error / síntoma | Causa probable | Qué hacer |
|---|---|---|
| El servidor no arranca, log `GITHUB_TOKEN no esta configurado` | Falta `.env` en la carpeta del proyecto, o la línea `GITHUB_TOKEN=` está vacía | Verificar que `.env` existe junto a `package.json` y tiene `GITHUB_TOKEN=...` con un valor real |
| `El token de GitHub es invalido o expiro` (401) | Token vencido, revocado, o mal copiado | Generar un nuevo Personal Access Token y actualizar `.env` |
| Rotaste el token, actualizaste `.env`, pero Antigravity sigue devolviendo 401 con el token viejo (incluso después de cerrar y reabrir la app, o de reiniciar Windows) | Antigravity no relanzó realmente el proceso del servidor, o quedó una variable de entorno del sistema llamada `GITHUB_TOKEN` de una configuración anterior pisando el valor del `.env` (`.env` nunca sobreescribe una variable ya definida en el entorno) | Verificar que no exista una variable de entorno de sistema `GITHUB_TOKEN` residual (`[Environment]::GetEnvironmentVariable("GITHUB_TOKEN","User")` en PowerShell) y borrarla si aparece; confirmar el `.env` corriendo `node dist/server.js` directo en una terminal nueva (sin Antigravity) antes de volver a probar desde ahí |
| `El token no tiene permisos suficientes` (403, no rate limit) | Al token le falta el scope `repo` | Regenerar el token con el scope `repo` activado |
| `Se alcanzo el limite de solicitudes de la API de GitHub` (403, rate limit) | Se agotó el límite de requests de la API | Esperar al momento indicado por GitHub (`x-ratelimit-reset`); el servidor reintenta automáticamente hasta 3 veces |
| `El recurso solicitado no fue encontrado en GitHub` (404) | `owner`/`repo` mal escrito, o el repo no existe/no es accesible con este token | Verificar el nombre exacto del owner y del repositorio |
| `create_commit` falla aunque el repositorio existe | La rama indicada no existe todavía | Usar una rama existente (los repos creados con `create_repository` ya tienen `main` lista, gracias al README inicial) |
| Antigravity no lista las tools | El servidor no está registrado correctamente, o falta reiniciar Antigravity | Confirmar la config en "View raw config", verificar que el `command`/`args` apunten a `dist/server.js`, y recargar Antigravity |
| Antigravity se desconecta o tira errores de protocolo | Algo está escribiendo por `stdout` en vez de `stderr` | Revisar que no se haya agregado ningún `console.log` (todo el logging debe pasar por `utils/logging.ts`, que usa `console.error`) |
| `npm run build` falla con `Cannot find name 'process'` | Falta el ajuste de tipos de Node en `tsconfig.json` | Ya está resuelto en este proyecto (`"types": ["node"]`); si aparece de nuevo, confirmar que `@types/node` esté instalado |

---

## Licencia

MIT — ver [`LICENSE`](./LICENSE).
