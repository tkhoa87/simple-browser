# Simple Browser

Simple Browser is a tiny Electron shell that launches a Chromium window with remote debugging enabled. The project is published as an npm binary so you can spin up a clean browser profile from the command line in seconds.

- [Simple Browser](#simple-browser)
  - [Quick Start](#quick-start)
    - [Run once](#run-once)
    - [Install globally then run](#install-globally-then-run)
  - [CLI Usage](#cli-usage)
  - [Project Structure](#project-structure)
  - [Contributing](#contributing)
  - [License](#license)

## Quick Start

### Run once

```bash
npx --yes simple-browser@latest
```

### Install globally then run

```bash
# Install
npm install --global simple-browser@latest

# Run
simple-browser
# or
browser
```

When no URL is provided, the browser opens the Chrome DevTools protocol version endpoint that is exposed on the bundled remote debugging port.

## CLI Usage

```bash
# Open a specific URL
npx --yes simple-browser@latest https://example.com

# Pass Chromium command-line switches before the URL
npx --yes simple-browser@latest --disable-gpu https://example.com
```

- The final positional argument is treated as the initial URL to load.  
- Any preceding arguments are appended as Chromium command-line switches (for example `incognito`, `disable-gpu`, etc.).  
- The app automatically enables remote debugging. Set `REMOTE_DEBUGGING_PORT` to pin it to a specific port; otherwise it chooses a free port starting at `9222`.

## Project Structure

- `src/main.ts` configures the Electron main process, window defaults, and crash recovery.
- `src/preload.ts` exposes a minimal preload bridge (currently empty).
- TypeScript sources compile to `build/` during publishing, and the `run` script wraps the packaged executable.

## Contributing

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development build (watches `src/` with `nodemon` and opens devtools):

   ```bash
   npm run dev
   ```

3. For a production-like launch:

   ```bash
   npm start
   ```

4. For publish:

   ```bash
   npm publish --access public
   ```

Pull requests are welcome! Please describe any behavioral changes and include testing notes.

## License

MIT — see `LICENSE`.
