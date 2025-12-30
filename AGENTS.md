# Agent Instructions

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Always keep this file updated whenever there are changes that affect the documented commands, architecture, or key behaviors.

## Project Overview

Simple Browser is a minimal Electron shell that launches a Chromium window with remote debugging enabled. It's published as an npm binary (`simple-browser` or `browser`) for quick browser automation and debugging use cases.

## Commands

```bash
# Development (watches src/, auto-rebuilds, opens DevTools)
npm run dev

# Production-like launch
npm start

# Publish to npm
npm publish --access public
```

## Architecture

**Main Process (`src/main.ts`)**

- Configures Electron app with remote debugging on port 9222 (or next free port)
- Creates a maximized BrowserWindow with context isolation enabled
- Includes custom "Navigate..." dialog (Cmd/Ctrl+L) with inline HTML/CSS UI
- Uses `powerSaveBlocker` to prevent display sleep
- CLI args: last positional arg is URL to load, preceding args become Chromium switches

**Preload (`src/preload.ts`)**

- Minimal preload bridge using `contextBridge.exposeInMainWorld`
- Currently exports empty `electronBridge` object

**Build Output**

- TypeScript compiles from `src/` to `build/`
- The `run` bash script handles CLI entry point, supports `start`/`stop` commands for PM2 management

## Key Behaviors

- Remote debugging port defaults to `REMOTE_DEBUGGING_PORT` env var or finds free port starting at 9222
- DevTools auto-opens in development (`NODE_ENV !== 'production'`)
- No URL provided → opens the Chrome DevTools Protocol version endpoint
