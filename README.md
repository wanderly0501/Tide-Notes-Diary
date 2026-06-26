# Tide — Notes & Diary

A cross-platform note-taking and diary app built with **Expo / React Native**, targeting both web and mobile (iOS / Android via Expo Go). Data lives in **Supabase** (Postgres + Auth + Storage); on mobile a local **SQLite** cache is used as the primary store with background sync to Supabase.

---

## Quick start

**Prerequisites:** Node.js LTS, a Supabase project (free tier is fine).

### 1. Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

### 2. Database

Run `supabase/schema.sql` in your Supabase project's **SQL Editor** (Database → SQL Editor → New query). This creates all tables, indexes, RLS policies, and the image-storage bucket.

### 3. Google OAuth (optional)

Follow the comment at the bottom of `schema.sql` to wire up Google sign-in via Supabase Auth → Providers.

### 4. Run

```bash
npm install

# Web (opens at http://localhost:8081)
npx expo start --web

# Mobile — scan the QR code with Expo Go
npx expo start
```

---

## Architecture

| Platform | Data path |
|---|---|
| **Web** | Every read/write goes directly to Supabase via `webDataService.ts` |
| **Mobile** | SQLite is the primary store (`db.ts`). On startup and on pull-to-refresh, data is synced from Supabase. Writes go to SQLite first, then pushed to Supabase in the background. |

The split is implemented by two React context providers in `context.tsx`: `WebAppProvider` and `MobileAppProvider`, chosen at runtime by `Platform.OS`.

---

## Features

### Stream view
- Infinite scroll of **sections** (notes), newest first, grouped by date
- Sections contain mixed content: text paragraphs, bullet lists, image blocks
- Each section has a title, tags, date, and an optional reminder date
- Sections can be pinned to the top
- Pull-to-refresh on mobile syncs from Supabase

### Sidebars (Stream view)
| Sidebar | Web | Mobile |
|---|---|---|
| **Timeline** | Left, collapsible | Right-side overlay (tap calendar button) |
| **Tags** | Left, collapsible | Right-side overlay (tap # button) |

Timeline shows dates that have sections, grouped by month; tap a date to scroll the stream to it.
Tags is a checkbox list — unchecked tags hide matching sections. Custom tags can be added with a color picker.

### Documents view
- Card grid of long-form documents
- Create with a title and accent color
- **Files sidebar**: web = left collapsible panel; mobile = right-side overlay (tap ☰ button)

### Document editor
- **Toolbar (web):** Title / H1–H3 / Normal | S M L XL | **B** *I* U | H (highlight) | • List | 1. List | 🔗
- **Toolbar (mobile):** Two fixed rows — row 1: heading formats; row 2: **B** *I* U | H | • List | 1. List | 🔗
- Content is stored as **HTML**; inline formatting uses `<b>`, `<i>`, `<u>`, `<mark>`, `<ul>/<ol>` tags
- Mobile renders content as per-line `TextInput` components with font size / weight reflecting the heading level; web uses a `contentEditable` div
- **Outline sidebar:** web = left in-flow panel; mobile = right-side overlay showing heading hierarchy
- Auto-saves 1.2 s after the last keystroke with a live word count and "Saved" indicator

---

## File structure

```
tide-notes/
│
├── App.tsx                  # Entry point
│                            #   SQLiteProvider (mobile) wraps everything
│                            #   AppProvider → view switcher (stream | docs | editor)
│                            #   MobileBottomBar hidden while editing a document
│
├── index.js                 # Expo entry shim (registers App component)
├── app.json                 # Expo project config (name, slug, plugins, deep-link scheme)
├── package.json             # npm dependencies
├── tsconfig.json            # TypeScript config (extends expo/tsconfig.base)
├── babel.config.js          # Babel preset (babel-preset-expo)
├── metro.config.js          # Metro bundler config
│
├── .env                     # ← you create this (not committed)
├── .env.example             # Template showing required env vars
│
├── logo/
│   ├── 1.png                # Logo variant 1 (unused in UI)
│   ├── 2.png                # Logo variant 2 — used in the top toolbar
│   └── 3.png                # Logo variant 3 (unused in UI)
│
├── supabase/
│   └── schema.sql           # Full Postgres schema: tables, indexes, RLS policies,
│                            # storage bucket for section images, OAuth notes
│
├── ui-design/               # Design reference files (not deployed)
│   ├── Tide.dc.html         # Original UI mock-up / design spec
│   ├── log-ref.png          # Visual reference screenshot
│   ├── support.js           # Design tool support script
│   ├── .thumbnail           # Design tool thumbnail cache
│   ├── screenshots/         # App screenshots (docs, editor, toolbar)
│   └── uploads/             # Image assets used in the mock-up
│
└── src/
    │
    ├── types.ts             # Shared TypeScript types
    │                        #   Block = TextBlock | BulletsBlock | ImageBlock
    │                        #   Section, Tag, TideDocument
    │                        #   AppView = 'stream' | 'docs' | { type: 'editor'; docId: string }
    │
    ├── theme.ts             # Design tokens
    │                        #   C  — color palette (background, text, primary, borders…)
    │                        #   R  — border radii (sm, md, lg, xl, pill)
    │                        #   S  — spacing scale (sm, md, lg, xl)
    │
    ├── predefinedTags.ts    # The 9 built-in tags (Work, Health, Diary, Study…)
    │                        #   with fixed ids and hex colors
    │
    ├── utils.ts             # Pure helpers
    │                        #   uuid()             — random ID (crypto.randomUUID)
    │                        #   nowISO()           — current datetime ISO string
    │                        #   todayISO()         — YYYY-MM-DD
    │                        #   formatDateLabel()  — "Today · Tue, Jun 23" / "Mon, Jun 22"
    │                        #   formatTime()       — "7:42 AM"
    │                        #   formatMonthLabel() — "June 2026"
    │                        #   groupByDate()      — groups Section[] by .date
    │                        #   countWords()       — word count from a string
    │
    ├── supabase.ts          # Supabase client initialisation
    │                        #   Reads EXPO_PUBLIC_SUPABASE_URL / ANON_KEY from env
    │                        #   Exports a single `supabase` client used everywhere
    │
    ├── db.ts                # All SQLite operations (mobile only)
    │                        #   initDB()       — creates tables, seeds predefined tags
    │                        #   CRUD for tags, sections, section_tags, documents
    │                        #   syncFromSupabase() — pulls latest data from Supabase
    │                        #   push* helpers  — upsert a single row to Supabase
    │                        #   deleteRemote() — deletes a row from Supabase by table+id
    │
    ├── webDataService.ts    # Supabase CRUD used by the web provider
    │                        #   getTags / insertTag / removeTag / renameTag
    │                        #   getSections / insertSection / updateSection / deleteSection
    │                        #   pinSection / updateSectionTagsOnly
    │                        #   getDocuments / getDocument / insertDocument /
    │                        #   updateDocument / deleteDocument
    │                        #   ensurePredefinedTags() — seeds built-in tags for new users
    │
    ├── context.tsx          # React context: AppProvider + useApp hook
    │                        #   WebAppProvider  — reads/writes directly to Supabase
    │                        #   MobileAppProvider — SQLite primary + background Supabase sync
    │                        #   Exposes: sections, tags, docs, view, activeTags,
    │                        #            searchQuery, filteredSections, userId
    │                        #   Actions: setView, toggleTag, CRUD for all entities,
    │                        #            signOut, reload
    │
    ├── AuthScreen.tsx       # Sign-in screen (shown when no Supabase session)
    │                        #   Email + password sign-in / sign-up
    │                        #   Google OAuth button (if configured)
    │
    ├── Toolbar.tsx          # Top bar + mobile extras
    │                        #   Web (62 px): logo, Stream/Documents tabs, search, avatar menu
    │                        #   Mobile (56 px): S/D tabs (left), logo (center),
    │                        #                  calendar/# buttons (right)
    │                        #   MobileBottomBar: search, + new, account (rendered by App.tsx)
    │                        #   MobileSearchBar: full-width search overlay
    │
    ├── TimelineSidebar.tsx  # Timeline sidebar
    │                        #   Web: left in-flow (160 px open, 56 px closed)
    │                        #   Mobile: absolute overlay on the RIGHT (160 px)
    │                        #   Groups section dates by month; tap a date to scroll stream
    │
    ├── TagsSidebar.tsx      # Tags sidebar
    │                        #   Web: left in-flow (160 px open, 58 px closed)
    │                        #   Mobile: absolute overlay on the RIGHT (160 px)
    │                        #   Checkbox list; long-press a custom tag to delete it
    │                        #   Inline "New tag" form with hex color picker
    │
    ├── SectionCard.tsx      # Renders one section card in the stream
    │                        #   Header: title, tag chips, time, pin / reminder badges, ··· menu
    │                        #   Body: text paragraphs, bullet lists, image blocks
    │                        #   Inline checkbox support in bullet items
    │
    ├── SectionModal.tsx     # Create / edit section (Modal sheet)
    │                        #   Fields: title, date, reminder toggle + date,
    │                        #           tag multi-select, content blocks
    │                        #   Block toolbar: + Text | + Bullets | 🖼 Image
    │
    ├── StreamScreen.tsx     # Stream view layout
    │                        #   Web: [TimelineSidebar][TagsSidebar][ScrollView]
    │                        #   Mobile: full-screen ScrollView + pull-to-refresh;
    │                        #           sidebars rendered as absolute overlays when open
    │
    ├── DocsScreen.tsx       # Documents list view
    │                        #   DocCard grid (flex-wrap, 2 columns)
    │                        #   DocsSidebar: web = left panel (160 px); mobile = right overlay
    │                        #   Modal dialog: new document title + accent color picker
    │
    └── EditorScreen.tsx     # Document editor
                             #   HTML as storage format (legacyToHtml migrates old # markdown)
                             #   htmlToLines() / linesToHtml() convert between HTML and the
                             #   mobile per-line model; inline ** * __ == markers ↔ <b><i><u><mark>
                             #   Web: contentEditable div + execCommand toolbar
                             #   Mobile: per-line TextInput stack with LINE_STYLE per format
                             #   Outline sidebar: web = left in-flow; mobile = right overlay
                             #   Auto-saves 1.2 s after last change; word count updated on save
```

---

## Data model

### Supabase (Postgres)

All tables have `user_id UUID` tied to `auth.users` with Row Level Security — users only see their own data.

**`tags`**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | predefined tags use a slug e.g. `"work"` |
| user_id | UUID | |
| name | TEXT | display name |
| color | TEXT | hex color |
| is_predefined | BOOLEAN | true = built-in, cannot be deleted |

**`sections`**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | UUID | |
| title | TEXT | |
| date | TEXT | `YYYY-MM-DD` — controls date grouping in the stream |
| created_at | TEXT | ISO 8601 — shown as the time on the card |
| is_reminder | BOOLEAN | |
| reminder_date | TEXT | `YYYY-MM-DD`, nullable |
| is_pinned | BOOLEAN | pinned sections float to the top |
| blocks | JSONB | array of `Block` objects |

**`section_tags`** — junction table (section_id, tag_id) linking sections to tags many-to-many.

**`documents`**
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | UUID | |
| title | TEXT | |
| content | TEXT | HTML string |
| color | TEXT | accent hex color |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601; updated on every auto-save |
| word_count | INTEGER | recomputed on every auto-save |

### SQLite (mobile cache)

Same schema as above, mirrored locally. `db.ts` keeps the tables in sync with `syncFromSupabase()` on startup and after pull-to-refresh.

---

## Tech stack

| Package | Version | Purpose |
|---|---|---|
| expo | ~54.0.0 | Build toolchain, dev server, OTA updates |
| expo-sqlite | ~16.0.10 | Local SQLite on mobile (WAL mode) |
| expo-image-picker | ~17.0.11 | Photo library / camera for image blocks |
| expo-linking | ~8.0.12 | Deep-link handling for OAuth callback |
| expo-web-browser | ~15.0.11 | In-app browser for OAuth flow |
| @supabase/supabase-js | ^2.108.2 | Supabase client (Auth, Postgres, Storage) |
| react | 19.1.0 | |
| react-native | 0.81.5 | Cross-platform UI primitives |
| react-native-web | ^0.21.0 | RN-to-DOM bridge for web target |
| react-dom | 19.1.0 | Required by react-native-web |
