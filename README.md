# BBP Base Planner

> A 3D base planner for the [BaseBuildingPlus (BBP)](https://www.bohemia.net/blog/base-building-plus) DayZ mod.

**[Live demo →](https://cdebo.github.io/bbp-base-planner/)**  *(replace with your GitHub Pages URL)*

<!-- TODO: Add a screenshot or GIF here -->
<!-- ![BBP Base Planner screenshot](docs/screenshot.png) -->

---

## What is BaseBuildingPlus?

BBP is a popular DayZ mod that expands the base-building system far beyond vanilla — multi-story structures, tiered construction (wood → metal → concrete), lockable doors and hatches, flagpoles, server-configurable raid rules, and much more. This planner lets you design, iterate, and cost your base layout *before* gathering a single plank in-game.

## Features

- **Full BBP parts catalog** — walls, foundations, floors, roofs, doors, gates, windows, stairs, pillars, and more
- **Snap placement** — pieces snap to each other just like in-game; scroll wheel cycles snap candidates
- **Exterior & interior modes** — toggle between building the shell and furnishing the inside; camera jumps to eye height inside your base
- **Multi-floor navigation** — auto-detects floor levels from placed floor/foundation pieces; manual pin for custom levels
- **Tier upgrades** — upgrade individual pieces from frame → T1 → T2 → T3 and watch the resource cost update in real time
- **Resource panel** — running total of every material needed across your whole build
- **Share URL** — encodes your build into a compact URL you can paste in Discord
- **Auto-save** — build persists in your browser automatically; no account needed
- **Export / Import JSON** — back up or transfer builds as plain JSON files

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `W` `A` `S` `D` | Move camera (hold `Shift` to sprint) |
| `R` | Rotate ghost piece 90° |
| `Shift+R` | Rotate by fine step (set in Settings) |
| Mouse wheel / `Q` `E` | Cycle snap candidates while placing |
| `Esc` | Cancel placement / deselect |
| `Del` / `Backspace` | Delete selected piece |
| `Ctrl+Z` / `⌘Z` | Undo |

## Getting started (development)

```bash
git clone https://github.com/YOUR_USERNAME/bbp-base-planner.git
cd bbp-base-planner
npm install
npm run dev        # http://localhost:5173/bbp-base-planner/
```

```bash
npm run test       # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build → dist/
```

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **React Three Fiber** + **Three.js** for the 3D canvas
- **Zustand** for state management
- **Tailwind CSS v4** for styling
- **lz-string** for share URL compression
- **Vitest** for unit tests

## Deployment

The project deploys automatically to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.

<!-- TODO: Add GIF demo here -->
<!-- ![Demo](docs/demo.gif) -->

## Contributing

Bug reports and feature requests are welcome — please open a [GitHub Issue](../../issues).

## License

MIT
