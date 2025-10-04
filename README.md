Frontend (Vue 3 + Vite)

Quick start (PowerShell):

# from project root
cd frontend
npm install
npm run dev

This starts Vite on http://localhost:5173 and proxies /redis and /mongo to http://localhost:5000 (backend). Ensure the backend is running.

Force API base (optional)

If you'd like the frontend to call the backend directly (for example to avoid relying on the Vite proxy or when the dev proxy isn't working), set the VITE_API environment variable before starting Vite. The app will use that URL as the API base for all requests.

Windows PowerShell example:

$env:VITE_API='http://localhost:5000'; npm run dev

Unix/macOS example:

VITE_API=http://localhost:5000 npm run dev

If VITE_API is not set, the app will first attempt to call the proxied endpoints (e.g. /hosts, /redis/push). If that fails it will fall back to http://localhost:5000 automatically.
