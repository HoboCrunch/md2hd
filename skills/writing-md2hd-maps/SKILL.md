---
name: writing-md2hd-maps
description: "Use when authoring or editing markdown that will be rendered by md2hd as a graph or mind map — writing node frontmatter, linking nodes with rel: or [[wikilinks]], setting up the type:map configuration block, converting a folder of existing notes into a map, or diagnosing a map that parses cleanly but draws the wrong thing (nodes missing, arrows reversed, dashed placeholder nodes, unlabelled grey lines)."
---

# Writing markdown for md2hd

md2hd turns a folder of markdown into a graph. Every YAML frontmatter block is a
**node**, `rel:` entries and `[[wikilinks]]` are **edges**, the prose under a
block is that node's **notes**, and one block with `type: map` configures the
whole map.

**The governing fact: the parser never rejects anything.** Malformed YAML, a
misspelled setting, a block that never opened — all of it parses to *something*
and draws *something*. There is no error state. Every mistake below is silent,
so the job is not "does it parse" but "does it draw what I meant".

Everything in this document was verified against the parser (`src/lib/parse.ts`
in the md2hd repo). Where a friendlier user guide disagrees, this wins.

---

## The shape of a file

One file may hold the whole map. A `---` line opens a new block, and the body
runs until the next line that opens one.

```markdown
---
type: map
title: Partnerships
---

---
id: riverside-council
type: org
title: Riverside City Council
---

Prose here is this node's notes.

---
id: dana-whitfield
type: person
title: Dana Whitfield
---

And this is Dana's.
```

- **Blank lines around blocks are optional.** Tight `---` runs parse identically.
- **Prose before the first block is dropped.** It belongs to no node.
- **A `---` followed by prose stays a horizontal rule** and remains inside the
  current node's body. Only a `---` whose next non-blank line looks like a YAML
  key opens a block, which is why existing notes full of rules still work.
- `***` and `___` never open a block.

### The rule that decides it

The line after `---` must match `/^[A-Za-z_][\w .-]*\s*:(\s|$)/`.

| Line after `---` | Opens a block? | Why |
|---|---|---|
| `id: acme` | yes | letter, colon, **space** |
| `id:acme` | **no** | needs whitespace or end-of-line after the colon |
| `rel:` | yes | colon at end of line is fine |
| `_id: acme` | yes | leading underscore allowed |
| `2026: thing` | **no** | must start `[A-Za-z_]` |
| `my key.v: x` | yes | spaces, dots, hyphens legal inside a key |

A block that fails to open is not an error — the `---` becomes a rule and **the
entire node silently disappears from the map**. `id:acme` with no space is the
single easiest way to lose a node.

---

## Write it in this order

**1. The map block.** Exactly one, and it is configuration — it never draws as a
node and never links to anything.

```markdown
---
type: map
title: Partnerships
layout: LR
types:
  org: { label: Organization, color: "#4A9BFF" }
  person: "#3FC8D4"
inverse:
  works_at: employs
symmetric: [knows]
---
```

**2. Nodes with an explicit `id` and `title`.** Both have fallbacks and both
fallbacks surprise people (see below). Two extra lines removes the whole class.

**3. Name every relationship.** Use `rel:` for structure. A bare `[[wikilink]]`
draws an unlabelled grey `mentions` line — use it only when you mean "this came
up here". A map full of them says nothing.

**4. Declare `inverse:` and `symmetric:` deliberately.** Both are **global per
label**, not per node pair. See the normalisation section — this is the most
common way to get a graph that is subtly wrong.

**5. Read back every link as drawn**, not just "it parsed". The normalisation
pass rewrites directions and merges edges before anything appears.

---

## Node fields

Every key is optional; a block with empty frontmatter still becomes a node.

| Field | Behaviour |
|---|---|
| `type` | Category, freely invented. Defaults to `note`. `type: map` is reserved for config. |
| `id` | Slugged. Falls back to `slug(title)`, then `slug("<file>-<n>")`. |
| `title` / `name` | Card name. Falls back to **the first heading anywhere in the body**, then `Untitled`. |
| `subtitle` | One line under the title. |
| `description` | Opening paragraph of the detail view. |
| `weight` | How loudly the card draws. Word or 1–5. |
| `tags` | Chips. Nested arrays are flattened. |
| `rel` / `rels` / `links` | Edges. Map or list. |
| *any other key* | A wikilink value becomes an edge; anything else becomes a metadata row. |

`title` falling back to *any* heading — not just a leading one — means a node
whose body starts with prose and has `## Open questions` halfway down will be
named "Open questions". Set `title:` on anything containing headings.

Two nodes with neither `title:` nor a heading both become `Untitled` and both
slug to the same id.

### Weight

Absent or empty → `3`. A number (or numeric string) is rounded and clamped to
1–5. Otherwise a case-insensitive word lookup, and **any unrecognised word
silently becomes 3**.

| Value | Weight |
|---|---|
| `lead` `critical` `primary` `key` | 5 |
| `major` `high` | 4 |
| `normal` `medium` `default` | 3 |
| `minor` `low` | 2 |
| `faint` `background` `trivial` | 1 |
| `7`→5, `0`→1, `2.6`→3, `"4"`→4 | clamped and rounded |
| `urgent`, `blocker`, anything else | **3** |

Weight affects drawing only, never the graph.

### ids and slugging

`slug()` runs on `id`, on the title fallback, and on **both ends of every link**
— which is why `[[Acme Corp]]` finds `id: acme-corp`.

```
trim → lowercase → delete everything except [A-Za-z0-9_ -] → collapse [\s_]+ to "-" → trim "-"
```

| Input | Slug | Note |
|---|---|---|
| `my_node` | `my-node` | **underscores become hyphens** |
| `Acme Corp.` | `acme-corp` | punctuation dropped |
| `Foo—Bar` | `foobar` | em-dash dropped with no separator |
| `Ünïcode Name` | `ncode-name` | **non-ASCII letters are deleted, not transliterated** |
| `2026-07-14` | `2026-07-14` | digits and hyphens survive |

So `id: my_node`, `[[my-node]]` and `[[my_node]]` are all the same node. Give
accented or non-Latin titles an explicit ASCII `id:`.

**Duplicate ids do not merge**, despite a warning that says "later copy merged".
Both nodes draw; only the second is reachable by link. Treat it as an error.

---

## The map block

| Key | Behaviour |
|---|---|
| `title` | The map's name. |
| `layout` | **Exactly `LR`** for left-to-right. Every other value — `lr`, `RL`, `horizontal` — silently gives `TB`. |
| `types` | Per type `{ label, color }`, or a bare colour string as shorthand (label defaults to the key). |
| `inverse` | `works_at: employs` — key is the passive wording, value the active one. |
| `symmetric` | Relations with no direction: `[knows, met]`. |

**Those five keys are the only ones read.** Anything else is never looked at.
`direction:`, `colors:`, `rankdir:` and `palette:` are all valid YAML that does
absolutely nothing — this is the most common authoring mistake, because the
names are so plausible.

Types you omit get a palette colour in encounter order, so a map needs no
colours at all to read clearly.

**Two map blocks do not merge.** The last one replaces the config wholesale, so
a `layout: LR` in the first is lost if the second omits it. Keep exactly one.

---

## The four ways to link

**1. `rel:` / `rels:` / `links:`**

```yaml
rel:
  employs: [dana, marcus]      # relation -> id, or list of ids
  runs: records-portal
rel:
  - employs: dana              # list of single-key maps also works
rel: [dana, marcus]            # list of bare scalars -> label is "links"
```

**2. Any non-reserved frontmatter key whose value is a wikilink**

```yaml
works_at: "[[acme]]"           # edge labelled "works_at"
attendees: ["[[dana]]", "[[marcus]]"]
```

Reserved keys are skipped: `id type title name subtitle description weight tags
rel rels links layout types inverse symmetric`. A wikilink inside `description:`
makes no edge.

**3. Inline fields in the body** — `/(?:^|\s)([A-Za-z][\w-]*)::\s*(.+)$/gm`

```markdown
owns:: [[depot]]                 label "owns"
mid sentence owns:: [[depot]]    also matches — preceded by a space
nope-owns:: [[d]]                matches; label is "nope-owns" (hyphens legal)
1bad:: [[d]]                     no match — must start with a letter
```

**4. Bare wikilinks in the body** → an untyped `mentions` edge, unless an inline
field on the same node already claimed that target.

`[[target|alias]]` links to `target`; the alias only changes displayed text.

**Self-links are dropped** — a node with `rel: { knows: <its own id> }` produces
no edge at all.

---

## What happens to your links before anything is drawn

This pass rewrites what you wrote. It is where authored text stops matching the
canvas, and where most "the graph is wrong but it parsed" bugs live.

### Step 1 — every edge is turned to face one way

Up to **3 rounds** per edge. Each round:

- if `inverse[label]` exists → relabel to that value and **swap the ends**;
- else if the label matches `/^(.+?)[\s_-]by$/` → strip the suffix and **swap**;
- else stop.

So `owned_by`, `owned-by` and `owned by` all become `owned` pointing the other
way. `standby` and `nearby` do not match — a separator is required.

`inverse:` is checked **first** each round, and **the rules chain**: with
`inverse: { x: owned_by }`, a label `x` relabels to `owned_by` and swaps, then
the `_by` rule fires on the result and swaps back — ending as `owned` in the
original direction. Two flips cancel. Avoid declaring an `inverse:` value that
itself ends in `_by`.

### Step 2 — edges collapse by meaning

The identity is `source > target > stem(label)`, where `stem` lowercases,
turns any run of spaces/underscores/hyphens into a single space, and strips a
trailing `ed`, `s` or `d`.

Consequences:

- `owns`, `owned` and `own` between the same pair are **one edge**. The first
  spelling encountered is kept.
- `paired_with`, `paired-with` and `Paired With` are the same relation.
- Irregular verbs are not handled: `knew` and `knows` stay distinct.

### Step 3 — the second voice is recovered

An edge carries `label` (as drawn) and `reverse` (the same fact from the far
end), so one link reads `employs` from the organisation and `works at` from the
person. `reverse` comes from whatever the far end actually wrote, or failing
that from the declared `inverse:` counterpart.

> **`inverse:` is global per label, not per pair.** Declaring
> `inverse: { assigned_to: owns }` gives *every* `owns` edge in the map the
> reverse voice "assigned to" — including `rosa owns session-store`, which then
> reads as a service *assigned to* a person. If a label means different things
> in different places, give those relations different names.

`symmetric:` matches the same way, so `[paired_with]`, `[paired with]` and
`[paired-with]` are interchangeable, and `[knows]` also matches a `know` label.

### Step 4 — mirrors fold

If `a→b` and `b→a` share a stem they become one edge marked symmetric, drawn
with no arrowhead and a chevron at each end. Anything in `symmetric:` is marked
the same way.

### Step 5 — deferring mentions are dropped

A `mentions` edge is discarded when any named relation already connects that
unordered pair.

Link targets that were never defined become **ghost** nodes — dashed,
`type: unresolved`. Nothing you reference vanishes, but a typo'd id becomes a
ghost rather than an error.

---

## Silent failures, ranked

Every one of these parses cleanly.

| Symptom | Cause |
|---|---|
| A node is missing entirely | `key:value` with no space — the block never opened |
| Layout ignored | `layout:` anything but exactly `LR` |
| Type colours ignored | a key the map block does not read (`colors:`, `direction:`) |
| Config half-applied | a second `type: map` block replaced the first wholesale |
| Arrow points backwards | a `_by`/`-by`/` by` suffix, or an `inverse:` pair, flipped it — by design |
| A relation reads oddly on unrelated nodes | `inverse:` is global per label |
| Two relations became one | same stem between the same pair |
| A dashed node you never wrote | typo in a link target → ghost |
| Two identical cards | duplicate `id:` — they do not merge |
| Node named after a subheading | no `title:`; the fallback found a heading in the body |
| Several nodes named "Untitled" | no `title:` and no heading; their ids collide |
| Unlabelled grey lines everywhere | bare `[[wikilinks]]` where a named relation was meant |
| Everything equally loud | an unrecognised `weight:` word fell back to 3 |
| A relationship you wrote is absent | it pointed at itself |

---

## Verify before you ship

**Inside the md2hd repo**, run the real parser and read every link as drawn:

```bash
npx vite-node .claude/skills/writing-md2hd-maps/check-map.ts -- path/to/map.md
```

**Anywhere else**, there is no validator — check by eye, in this order:

1. **Every block opened.** Each `---` you intended as a node is followed by a
   key with a space after its colon. This grep flags the killer:
   ```bash
   grep -nE '^[A-Za-z_][A-Za-z0-9 ._-]*:[^[:space:]]' map.md
   ```
2. **The map block uses only** `title` `layout` `types` `inverse` `symmetric`.
3. **`layout:` is exactly `LR`** if you wanted left-to-right.
4. **Exactly one `type: map` block.**
5. **Every `id:` is unique**, and every link target matches an id after
   slugging.
6. **Every `weight:`** is a listed word or 1–5.
7. **Walk each `inverse:` and `symmetric:` entry** and confirm the label means
   the same thing everywhere it is used.
8. **Count bare `[[wikilinks]]`** — each is an unlabelled line. Convert the ones
   that deserve a name.

---

## Worked example

```markdown
---
type: map
title: Checkout Outage — 14 July
layout: LR
types:
  service: { label: Service, color: "#4A9BFF" }
  person: { label: Responder, color: "#3FC8D4" }
  event: { label: Timeline, color: "#EA8A62" }
  action: { label: Action Item, color: "#4FBE8B" }
inverse:
  assigned_to: owns_action
symmetric: [paired_with]
---

---
id: payments-api
type: service
title: Payments API
weight: lead
rel:
  depends_on: session-store
---

The blast radius. Every checkout path routes through it.

---
id: session-store
type: service
title: Session Store
subtitle: Redis · 3 replicas
---

---
id: rosa-imani
type: person
title: Rosa Imani
subtitle: On-call, platform
weight: major
rel:
  operates: session-store
  paired_with: theo-nakamura
---

Took the page at 14:06.

verified:: [[rollback-1447]]

---
id: theo-nakamura
type: person
title: Theo Nakamura
---

---
id: config-push-1402
type: event
title: Config push 14:02
rel:
  degraded: payments-api
---

---
id: rollback-1447
type: event
title: Rollback 14:47
rel:
  reverted: config-push-1402
  restored: payments-api
---

---
id: action-canary
type: action
title: Canary config pushes
rel:
  assigned_to: rosa-imani
  addresses: config-push-1402
---

---
id: action-alerts
type: action
title: Alert on session pool saturation
rel:
  assigned_to: theo-nakamura
  covers: session-store
---
```

Note what this does *not* do: it uses `operates` rather than `owns` for the
service, because `owns_action` is declared as an inverse and would otherwise
attach "assigned to" to a service. That is step 3 above, and it is the mistake
worth watching for.
