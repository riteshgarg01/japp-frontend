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
   - `VITE_API_URL=http://localhost:8000` (put in `.env.local`)

Run:
```bash
npm install
npm run dev -- --host
```

## Notes
- The UI imports from `@/components/ui/...` (shadcn). Keep your generated components.
- Logo is `public/logo.svg` placeholder. Replace with your actual logo.
- All network calls are centralized in `src/shared/api.js`.
- AI metadata: `src/shared/ai.js` calls `POST /ai/describe` with `{ image_urls }`.
