import type { SQLiteDatabase } from 'expo-sqlite';
import { Section, Tag, TideDocument, Block } from './types';
import { PREDEFINED_TAGS } from './predefinedTags';
import { supabase } from './supabase';

export async function initDB(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS tags (
      id          TEXT PRIMARY KEY,
      user_id     TEXT,
      name        TEXT NOT NULL UNIQUE,
      color       TEXT NOT NULL,
      is_predefined INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sections (
      id           TEXT PRIMARY KEY,
      user_id      TEXT,
      title        TEXT NOT NULL DEFAULT '',
      date         TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      is_reminder  INTEGER NOT NULL DEFAULT 0,
      reminder_date TEXT,
      is_pinned    INTEGER NOT NULL DEFAULT 0,
      blocks       TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS section_tags (
      section_id TEXT NOT NULL,
      tag_id     TEXT NOT NULL,
      PRIMARY KEY (section_id, tag_id),
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)     REFERENCES tags(id)     ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id         TEXT PRIMARY KEY,
      user_id    TEXT,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      color      TEXT NOT NULL DEFAULT '#9b6fdb',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0
    );
  `);

  // migrations for older schemas
  for (const col of [
    `ALTER TABLE sections ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE sections ADD COLUMN user_id TEXT`,
    `ALTER TABLE tags ADD COLUMN user_id TEXT`,
    `ALTER TABLE documents ADD COLUMN user_id TEXT`,
  ]) {
    await db.execAsync(col).catch(() => {});
  }

  for (const t of PREDEFINED_TAGS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO tags (id,name,color,is_predefined) VALUES (?,?,?,1)`,
      [t.id, t.name, t.color]
    );
  }
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(db: SQLiteDatabase, userId?: string): Promise<Tag[]> {
  const rows = await db.getAllAsync<any>(
    userId
      ? `SELECT * FROM tags WHERE user_id=? OR is_predefined=1 ORDER BY is_predefined DESC, name ASC`
      : `SELECT * FROM tags ORDER BY is_predefined DESC, name ASC`,
    userId ? [userId] : []
  );
  return rows.map(r => ({ id: r.id, name: r.name, color: r.color, isPredefined: r.is_predefined === 1 }));
}

export async function insertTag(db: SQLiteDatabase, tag: Tag, userId?: string) {
  await db.runAsync(
    `INSERT OR IGNORE INTO tags (id,name,color,is_predefined,user_id) VALUES (?,?,?,?,?)`,
    [tag.id, tag.name, tag.color, tag.isPredefined ? 1 : 0, userId ?? null]
  );
}

export async function removeTag(db: SQLiteDatabase, id: string) {
  await db.runAsync(`DELETE FROM tags WHERE id=? AND is_predefined=0`, [id]);
}

export async function renameTag(db: SQLiteDatabase, id: string, name: string) {
  await db.runAsync(`UPDATE tags SET name=? WHERE id=?`, [name, id]);
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function getSections(db: SQLiteDatabase, userId?: string): Promise<Section[]> {
  const rows = await db.getAllAsync<any>(
    userId
      ? `SELECT s.*, GROUP_CONCAT(st.tag_id) AS tag_ids
         FROM sections s
         LEFT JOIN section_tags st ON s.id = st.section_id
         WHERE s.user_id=?
         GROUP BY s.id
         ORDER BY s.is_pinned DESC, s.date DESC, s.created_at DESC`
      : `SELECT s.*, GROUP_CONCAT(st.tag_id) AS tag_ids
         FROM sections s
         LEFT JOIN section_tags st ON s.id = st.section_id
         GROUP BY s.id
         ORDER BY s.is_pinned DESC, s.date DESC, s.created_at DESC`,
    userId ? [userId] : []
  );
  const allTags = await getTags(db, userId);
  const tagMap = new Map(allTags.map(t => [t.id, t]));

  return rows.map(r => ({
    id: r.id, title: r.title, date: r.date, createdAt: r.created_at,
    isReminder: r.is_reminder === 1, reminderDate: r.reminder_date ?? undefined,
    isPinned: r.is_pinned === 1,
    blocks: JSON.parse(r.blocks || '[]') as Block[],
    tags: (r.tag_ids ? r.tag_ids.split(',') : [])
      .map((tid: string) => tagMap.get(tid)).filter(Boolean) as Tag[],
  }));
}

export async function insertSection(db: SQLiteDatabase, s: Section, userId?: string) {
  await db.runAsync(
    `INSERT OR REPLACE INTO sections (id,user_id,title,date,created_at,is_reminder,reminder_date,is_pinned,blocks)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [s.id, userId ?? null, s.title, s.date, s.createdAt, s.isReminder ? 1 : 0,
     s.reminderDate ?? null, s.isPinned ? 1 : 0, JSON.stringify(s.blocks)]
  );
  for (const t of s.tags) {
    await db.runAsync(
      `INSERT OR IGNORE INTO section_tags (section_id,tag_id) VALUES (?,?)`, [s.id, t.id]
    );
  }
}

export async function updateSectionTagsOnly(db: SQLiteDatabase, sectionId: string, tags: Tag[]) {
  await db.runAsync(`DELETE FROM section_tags WHERE section_id=?`, [sectionId]);
  for (const t of tags) {
    await db.runAsync(
      `INSERT OR IGNORE INTO section_tags (section_id,tag_id) VALUES (?,?)`, [sectionId, t.id]
    );
  }
}

export async function pushSectionTagsOnly(sectionId: string, tags: Tag[]): Promise<void> {
  const { error } = await supabase.from('section_tags').delete().eq('section_id', sectionId);
  if (error) { console.warn('push section_tags delete', error); return; }
  if (tags.length > 0) {
    const { error: ie } = await supabase.from('section_tags')
      .insert(tags.map(t => ({ section_id: sectionId, tag_id: t.id })));
    if (ie) console.warn('push section_tags insert', ie);
  }
}

export async function updateSection(db: SQLiteDatabase, s: Section, userId?: string) {
  await db.runAsync(
    `UPDATE sections SET title=?,date=?,is_reminder=?,reminder_date=?,is_pinned=?,blocks=?,user_id=? WHERE id=?`,
    [s.title, s.date, s.isReminder ? 1 : 0, s.reminderDate ?? null,
     s.isPinned ? 1 : 0, JSON.stringify(s.blocks), userId ?? null, s.id]
  );
  await db.runAsync(`DELETE FROM section_tags WHERE section_id=?`, [s.id]);
  for (const t of s.tags) {
    await db.runAsync(
      `INSERT OR IGNORE INTO section_tags (section_id,tag_id) VALUES (?,?)`, [s.id, t.id]
    );
  }
}

export async function pinSection(db: SQLiteDatabase, id: string, pinned: boolean) {
  await db.runAsync(`UPDATE sections SET is_pinned=? WHERE id=?`, [pinned ? 1 : 0, id]);
}

export async function deleteSection(db: SQLiteDatabase, id: string) {
  await db.runAsync(`DELETE FROM sections WHERE id=?`, [id]);
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(db: SQLiteDatabase, userId?: string): Promise<TideDocument[]> {
  const rows = await db.getAllAsync<any>(
    userId
      ? `SELECT * FROM documents WHERE user_id=? ORDER BY updated_at DESC`
      : `SELECT * FROM documents ORDER BY updated_at DESC`,
    userId ? [userId] : []
  );
  return rows.map(r => ({
    id: r.id, title: r.title, content: r.content, color: r.color,
    createdAt: r.created_at, updatedAt: r.updated_at, wordCount: r.word_count,
  }));
}

export async function getDocument(db: SQLiteDatabase, id: string): Promise<TideDocument | null> {
  const r = await db.getFirstAsync<any>(`SELECT * FROM documents WHERE id=?`, [id]);
  if (!r) return null;
  return { id: r.id, title: r.title, content: r.content, color: r.color,
    createdAt: r.created_at, updatedAt: r.updated_at, wordCount: r.word_count };
}

export async function insertDocument(db: SQLiteDatabase, d: TideDocument, userId?: string) {
  await db.runAsync(
    `INSERT OR REPLACE INTO documents (id,user_id,title,content,color,created_at,updated_at,word_count)
     VALUES (?,?,?,?,?,?,?,?)`,
    [d.id, userId ?? null, d.title, d.content, d.color, d.createdAt, d.updatedAt, d.wordCount]
  );
}

export async function updateDocument(db: SQLiteDatabase, d: TideDocument) {
  await db.runAsync(
    `UPDATE documents SET title=?,content=?,color=?,updated_at=?,word_count=? WHERE id=?`,
    [d.title, d.content, d.color, d.updatedAt, d.wordCount, d.id]
  );
}

export async function deleteDocument(db: SQLiteDatabase, id: string) {
  await db.runAsync(`DELETE FROM documents WHERE id=?`, [id]);
}

// ── Supabase sync (mobile only) ───────────────────────────────────────────────

export async function syncFromSupabase(db: SQLiteDatabase, userId: string) {
  const [tagsRes, sectionsRes, sectionTagsRes, docsRes] = await Promise.all([
    supabase.from('tags').select('*').eq('user_id', userId),
    supabase.from('sections').select('*').eq('user_id', userId),
    supabase.from('section_tags').select('section_id, tag_id'),
    supabase.from('documents').select('*').eq('user_id', userId),
  ]);

  if (tagsRes.error || sectionsRes.error || sectionTagsRes.error || docsRes.error) {
    console.warn('Supabase sync error', tagsRes.error ?? sectionsRes.error ?? sectionTagsRes.error ?? docsRes.error);
    return;
  }

  // clear user data
  await db.runAsync(`DELETE FROM sections WHERE user_id=?`, [userId]);
  await db.runAsync(`DELETE FROM tags WHERE user_id=? AND is_predefined=0`, [userId]);
  await db.runAsync(`DELETE FROM documents WHERE user_id=?`, [userId]);

  for (const t of tagsRes.data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO tags (id,user_id,name,color,is_predefined) VALUES (?,?,?,?,?)`,
      [t.id, userId, t.name, t.color, t.is_predefined ? 1 : 0]
    );
  }
  for (const s of sectionsRes.data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO sections (id,user_id,title,date,created_at,is_reminder,reminder_date,is_pinned,blocks)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [s.id, userId, s.title ?? '', s.date, s.created_at, s.is_reminder ? 1 : 0,
       s.reminder_date ?? null, s.is_pinned ? 1 : 0, JSON.stringify(s.blocks ?? [])]
    );
  }
  for (const st of sectionTagsRes.data ?? []) {
    await db.runAsync(
      `INSERT OR IGNORE INTO section_tags (section_id,tag_id) VALUES (?,?)`,
      [st.section_id, st.tag_id]
    );
  }
  for (const d of docsRes.data ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO documents (id,user_id,title,content,color,created_at,updated_at,word_count)
       VALUES (?,?,?,?,?,?,?,?)`,
      [d.id, userId, d.title, d.content ?? '', d.color, d.created_at, d.updated_at, d.word_count ?? 0]
    );
  }
}

export async function pushSection(s: Section, userId: string): Promise<void> {
  const row = {
    id: s.id, user_id: userId, title: s.title, date: s.date, created_at: s.createdAt,
    is_reminder: s.isReminder, reminder_date: s.reminderDate ?? null,
    is_pinned: s.isPinned, blocks: s.blocks,
  };
  const { error } = await supabase.from('sections').upsert(row, { onConflict: 'id' });
  if (error) { console.warn('push section', error); return; }
  await supabase.from('section_tags').delete().eq('section_id', s.id);
  if (s.tags.length > 0) {
    const { error: te } = await supabase.from('section_tags')
      .insert(s.tags.map(t => ({ section_id: s.id, tag_id: t.id })));
    if (te) console.warn('push section_tags', te);
  }
}

export async function pushTag(t: Tag, userId: string): Promise<void> {
  const { error } = await supabase.from('tags').upsert(
    { id: t.id, user_id: userId, name: t.name, color: t.color, is_predefined: t.isPredefined },
    { onConflict: 'id' }
  );
  if (error) console.warn('push tag', error);
}

export async function pushDocument(d: TideDocument, userId: string): Promise<void> {
  const { error } = await supabase.from('documents').upsert(
    { id: d.id, user_id: userId, title: d.title, content: d.content, color: d.color,
      created_at: d.createdAt, updated_at: d.updatedAt, word_count: d.wordCount },
    { onConflict: 'id' }
  );
  if (error) console.warn('push doc', error);
}

export function deleteRemote(table: 'sections' | 'tags' | 'documents', id: string) {
  supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) console.warn(`delete remote ${table}`, error);
  });
}

export async function clearAllUserData(db: SQLiteDatabase, userId: string): Promise<void> {
  await db.runAsync(`DELETE FROM sections WHERE user_id=?`, [userId]);
  await db.runAsync(`DELETE FROM tags WHERE user_id=? AND is_predefined=0`, [userId]);
  await db.runAsync(`DELETE FROM documents WHERE user_id=?`, [userId]);
}
