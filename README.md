# Arohi's Collection — split front-end (Customer & Owner)

This zip contains a two-route Vite + React app:
- `/shop`  → Customer app
- `/owner` → Owner app

It expects your existing **shadcn/ui** components under `@/components/ui/*` and your FastAPI backend at `http://localhost:8000`.

## Setup

1) Copy these files into your project (or use as a fresh Vite app).
2) Ensure Tailwind v4 PostCSS plugin:
   ```bash
   npm i -D tailwindcss @tailwindcss/postcss postcss autoprefixer
   ```
3) `postcss.config.js` should be:
   ```js
   export default { plugins: { "@tailwindcss/postcss": {}, autoprefixer: {} } };
   ```
4) `src/index.css` should contain:
   ```css
   @import "tailwindcss";
   ```
5) Backend env:
   - Local dev: `.env.local` ships with `VITE_USE_PROXY=1`, the Vite dev server proxies API calls to `http://127.0.0.1:8000` using `vite.config.js`.
   - Production build: update `.env.production` with your deployed API domain (default is `https://api.16shringaar.com`).
   - Owner phone now comes from the backend `GET /config` (set `OWNER_PHONE` in `arohi-backend/.env`).

Run:
```bash
npm install
npm run dev -- --host
```

## Production build

Set the API URL in `.env.production`, then run:

```bash
npm run build
aws s3 sync ./dist s3://<your-site-bucket>/ --delete
```

CloudFront should point at the bucket root; configure 403/404 → `/index.html` for SPA routing.

## Notes
- The UI imports from `@/components/ui/...` (shadcn). Keep your generated components.
- Logo is `public/logo.svg` placeholder. Replace with your actual logo.
- All network calls are centralized in `src/shared/api.js`.
- AI metadata: `src/shared/ai.js` calls `POST /ai/describe` with `{ image_urls }`.
