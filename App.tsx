import React, { Component, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/supabase';
import { initDB } from './src/db';
import { AppProvider, useApp } from './src/context';
import { AuthScreen } from './src/AuthScreen';
import { Toolbar, MobileBottomBar, MobileSearchBar } from './src/Toolbar';
import { StreamScreen } from './src/StreamScreen';
import { DocsScreen } from './src/DocsScreen';
import { EditorScreen } from './src/EditorScreen';
import { C } from './src/theme';

class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message || String(e) }; }
  render() {
    if (this.state.error) {
      return (
        <View style={s.errBox}>
          <Text style={s.errTitle}>Error</Text>
          <Text style={s.errMsg}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Main app (requires AppProvider in context) ────────────────────────────────

function TideApp() {
  const { view, signOut } = useApp();
  const isEditor = typeof view === 'object' && view.type === 'editor';
  const isMobile = Platform.OS !== 'web';

  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newDocOpen, setNewDocOpen]         = useState(false);
  const [timelineOpen, setTimelineOpen]     = useState(false);
  const [tagsOpen, setTagsOpen]             = useState(false);
  const [filesOpen, setFilesOpen]           = useState(false);
  const [searchOpen, setSearchOpen]         = useState(false);

  const isStream = view === 'stream';

  const handleNew = () => {
    if (isStream) setNewSectionOpen(true);
    else          setNewDocOpen(true);
  };

  return (
    <View style={s.root}>
      <StatusBar style="dark" />

      {isMobile && searchOpen ? (
        <MobileSearchBar onClose={() => setSearchOpen(false)} />
      ) : (
        <Toolbar
          onNewSection={() => setNewSectionOpen(true)}
          onNewDoc={() => setNewDocOpen(true)}
          onToggleTimeline={() => setTimelineOpen(o => !o)}
          onToggleTags={() => setTagsOpen(o => !o)}
          onToggleFiles={() => setFilesOpen(o => !o)}
          timelineOpen={timelineOpen}
          tagsOpen={tagsOpen}
          filesOpen={filesOpen}
          onSignOut={signOut}
        />
      )}

      <View style={s.body}>
        {view === 'stream' && (
          <StreamScreen
            newSectionOpen={newSectionOpen}
            onNewSectionClose={() => setNewSectionOpen(false)}
            mobileTimelineOpen={timelineOpen}
            onMobileTimelineClose={() => setTimelineOpen(false)}
            mobileTagsOpen={tagsOpen}
            onMobileTagsClose={() => setTagsOpen(false)}
          />
        )}
        {view === 'docs' && (
          <DocsScreen
            newDocOpen={newDocOpen}
            onNewDocClose={() => setNewDocOpen(false)}
            mobileFilesOpen={filesOpen}
            onMobileFilesClose={() => setFilesOpen(false)}
          />
        )}
        {isEditor && <EditorScreen docId={(view as any).docId} />}
      </View>

      {isMobile && !isEditor && (
        <MobileBottomBar onNew={handleNew} onSearch={() => setSearchOpen(true)} />
      )}
    </View>
  );
}

// ── Root: auth gate + platform-split SQLiteProvider ──────────────────────────

const webH: any = Platform.OS === 'web' ? '100vh' : '100%';
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 0;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <View style={s.shell}>
        <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: C.textMuted, fontSize: 15 }}>Loading…</Text>
        </View>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={s.shell}>
        <AuthScreen />
      </View>
    );
  }

  const userId = session.user.id;

  // Mobile needs SQLiteProvider; web uses Supabase directly
  const inner = (
    <AppProvider userId={userId}>
      <TideApp />
    </AppProvider>
  );

  return (
    <View style={s.shell}>
      {Platform.OS !== 'web' && <View style={s.statusBarBg} />}
      <ErrorBoundary>
        {Platform.OS !== 'web' ? (
          <SQLiteProvider databaseName="tide.db" onInit={initDB}>
            {inner}
          </SQLiteProvider>
        ) : inner}
      </ErrorBoundary>
    </View>
  );
}

const s = StyleSheet.create({
  shell:       { flex: 1, height: webH, backgroundColor: C.bg },
  statusBarBg: { height: STATUS_BAR_HEIGHT, backgroundColor: C.toolbar },
  root:        { flex: 1, backgroundColor: C.bg },
  body:     { flex: 1 },
  errBox:   { flex: 1, height: webH, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: C.bg },
  errTitle: { fontSize: 18, fontWeight: '700', color: '#c62828', marginBottom: 10 },
  errMsg:   { fontSize: 13, color: C.textMuted, textAlign: 'center', maxWidth: 500 },
});
