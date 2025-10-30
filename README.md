# Simple Browser

A minimal Electron-based browser packaged as a CLI app.

## Install

```bash
npm install
```

## Usage

- Development mode (auto-reload on changes):

```bash
npm run dev
```

- Production run:

```bash
npm start
```

- CLI entry (after local install):

```bash
./run
# or, if installed globally
browser
```

## Build details

- TypeScript sources live in `src/` and compile to `build/`.
- Main process entry is `src/main.ts`.
- Preload script is `src/preload.ts`.

## Scripts

- `npm run dev` — watches `src/` and runs Electron in development.
- `npm start` — runs Electron in production mode.

## Requirements

- Node.js and npm

## License

MIT — see `LICENSE`.
