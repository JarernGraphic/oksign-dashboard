<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# UI Rules & Design Guidelines (STRICT)

- **NEVER USE RAW EMOJIS IN ANY UI CODE OR TEXT**:
  - Do NOT use emojis (e.g. 🎨, 💼, 🔨, 👑, ✈️, 📋, 💾, 🔍, 📷, 🗑️, ✏️, 📦, ⏳, ✅, 👥, etc.) anywhere in UI elements, buttons, select options, badges, titles, or text.
  - ALWAYS use official vector icons from `lucide-react` (e.g. `<Palette />`, `<Briefcase />`, `<Factory />`, `<Shield />`, `<Camera />`, `<Trash2 />`, `<Pencil />`, `<CheckCircle2 />`, etc.) or clean plain Thai / English typography.
  - This rule must be strictly followed across all components, pages, modals, dropdowns, and notifications without exception.

