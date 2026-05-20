# moon

Moon Proxy is now built as a server-backed app so it can proxy blocked sites properly.

Files in this repository:

- `index.html` — main website entrypoint
- `styles.css` — UI styles and animations
- `app.js` — proxy browser logic, settings persistence, and update log
- `server.js` — Node.js server that fetches remote pages and removes blocking headers
- `package.json` — Node.js dependencies and start script
- `.gitignore` — ignore local `node_modules`

Important:

- GitHub Pages cannot act as a true proxy server.
- You must host this on a Node.js-capable server (local machine, Railway, Render, Vercel serverless, etc.).

To run locally:

1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Open `http://localhost:3000`

This setup is designed for a real proxy browser experience, not just static hosting.
