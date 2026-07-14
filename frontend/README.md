# Frontend — Gestion de transport & logistique (React + TypeScript)

Interface web construite avec **Vite + React 18 + TypeScript**, **Material UI**, **Redux Toolkit**,
**React Query** et **Axios**. Ce socle porte le module **Authentification** (login, session,
routes protégées, RBAC) et servira de base à tous les modules métier.

## Stack

- Vite + React 18 + TypeScript
- Material UI 5 (thème commun dans `src/theme/theme.ts`)
- Redux Toolkit (état de session) + React Redux
- React Query (appels serveur)
- Axios (client HTTP + intercepteurs JWT + refresh automatique)
- react-hook-form + zod (validation des formulaires)
- notistack (notifications succès/erreur)

## Démarrage

```bash
cd frontend
npm install
copy .env.example .env    # VITE_API_URL=http://localhost:3000/api
npm run dev              # http://localhost:5173
```

Le backend doit tourner sur `http://localhost:3000` (voir ../backend).

## Structure

```
src/
├── app/            # store Redux + hooks typés
├── lib/            # axios (intercepteurs + refresh), queryClient
├── theme/          # thème Material UI
├── utils/          # tokenStorage, notify
├── features/auth/  # slice, api, hooks (useAuth/useLogin), AuthProvider
├── components/
│   ├── layout/     # AuthLayout, MainLayout, Sidebar
│   ├── routing/    # ProtectedRoute, PublicRoute, RequireRole
│   └── feedback/   # Loader, SnackbarConfigurator
├── pages/          # LoginPage, DashboardPage, ForbiddenPage(403), NotFoundPage(404)
├── routes/         # AppRoutes
├── App.tsx
└── main.tsx
```

## Comptes de démonstration

| E-mail | Mot de passe | Rôle |
|---|---|---|
| admin@transport.ma | Passw0rd! | ADMIN |
| gestion@transport.ma | Passw0rd! | GESTIONNAIRE |
| compta@transport.ma | Passw0rd! | COMPTABLE |

## Fonctionnement de l'authentification

1. **Login** → `POST /auth/login` → tokens stockés (localStorage) + utilisateur en Redux.
2. **Restauration de session** (`AuthProvider`) → au rechargement, `GET /auth/me` réhydrate l'utilisateur.
3. **Refresh automatique** → sur `401`, l'intercepteur Axios appelle `/auth/refresh` (single-flight)
   et rejoue la requête ; en cas d'échec → déconnexion + redirection `/login`.
4. **Routes protégées** → `ProtectedRoute` ; **RBAC** → `RequireRole` (403 si non autorisé).
```
