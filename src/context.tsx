import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Section, Tag, TideDocument, AppView } from './types';
import * as DB from './db';
import * as Web from './webDataService';
import { supabase, deleteAccountData } from './supabase';
import { C } from './theme';

interface Ctx {
  sections: Section[];
  tags: Tag[];
  docs: TideDocument[];
  view: AppView;
  activeTags: Set<string>;
  searchQuery: string;
  filteredSections: Section[];
  userId: string;

  setView(v: AppView): void;
  toggleTag(id: string): void;
  deselectAllTags(): void;
  selectAllTags(): void;
  setSearchQuery(q: string): void;

  togglePin(id: string, pinned: boolean): Promise<void>;
  addSection(s: Section): Promise<void>;
  editSection(s: Section): Promise<void>;
  removeSection(id: string): Promise<void>;
  updateSectionTags(sectionId: string, tags: Tag[]): Promise<void>;

  addTag(t: Tag): Promise<void>;
  removeTag(id: string): Promise<void>;
  renameTag(id: string, name: string): Promise<void>;

  addDoc(d: TideDocument): Promise<void>;
  editDoc(d: TideDocument): Promise<void>;
  removeDoc(id: string): Promise<void>;
  getDoc(id: string): Promise<TideDocument | null>;

  signOut(): Promise<void>;
  reload(): Promise<void>;
  deleteAccount(): Promise<void>;
}

const AppCtx = createContext<Ctx | null>(null);

interface ProviderProps { children: React.ReactNode; userId: string }

// ── Web provider — reads/writes go directly to Supabase ───────────────────────

function WebAppProvider({ children, userId }: ProviderProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [tags, setTags]         = useState<Tag[]>([]);
  const [docs, setDocs]         = useState<TideDocument[]>([]);
  const [view, setView]         = useState<AppView>('stream');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [ready, setReady]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      await Web.ensurePredefinedTags(userId);
      const [s, t, d] = await Promise.all([
        Web.getSections(userId), Web.getTags(userId), Web.getDocuments(userId),
      ]);
      setSections(s); setTags(t); setDocs(d);
      setActiveTags(prev => {
        if (prev.size === 0) return new Set(t.map(x => x.id));
        const next = new Set(prev);
        t.forEach(x => { if (!next.has(x.id)) next.add(x.id); });
        return next;
      });
      setReady(true);
    } catch (e: any) {
      console.error('loadAll (web):', e);
      setError(String(e?.message ?? e));
    }
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredSections = useFilteredSections(sections, tags, activeTags, searchQuery);

  if (error) return <ErrorView msg={error} />;
  if (!ready) return <LoadingView />;

  const toggleTag        = (id: string) => setActiveTags(prev => toggle(prev, id));
  const deselectAllTags  = () => setActiveTags(new Set());
  const selectAllTags    = () => setActiveTags(new Set(tags.map(t => t.id)));
  const signOut         = async () => { await supabase.auth.signOut(); };
  const deleteAccount   = async () => { await deleteAccountData(userId); await supabase.auth.signOut(); };

  const togglePin          = async (id: string, pinned: boolean) => { await Web.pinSection(userId, id, pinned); await loadAll(); };
  const addSection         = async (s: Section) => { await Web.insertSection(userId, s); await loadAll(); };
  const editSection        = async (s: Section) => { await Web.updateSection(userId, s); await loadAll(); };
  const removeSection      = async (id: string) => { await Web.deleteSection(userId, id); await loadAll(); };
  const updateSectionTags  = async (sectionId: string, tags: Tag[]) => { await Web.updateSectionTagsOnly(sectionId, tags); await loadAll(); };
  const addTag        = async (t: Tag)     => { await Web.insertTag(userId, t);      await loadAll(); };
  const removeTag     = async (id: string) => { await Web.removeTag(userId, id);     await loadAll(); };
  const renameTag     = async (id: string, n: string) => { await Web.renameTag(userId, id, n); await loadAll(); };
  const addDoc        = async (d: TideDocument) => { await Web.insertDocument(userId, d); await loadAll(); };
  const editDoc       = async (d: TideDocument) => { await Web.updateDocument(userId, d); await loadAll(); };
  const removeDoc     = async (id: string) => { await Web.deleteDocument(userId, id); await loadAll(); };
  const getDoc        = (id: string) => Web.getDocument(userId, id);

  return (
    <AppCtx.Provider value={{
      sections, tags, docs, view, activeTags, searchQuery, filteredSections, userId,
      setView, toggleTag, deselectAllTags, selectAllTags, setSearchQuery,
      togglePin, addSection, editSection, removeSection, updateSectionTags,
      addTag, removeTag, renameTag,
      addDoc, editDoc, removeDoc, getDoc,
      signOut, deleteAccount, reload: loadAll,  // web: loadAll already fetches from Supabase
    }}>
      {children}
    </AppCtx.Provider>
  );
}

// ── Mobile provider — SQLite primary + background Supabase sync ───────────────

function MobileAppProvider({ children, userId }: ProviderProps) {
  const db = useSQLiteContext();
  const [sections, setSections] = useState<Section[]>([]);
  const [tags, setTags]         = useState<Tag[]>([]);
  const [docs, setDocs]         = useState<TideDocument[]>([]);
  const [view, setView]         = useState<AppView>('stream');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [ready, setReady]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const loadLocal = useCallback(async () => {
    const [s, t, d] = await Promise.all([
      DB.getSections(db, userId), DB.getTags(db, userId), DB.getDocuments(db, userId),
    ]);
    setSections(s); setTags(t); setDocs(d);
    setActiveTags(prev => {
      if (prev.size === 0) return new Set(t.map(x => x.id));
      const next = new Set(prev);
      t.forEach(x => { if (!next.has(x.id)) next.add(x.id); });
      return next;
    });
  }, [db, userId]);

  useEffect(() => {
    (async () => {
      try {
        // Sync from Supabase on startup, then load local
        await DB.syncFromSupabase(db, userId);
      } catch (e) {
        console.warn('Initial sync failed, using local data:', e);
      }
      try {
        await loadLocal();
        setReady(true);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  const loadAll = useCallback(async () => {
    await loadLocal();
  }, [loadLocal]);

  const syncAndReload = useCallback(async () => {
    try { await DB.syncFromSupabase(db, userId); } catch (e) { console.warn('sync failed', e); }
    await loadLocal();
  }, [db, userId, loadLocal]);

  const filteredSections = useFilteredSections(sections, tags, activeTags, searchQuery);

  if (error) return <ErrorView msg={error} />;
  if (!ready) return <LoadingView />;

  const toggleTag       = (id: string) => setActiveTags(prev => toggle(prev, id));
  const deselectAllTags = () => setActiveTags(new Set());
  const selectAllTags   = () => setActiveTags(new Set(tags.map(t => t.id)));
  const signOut         = async () => { await supabase.auth.signOut(); };
  const deleteAccount   = async () => {
    await DB.clearAllUserData(db, userId);
    await deleteAccountData(userId);
    await supabase.auth.signOut();
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await DB.pinSection(db, id, pinned);
    const s = sections.find(x => x.id === id);
    if (s) await DB.pushSection({ ...s, isPinned: pinned }, userId);
    await loadAll();
  };
  const addSection = async (s: Section) => {
    await DB.insertSection(db, s, userId);
    await DB.pushSection(s, userId);
    await loadAll();
  };
  const editSection = async (s: Section) => {
    await DB.updateSection(db, s, userId);
    await DB.pushSection(s, userId);
    await loadAll();
  };
  const updateSectionTags = async (sectionId: string, tags: Tag[]) => {
    await DB.updateSectionTagsOnly(db, sectionId, tags);
    await DB.pushSectionTagsOnly(sectionId, tags);
    await loadAll();
  };
  const removeSection = async (id: string) => {
    await DB.deleteSection(db, id);
    DB.deleteRemote('sections', id);
    await loadAll();
  };
  const addTag = async (t: Tag) => {
    await DB.insertTag(db, t, userId);
    await DB.pushTag(t, userId);
    await loadAll();
  };
  const removeTag = async (id: string) => {
    await DB.removeTag(db, id);
    DB.deleteRemote('tags', id);
    await loadAll();
  };
  const renameTag = async (id: string, n: string) => {
    await DB.renameTag(db, id, n);
    const t = tags.find(x => x.id === id);
    if (t) await DB.pushTag({ ...t, name: n }, userId);
    await loadAll();
  };
  const addDoc = async (d: TideDocument) => {
    await DB.insertDocument(db, d, userId);
    await DB.pushDocument(d, userId);
    await loadAll();
  };
  const editDoc = async (d: TideDocument) => {
    await DB.updateDocument(db, d);
    await DB.pushDocument(d, userId);
    await loadAll();
  };
  const removeDoc = async (id: string) => {
    await DB.deleteDocument(db, id);
    DB.deleteRemote('documents', id);
    await loadAll();
  };
  const getDoc = (id: string) => DB.getDocument(db, id);

  return (
    <AppCtx.Provider value={{
      sections, tags, docs, view, activeTags, searchQuery, filteredSections, userId,
      setView, toggleTag, deselectAllTags, selectAllTags, setSearchQuery,
      togglePin, addSection, editSection, removeSection, updateSectionTags,
      addTag, removeTag, renameTag,
      addDoc, editDoc, removeDoc, getDoc,
      signOut, deleteAccount, reload: syncAndReload,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

// ── Public export — routes to Web or Mobile provider ─────────────────────────

export function AppProvider({ children, userId }: ProviderProps) {
  if (Platform.OS === 'web') {
    return <WebAppProvider userId={userId}>{children}</WebAppProvider>;
  }
  return <MobileAppProvider userId={userId}>{children}</MobileAppProvider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function toggle(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
}

function useFilteredSections(
  sections: Section[], tags: Tag[], activeTags: Set<string>, searchQuery: string
): Section[] {
  return useMemo(() => {
    let res = sections;
    const allActive = activeTags.size >= tags.length;
    if (!allActive && activeTags.size > 0) {
      res = res.filter(s => s.tags.length > 0 && s.tags.some(t => activeTags.has(t.id)));
    } else if (activeTags.size === 0) {
      res = [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some(t => t.name.toLowerCase().includes(q)) ||
        s.blocks.some(b =>
          b.type === 'text' ? b.content.toLowerCase().includes(q) :
          b.type === 'bullets' ? b.items.some(i => i.toLowerCase().includes(q)) : false
        )
      );
    }
    return res;
  }, [sections, tags, activeTags, searchQuery]);
}

const webH = Platform.OS === 'web' ? ('100vh' as any) : '100%';

function LoadingView() {
  return (
    <View style={ls.center}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={ls.hint}>Opening Tide…</Text>
    </View>
  );
}

function ErrorView({ msg }: { msg: string }) {
  return (
    <View style={ls.center}>
      <Text style={ls.errTitle}>Failed to load data</Text>
      <Text style={ls.errMsg}>{msg}</Text>
    </View>
  );
}

const ls = StyleSheet.create({
  center:   { flex: 1, height: webH, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 16 },
  hint:     { fontSize: 15, color: C.textMuted },
  errTitle: { fontSize: 16, fontWeight: '600', color: '#c62828' },
  errMsg:   { fontSize: 13, color: C.textMuted, textAlign: 'center', maxWidth: 360, paddingHorizontal: 24 },
});
