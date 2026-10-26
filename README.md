# Granary

Angular workspace with two independently deployable applications and a shared
workspace library:

- `projects/admin-app` — administration panel
- `projects/user-app` — user-facing application
- `projects/shared` — services, models, components, and utilities used by both

## Local development

The local API proxy forwards `/api`, `/uploads`, and `/images` to
`https://localhost:7290`. Start the local backend on that address before
starting the frontend.

```bash
npm run start:user
npm run start:admin
```

## Production builds

```bash
npm run build:user
npm run build:admin
npm run build
```

The individual outputs are `dist/user-app/browser` and
`dist/admin-app/browser`.

## Vercel

Create one Vercel project for each app, using the repository root as the root
directory. Set the build command and output directory as follows:

| App | Build command | Output directory |
| --- | --- | --- |
| User | `npm run build:user` | `dist/user-app/browser` |
| Admin | `npm run build:admin` | `dist/admin-app/browser` |

`vercel.json` forwards `/api`, `/uploads`, and `/images` to
`https://granary-api.onrender.com`; it also provides the SPA fallback for each
deployment.
