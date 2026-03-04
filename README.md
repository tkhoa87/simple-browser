# Simple Browser

Simple Browser is a tiny Electron shell that launches a Chromium window with remote debugging enabled. It can also launch native Chrome/Chromium instead. Published as an npm binary so you can spin up a clean browser profile from the command line in seconds.

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

When no URL is provided, the browser opens the Chrome DevTools Protocol version endpoint on the remote debugging port.

## CLI Usage

```bash
simple-browser [OPTIONS] [URL]
simple-browser COMMAND [OPTIONS]
```

### Options

| Option                         | Description                                         |
| ------------------------------ | --------------------------------------------------- |
| `-b, --browser BROWSER`        | Browser to use: `electron` (default) or `chrome`    |
| `--remote-debugging-port PORT` | Set remote debugging port (highest priority)        |
| `--port PORT`                  | Set remote debugging port (alias)                   |
| `-p PORT`                      | Set remote debugging port (short alias)             |
| `--<chromium-switch>[=VALUE]`  | Pass any switch to Chromium (e.g., `--disable-gpu`) |
| `-h, --help`                   | Show help message                                   |

### Commands

| Command | Description                               |
| ------- | ----------------------------------------- |
| `start` | Start a background process managed by PM2 |
| `stop`  | Stop and remove the PM2-managed process   |

### Examples

```bash
# Open a URL in Electron
simple-browser https://example.com

# Open a URL in native Chrome
simple-browser -b chrome https://example.com

# Set a specific remote debugging port
simple-browser --port 9333 https://example.com

# Pass Chromium switches
simple-browser --disable-gpu --proxy-server=http://proxy:8080 https://example.com

# Start as a background process (PM2)
simple-browser start
simple-browser start --port 9333

# Stop a background process
simple-browser stop
simple-browser stop --port 9333
```

### Port Priority

The remote debugging port is resolved in this order:

1. `--remote-debugging-port` CLI option
2. `--port` CLI option
3. `-p` CLI option
4. `REMOTE_DEBUGGING_PORT` environment variable
5. Auto-find a free port starting at 9222

### In-App Navigation

Press **Cmd+L** (macOS) or **Ctrl+L** (Windows/Linux) to open the Navigate dialog and go to a different URL.

## Project Structure

| File             | Description                                                                 |
| ---------------- | --------------------------------------------------------------------------- |
| `src/main.ts`    | Electron main process — window creation, CLI parsing, menu, navigate dialog |
| `src/preload.ts` | Minimal preload bridge (`electronBridge`, currently empty)                  |
| `run`            | Bash entry point — CLI parsing, Chrome mode, PM2 start/stop                 |
| `build/`         | Compiled TypeScript output                                                  |

## Contributing

```bash
npm install                  # Install dependencies
npm run dev                  # Development (watches src/, auto-rebuilds, opens DevTools)
npm start                    # Production-like launch
npm publish --access public  # Publish to npm
```

Pull requests are welcome! Please describe any behavioral changes and include testing notes.

## License

MIT — see `LICENSE`.
