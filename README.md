# md2hd

**Markdown, mapped.** Point it at a file or a folder of notes and it opens a
map in your browser — frontmatter becomes nodes, wikilinks become edges, and
the topology you have been holding in your head becomes something you can
look at.

[![npm](https://img.shields.io/npm/v/md2hd)](https://www.npmjs.com/package/md2hd)
[![node](https://img.shields.io/node/v/md2hd)](https://www.npmjs.com/package/md2hd)
[![license](https://img.shields.io/npm/l/md2hd)](LICENSE)

```sh
npx md2hd notes/     # a folder of markdown
npx md2hd map.md     # or a single file
```

Or install it for keeps: `npm i -g md2hd`.

![An organisation map drawn from a folder of markdown — typed nodes, labelled links, a minimap, and the type strip along the foot](https://raw.githubusercontent.com/evan-steinhilb/md2hd/main/media/shell.jpg)

## Why

You already have the material — organisations, people, threads, intent, all
of it written down. The thing you are missing is a picture of how it fits
together. md2hd draws that picture from the files you already keep, and keeps
drawing it as you edit them: save the markdown, refresh the tab, the map
re-reads from disk.

- **Nothing leaves your machine.** The server binds `127.0.0.1`, maps live in
  your browser, and there is no account and no telemetry.
- **Types are yours to invent.** The same canvas draws an org chart, a
  service map, or a plot outline without knowing anything about any of them —
  colour and layout come from one `type: map` block in your own files.
- **Focus answers questions.** Click a node and the map re-forms around it:
  what points at it on the left, what it points at on the right. Each
  connection column carries a degree dial — 1st / 2nd / 3rd / X — that walks
  that direction further out in muted rings, reframing the camera as it goes.
- **Every link speaks in the node's own voice.** The same relationship reads
  `employs` from the organisation and `works at` from the person, with a
  compass chevron aimed at the node on the other end.
- **Edit from the map.** The pane's Code toggle is a live editor on the file
  a node came from; the map redraws as you type.

## Reading a map

![A focused node — the ego view on the canvas, detail and connection columns in the drawer, degree dials on each direction](https://raw.githubusercontent.com/evan-steinhilb/md2hd/main/media/focus.jpg)

The strip at the foot of the canvas holds the map's three surfaces: the
**Overview**, a tab per **type**, and — when you click a card — the **node**
itself, its detail beside its connections, split To and From. Hover a row in
a type's list and its card lights on the canvas; search filters the whole
map; drag to arrange, and positions are saved.

![A type surface — every node of the type itemised, the hovered row glowing its card on the canvas](https://raw.githubusercontent.com/evan-steinhilb/md2hd/main/media/type.jpg)

## The markdown

Every node is a frontmatter block; every `[[wikilink]]` or `rel:` entry is an
edge. One optional `type: map` block configures the whole thing.

```markdown
---
type: map
title: Partnerships
inverse:
  works_at: employs
---

---
id: riverside-council
type: org
title: Riverside City Council
weight: lead
rel:
  employs: [dana-whitfield]
---

The anchor relationship. Everything routes through [[dana-whitfield]].
```

Notes that were never written for md2hd usually read fine as-is: a `---` line
only opens a node when what follows looks like YAML, and malformed blocks
degrade to prose instead of errors.

Full syntax and guides: [md2hd.app](https://md2hd.app) ·
[reference](https://md2hd.app/reference) · [guides](https://md2hd.app/guides)

## Flags

- `--port N` — serve on a specific port (default 4173; falls back to a free one)
- `--no-open` — don't open the browser

## The agent skill

Writing a map by hand is easy; having a coding agent write one that
**compiles to the graph you meant** is what the bundled skill is for. The
package ships `writing-md2hd-maps`, which teaches an agent the whole
authoring language — node frontmatter, `rel:` and wikilink edges, the
`type: map` block, converting an existing folder of notes into a map — and
how to diagnose one that parses cleanly but draws the wrong thing: missing
nodes, reversed arrows, dashed placeholders, unlabelled grey lines.

```sh
npx skills add evan-steinhilb/md2hd
```

Claude Code users can take it as a plugin — this repo is its own marketplace:

```
/plugin marketplace add evan-steinhilb/md2hd
/plugin install md2hd@md2hd
```

or copy `skills/writing-md2hd-maps/` into your agent's skills directory — it
is in the npm tarball too, so an installed `md2hd` carries it at
`node_modules/md2hd/skills/`. With the skill loaded, "turn these notes into
an md2hd map" produces markdown that opens as the map you asked for.

## Development

This repo is self-contained: `dist/` (the built visualizer) and the skill are
committed, so a fresh clone can run, test, and publish with nothing else
checked out. The visualizer's source lives in the md2hd app repo;
`npm run sync` is the maintainer step that rebuilds it from a sibling `../dev`
checkout and refreshes `dist/` before a release. `npm test` runs a smoke
check against the packaged server.

## License

[MIT](LICENSE)
