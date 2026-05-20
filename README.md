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

- GitHub Pages cannot act as a true proxy server. If you host the UI on GitHub Pages, the built-in server proxy at `/proxy` won't be available.
- The client now includes lightweight client-side fallbacks that will try public CORS proxy services when the server proxy is not reachable, allowing an "emulator"-style experience from static hosts. These public proxies are less reliable and may break on JS-heavy or protected sites.
- For the best experience, host on a Node.js-capable server (local machine, Railway, Render, Vercel serverless, etc.).

Headless rendering (best for JS-heavy or protected sites):

- A Puppeteer-based headless renderer is available as a final fallback when proxies fail. It will run a real Chromium instance on the server, load the target page, and return the fully rendered HTML for the emulator.
- To enable headless rendering set the environment variable `ENABLE_HEADLESS_RENDER=1` (or `true`) when starting the server. Example:

```bash
ENABLE_HEADLESS_RENDER=1 npm start
```

- Note: Puppeteer downloads a Chromium binary during `npm install` and has additional runtime dependencies; the provided `Dockerfile` installs the common packages required. Running headless rendering increases CPU and memory usage — consider hosting on a machine with sufficient resources.

To run locally:

1. Install dependencies: `npm install`
2. Start the server: `npm start`
3. Open `http://localhost:3000`

This setup is designed for a real proxy browser experience, not just static hosting.
