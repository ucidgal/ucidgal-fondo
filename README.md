# Fondo Islámico de Repatriación · UCIDGAL
## Guía de despliegue paso a paso

---

## PASO 1 — Crear base de datos en Supabase (gratis)

1. Ve a https://supabase.com y crea una cuenta gratuita
2. Haz clic en "New project"
   - Nombre: `ucidgal-fondo`
   - Contraseña: elige una segura y guárdala
   - Región: `West EU (Ireland)` — la más cercana a España
3. Espera ~2 minutos a que se cree el proyecto
4. Ve a **SQL Editor** (icono de base de datos en el menú izquierdo)
5. Copia y pega todo el contenido del archivo `src/lib/schema.sql`
6. Haz clic en **Run** — esto crea todas las tablas
7. Ve a **Settings → API** y copia:
   - `Project URL` → lo necesitas para el siguiente paso
   - `anon public key` → lo necesitas para el siguiente paso

## PASO 2 — Crear usuario administrador en Supabase

1. Ve a **Authentication → Users**
2. Haz clic en **Add user**
3. Introduce tu email y contraseña de administrador
4. ¡Ya tienes tu login!

## PASO 3 — Publicar en Vercel (gratis)

### Opción A: Con GitHub (recomendado)
1. Crea cuenta en https://github.com (si no tienes)
2. Crea un repositorio nuevo llamado `ucidgal-fondo`
3. Sube todos los archivos de esta carpeta a ese repositorio
4. Ve a https://vercel.com → "Add New Project"
5. Conecta tu cuenta de GitHub y selecciona el repositorio
6. En **Environment Variables** añade:
   - `REACT_APP_SUPABASE_URL` = tu Project URL de Supabase
   - `REACT_APP_SUPABASE_ANON_KEY` = tu anon key de Supabase
7. Haz clic en **Deploy**
8. En ~2 minutos tendrás la app en una URL como `ucidgal-fondo.vercel.app`

### Opción B: Sin GitHub (más sencillo)
1. Instala Node.js desde https://nodejs.org (versión LTS)
2. Abre la terminal en esta carpeta
3. Copia `.env.example` como `.env.local` y rellena tus claves
4. Ejecuta: `npm install`
5. Ejecuta: `npm run build`
6. Instala Vercel CLI: `npm install -g vercel`
7. Ejecuta: `vercel` y sigue las instrucciones
8. Cuando te pida las variables de entorno, introduce las de Supabase

## PASO 4 — Dominio propio (opcional)

Si quieres usar `fondo.ucidgal.org` en lugar de `ucidgal-fondo.vercel.app`:
1. En Vercel → tu proyecto → **Settings → Domains**
2. Añade tu dominio
3. Vercel te dará unas DNS que añadir en tu proveedor de dominio

---

## Estructura del proyecto

```
ucidgal/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   ├── supabase.js     ← conexión a base de datos
│   │   ├── auth.js         ← gestión de sesión
│   │   └── schema.sql      ← estructura de la base de datos
│   ├── pages/
│   │   ├── Login.jsx       ← pantalla de acceso
│   │   ├── Dashboard.jsx   ← panel principal
│   │   ├── Afiliados.jsx   ← gestión de afiliados
│   │   ├── Cuotas.jsx      ← cuotas y pagos
│   │   └── Siniestros.jsx  ← expedientes de fallecidos
│   ├── App.jsx             ← navegación principal
│   ├── index.js            ← punto de entrada
│   └── index.css           ← estilos globales
├── .env.example            ← plantilla de variables de entorno
├── vercel.json             ← configuración de despliegue
└── package.json
```

## Costes

| Servicio | Plan | Precio |
|----------|------|--------|
| Supabase | Free (hasta 500MB, 50.000 filas) | 0€/mes |
| Vercel   | Hobby (ilimitado para proyectos pequeños) | 0€/mes |
| Dominio  | Opcional | ~10€/año |

Para el volumen de UCIDGAL, el plan gratuito es más que suficiente.

## ¿Necesitas ayuda?

Cualquier modificación futura — nuevos módulos, cambios de diseño, exportación PDF,
envío de emails automáticos, etc. — puedes solicitarla en Claude (claude.ai)
describiendo lo que necesitas. El código está estructurado para facilitar
cambios sin romper lo existente.
