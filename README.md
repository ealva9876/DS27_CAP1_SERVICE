# DS27 · Contratistas MINVU

Cliente para probar el servicio SOAP de contratistas constructores (DS27):

`http://wsminvuni.minvu.cl/WSICEContratistas/ContratistaConstructorDS27.asmx?wsdl`

Incluye UI web y un smoke test por CLI. El endpoint remoto está fijo en el servidor; no acepta URLs arbitrarias.

## Requisitos

- Node.js 20 o superior
- npm 10+
- Acceso de red a `wsminvuni.minvu.cl` (HTTP)

## Cómo abrirlo en VS Code

1. Clona este repositorio (o descomprime el ZIP del proyecto).
2. En VS Code: **File → Open Folder…** y elige la carpeta del proyecto.
3. Abre la terminal integrada (`Ctrl+Ñ` / `Ctrl+\``) y ejecuta:

```bash
npm install
npm run dev
```

4. Abre [http://localhost:3847](http://localhost:3847) en el navegador.
5. Ingresa un RUT (cuerpo numérico, sin DV). Ejemplo con datos: `76528588`.

### Atajos de VS Code

Con las tareas incluidas en `.vscode/`:

| Acción | Cómo |
|--------|------|
| Instalar dependencias | `Terminal → Run Task… → npm: install` |
| Arrancar en desarrollo | `Terminal → Run Task… → npm: dev` |
| Depurar Next.js | `Run and Debug → Next.js: debug server` (F5) |
| Smoke test SOAP | `Terminal → Run Task… → npm: test:soap` |

Extensiones recomendadas: ESLint, Tailwind CSS IntelliSense, Pretty TypeScript Errors.

## Scripts

```bash
npm run dev        # http://localhost:3847
npm run build      # build de producción
npm run start      # sirve el build en :3847
npm run lint       # ESLint
npm run test:soap  # llama al ASMX real (RUT opcional: npm run test:soap -- 76528588)
```

## API local

### `GET /api/health`

Comprueba que el WSDL responde.

### `POST /api/contratista`

```json
{ "rut": "76528588" }
```

También acepta `12.345.678-9` (usa solo el cuerpo numérico).

## Contrato SOAP

| Campo | Valor |
|-------|--------|
| Operación | `ObtenerContratistaPorRut` |
| Namespace | `http://minvu.WSICE.Contratistas/` |
| SOAPAction | `http://minvu.WSICE.Contratistas/ObtenerContratistaPorRut` |
| Entrada | `input.Rut` (`xsd:int`) |
| Salida | string con XML ICE escapado |

## Estructura

```
src/
  app/                 # App Router (UI + route handlers)
  components/          # SoapTester
  lib/soap.ts          # Cliente SOAP y parser ICE
scripts/smoke-soap.mjs # Prueba directa al ASMX
.vscode/               # launch, tasks y recomendaciones
```
