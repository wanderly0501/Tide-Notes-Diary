import { supabase } from './supabase';
import { Section, Tag, TideDocument, Block } from './types';
import { PREDEFINED_TAGS } from './predefinedTags';

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapTag(r: any): Tag {
  return { id: r.id, name: r.name, color: r.color, isPredefined: r.is_predefined };
}

function mapSection(r: any, tagMap: Map<string, Tag>): Section {
  const tagIds: string[] = (r.section_tags ?? []).map((st: any) => st.tag_id);
  return {
    id: r.id,
    title: r.title ?? '',
    date: r.date,
    createdAt: r.created_at,
    isReminder: r.is_reminder ?? false,
    reminderDate: r.reminder_date ?? undefined,
    isPinned: r.is_pinned ?? false,
    blocks: (r.blocks ?? []) as Block[],
    tags: tagIds.map(id => tagMap.get(id)).filter(Boolean) as Tag[],
  };
}

function mapDoc(r: any): TideDocument {
  return {
    id: r.id, title: r.title, content: r.content, color: r.color,
    createdAt: r.created_at, updatedAt: r.updated_at, wordCount: r.word_count ?? 0,
  };
}

// ── Bootstrap (seed predefined tags for new users) ────────────────────────────

export async function ensurePredefinedTags(userId: string) {
  for (const t of PREDEFINED_TAGS) {
    await supabase.from('tags').upsert(
      { id: t.id, user_id: userId, name: t.name, color: t.color, is_predefined: true },
      { onConflict: 'id' }
    );
  }
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export async function getTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('is_predefined', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapTag);
}

export async function insertTag(userId: string, tag: Tag) {
  const { error } = await supabase.from('tags').insert({
    id: tag.id, user_id: userId, name: tag.name, color: tag.color, is_predefined: tag.isPredefined,
  });
  if (error) throw error;
}

export async function removeTag(userId: string, id: string) {
  const { error } = await supabase
    .from('tags').delete().eq('id', id).eq('user_id', userId).eq('is_predefined', false);
  if (error) throw error;
}

export async function renameTag(userId: string, id: string, name: string) {
  const { error } = await supabase
    .from('tags').update({ name }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function getSections(userId: string): Promise<Section[]> {
  const [tagsResult, sectionsResult] = await Promise.all([
    supabase.from('tags').select('*').eq('user_id', userId),
    supabase.from('sections').select('*, section_tags(tag_id)')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);
  if (sectionsResult.error) throw sectionsResult.error;
  if (tagsResult.error) throw tagsResult.error;
  const tagMap = new Map((tagsResult.data ?? []).map((t: any) => [t.id, mapTag(t)]));
  return (sectionsResult.data ?? []).map(r => mapSection(r, tagMap));
}

export async function insertSection(userId: string, s: Section) {
  const { error } = await supabase.from('sections').insert({
    id: s.id, user_id: userId, title: s.title, date: s.date,
    created_at: s.createdAt, is_reminder: s.isReminder,
    reminder_date: s.reminderDate ?? null, is_pinned: s.isPinned, blocks: s.blocks,
  });
  if (error) throw error;
  if (s.tags.length > 0) {
    const { error: e } = await supabase.from('section_tags').insert(
      s.tags.map(t => ({ section_id: s.id, tag_id: t.id }))
    );
    if (e) throw e;
  }
}

export async function updateSectionTagsOnly(sectionId: string, tags: Tag[]) {
  await supabase.from('section_tags').delete().eq('section_id', sectionId);
  if (tags.length > 0) {
    const { error } = await supabase.from('section_tags').insert(
      tags.map(t => ({ section_id: sectionId, tag_id: t.id }))
    );
    if (error) throw error;
  }
}

export async function updateSection(userId: string, s: Section) {
  const { error } = await supabase.from('sections').update({
    title: s.title, date: s.date, is_reminder: s.isReminder,
    reminder_date: s.reminderDate ?? null, is_pinned: s.isPinned, blocks: s.blocks,
  }).eq('id', s.id).eq('user_id', userId);
  if (error) throw error;

  await supabase.from('section_tags').delete().eq('section_id', s.id);
  if (s.tags.length > 0) {
    const { error: e } = await supabase.from('section_tags').insert(
      s.tags.map(t => ({ section_id: s.id, tag_id: t.id }))
    );
    if (e) throw e;
  }
}

export async function pinSection(userId: string, id: string, pinned: boolean) {
  const { error } = await supabase.from('sections')
    .update({ is_pinned: pinned }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteSection(userId: string, id: string) {
  const { error } = await supabase.from('sections')
    .delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(userId: string): Promise<TideDocument[]> {
  const { data, error } = await supabase
    .from('documents').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDoc);
}

export async function getDocument(userId: string, id: string): Promise<TideDocument | null> {
  const { data, error } = await supabase
    .from('documents').select('*').eq('id', id).eq('user_id', userId).single();
  if (error || !data) return null;
  return mapDoc(data);
}

export async function insertDocument(userId: string, d: TideDocument) {
  const { error } = await supabase.from('documents').insert({
    id: d.id, user_id: userId, title: d.title, content: d.content,
    color: d.color, created_at: d.createdAt, updated_at: d.updatedAt, word_count: d.wordCount,
  });
  if (error) throw error;
}

export async function updateDocument(userId: string, d: TideDocument) {
  const { error } = await supabase.from('documents').update({
    title: d.title, content: d.content, color: d.color,
    updated_at: d.updatedAt, word_count: d.wordCount,
  }).eq('id', d.id).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteDocument(userId: string, id: string) {
  const { error } = await supabase.from('documents')
    .delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
