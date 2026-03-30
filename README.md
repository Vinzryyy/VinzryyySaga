# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## X Auto Sync

This project includes a sync script for pulling media posts from X API v2 and updating:

- `armeniaca-authentic-archive.json`
- `src/data/xArchive.json`

### Setup

1. Copy `.env.example` to `.env`
2. Add your `X_BEARER_TOKEN`
3. (Optional) change `X_USERNAME`, `X_SYNC_MAX_PAGES`, `X_SYNC_PAGE_SIZE`

### Run Sync

```bash
npm run sync-x
```

The script stores sync state in `.sync/x-sync-state.json` and uses `since_id` to fetch only new posts on next run.
