# md2hd

Markdown, mapped.

Point it at a file or a folder of notes and it opens a map in your browser —
frontmatter becomes nodes, wikilinks become edges, and the topology you have
been holding in your head becomes something you can look at.

```sh
npx md2hd notes/     # a folder of markdown
npx md2hd map.md     # or a single file
```

Or install it for keeps: `npm i -g md2hd`.

Everything runs locally. The server binds 127.0.0.1 and your notes never leave
your machine. Edit the markdown, refresh the tab, and the map re-reads from disk.

## Flags

- `--port N` — serve on a specific port (default 4173; falls back to a free one)
- `--no-open` — don't open the browser

## The markdown

Every node is a frontmatter block; every `[[wikilink]]` or `rel:` entry is an edge.

```markdown
---
type: map
title: My map
---

---
id: first-node
type: note
title: First node
---

Write here. Link to another node with [[second-node]].

---
id: second-node
type: note
title: Second node
---
```

Full syntax and guides: [md2hd.app](https://md2hd.app) ·
[reference](https://md2hd.app/reference) · [guides](https://md2hd.app/guides)

## Development

This repo is the CLI and packaging shell. The visualizer itself is built in the
md2hd app repo; `npm run build` expects that checkout as a sibling `../dev`
directory and copies its build output into `dist/`, which is what ships to npm.
`npm test` runs a smoke check against the packaged server.
