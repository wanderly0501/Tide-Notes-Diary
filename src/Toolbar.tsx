import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Image, StatusBar, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
import { C, R } from './theme';
import { supabase } from './supabase';
import { useApp } from './context';

// ── Account info modal ────────────────────────────────────────────────────────

function AccountModal({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const [email, setEmail]       = useState('');
  const [initials, setInitials] = useState('');
  const [joined, setJoined]     = useState('');

  useEffect(() => {
    if (!visible) return;
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      const e = u.email ?? '';
      setEmail(e);
      setInitials(e ? e[0].toUpperCase() : '?');
      if (u.created_at) {
        setJoined(new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
      }
    });
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, am.overlay]} onPress={onClose} />
      <View style={am.card}>
        <View style={am.avatarCircle}>
          <Text style={am.avatarTxt}>{initials}</Text>
        </View>
        <Text style={am.emailTxt}>{email || '—'}</Text>
        <View style={am.divider} />
        <View style={am.row}>
          <Text style={am.label}>Member since</Text>
          <Text style={am.value}>{joined || '—'}</Text>
        </View>
        <TouchableOpacity style={am.closeBtn} onPress={onClose}>
          <Text style={am.closeTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay:      { backgroundColor: 'rgba(0,0,0,0.25)' },
  card:         { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -160 }, { translateY: -140 }], width: 320, backgroundColor: C.white, borderRadius: R.lg, padding: 28, alignItems: 'center', ...Platform.select({ web: { boxShadow: '0 8px 32px rgba(0,0,0,0.16)' } }) },
  avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarTxt:    { fontSize: 26, fontWeight: '700', color: C.white },
  emailTxt:     { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 20 },
  divider:      { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 16 },
  row:          { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  label:        { fontSize: 13, color: C.textMuted },
  value:        { fontSize: 13, color: C.textBody, fontWeight: '500' },
  closeBtn:     { paddingHorizontal: 28, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.buttonBlue },
  closeTxt:     { fontSize: 14, fontWeight: '600', color: C.white },
});

interface Props {
  onNewSection?(): void;
  onNewDoc?(): void;
  onToggleTimeline?(): void;
  onToggleTags?(): void;
  onToggleFiles?(): void;
  timelineOpen?: boolean;
  tagsOpen?: boolean;
  filesOpen?: boolean;
  onSignOut?(): void;
}

export function Toolbar({ onNewSection, onNewDoc, onToggleTimeline, onToggleTags, onToggleFiles, timelineOpen, tagsOpen, filesOpen, onSignOut }: Props) {
  const { view, setView } = useApp();
  const isStream = view === 'stream';
  const isDocs   = view === 'docs' || (typeof view === 'object');
  const isEditor = typeof view === 'object';
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [avatarPos, setAvatarPos] = useState({ top: 0, right: 0 });
  const avatarRef = useRef<View>(null);

  const openAccountMenu = () => {
    avatarRef.current?.measureInWindow((x, y, w, h) => {
      setAvatarPos({ top: y + h + 6, right: window.innerWidth - x - w });
      setAccountMenuOpen(true);
    });
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={m.bar}>
        {/* Left: S/D switch (or back button in editor) */}
        {isEditor ? (
          <TouchableOpacity style={m.iconBtn} onPress={() => setView('docs')}>
            <Ionicons name="chevron-back" size={26} color={C.primary} />
          </TouchableOpacity>
        ) : (
          <View style={m.tabs}>
            <TouchableOpacity style={[m.tab, isStream && m.tabOn]} onPress={() => setView('stream')}>
              <Text style={[m.tabTxt, isStream && m.tabTxtOn]}>S</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[m.tab, isDocs && m.tabOn]} onPress={() => setView('docs')}>
              <Text style={[m.tabTxt, isDocs && m.tabTxtOn]}>D</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Center: Logo — absolutely centered in bar */}
        <View style={m.logoWrap} pointerEvents="none">
          <Image source={require('../logo/2.png')} style={m.logo} resizeMode="contain" />
        </View>

        {/* Right: context-sensitive sidebar buttons */}
        <View style={m.right}>
          {!isEditor && isDocs && (
            <TouchableOpacity style={[m.iconBtn, filesOpen && m.iconBtnOn]} onPress={onToggleFiles}>
              <Ionicons name="menu-outline" size={22} color={filesOpen ? C.buttonBlue : C.textLabel} />
            </TouchableOpacity>
          )}
          {isStream && (
            <>
              <TouchableOpacity style={[m.iconBtn, tagsOpen && m.iconBtnOn]} onPress={onToggleTags}>
                <Text style={[m.hashTxt, tagsOpen && m.iconTxtOn]}>#</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[m.iconBtn, timelineOpen && m.iconBtnOn]} onPress={onToggleTimeline}>
                <Ionicons name="calendar-outline" size={18} color={timelineOpen ? C.buttonBlue : C.textLabel} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Web layout (unchanged) ────────────────────────────────────────────────
  return (
    <View style={s.bar}>
      <View style={s.left}>
        <Image source={require('../logo/2.png')} style={s.logo} resizeMode="contain" />
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, isStream && s.tabOn]} onPress={() => setView('stream')} activeOpacity={0.85}>
            <Text style={[s.tabTxt, isStream && s.tabTxtOn]}>Stream</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, isDocs && s.tabOn]} onPress={() => setView('docs')} activeOpacity={0.85}>
            <Text style={[s.tabTxt, isDocs && s.tabTxtOn]}>Documents</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={s.right}>
        {isStream && onNewSection && (
          <TouchableOpacity style={s.newBtn} onPress={onNewSection} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        {isDocs && onNewDoc && (
          <TouchableOpacity style={s.newBtn} onPress={onNewDoc} activeOpacity={0.8}>
            <Ionicons name="add" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity ref={avatarRef as any} style={s.avatar} activeOpacity={0.8} onPress={openAccountMenu}>
          <Ionicons name="person-outline" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Account dropdown */}
      <Modal visible={accountMenuOpen} transparent animationType="none" onRequestClose={() => setAccountMenuOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAccountMenuOpen(false)} />
        <View style={[s.accountMenu, { position: 'absolute', top: avatarPos.top, right: avatarPos.right }]}>
          <TouchableOpacity style={s.accountMenuItem} onPress={() => { setAccountMenuOpen(false); setAccountInfoOpen(true); }}>
            <Text style={s.accountMenuTxt}>Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.accountMenuItem} onPress={() => setAccountMenuOpen(false)}>
            <Text style={s.accountMenuTxt}>Settings</Text>
          </TouchableOpacity>
          <View style={s.accountMenuDivider} />
          <TouchableOpacity style={s.accountMenuItem} onPress={() => { setAccountMenuOpen(false); onSignOut?.(); }}>
            <Text style={[s.accountMenuTxt, s.accountMenuSignOut]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <AccountModal visible={accountInfoOpen} onClose={() => setAccountInfoOpen(false)} />
    </View>
  );
}

// ── Mobile bottom bar ─────────────────────────────────────────────────────────

interface BottomBarProps {
  onNew?(): void;
}

export function MobileBottomBar({ onNew }: BottomBarProps) {
  const { signOut } = useApp();
  const [menuOpen, setMenuOpen]       = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  if (Platform.OS === 'web') return null;
  return (
    <View style={mb.bar}>
      {/* Left: Account */}
      <TouchableOpacity style={mb.sideBtn} activeOpacity={0.8} onPress={() => setMenuOpen(true)}>
        <Ionicons name="person-outline" size={24} color={C.textLabel} />
      </TouchableOpacity>

      {/* Account options sheet */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, mb.overlay]} onPress={() => setMenuOpen(false)} />
        <View style={mb.sheet}>
          <View style={mb.sheetHandle} />
          <TouchableOpacity style={mb.sheetItem} onPress={() => { setMenuOpen(false); setAccountOpen(true); }}>
            <Text style={mb.sheetTxt}>Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mb.sheetItem} onPress={() => setMenuOpen(false)}>
            <Text style={mb.sheetTxt}>Settings</Text>
          </TouchableOpacity>
          <View style={mb.sheetDivider} />
          <TouchableOpacity style={mb.sheetItem} onPress={() => { setMenuOpen(false); signOut(); }}>
            <Text style={[mb.sheetTxt, mb.sheetSignOut]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <AccountModal visible={accountOpen} onClose={() => setAccountOpen(false)} />
    </View>
  );
}

// ── Mobile search overlay ─────────────────────────────────────────────────────

export function MobileSearchBar({ onClose }: { onClose(): void }) {
  const { searchQuery, setSearchQuery } = useApp();
  const inputRef = useRef<TextInput>(null);
  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  return (
    <View style={ms.bar}>
      <Ionicons name="search-outline" size={18} color={C.textMuted} />
      <TextInput
        ref={inputRef}
        style={ms.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search…"
        placeholderTextColor={C.textMuted}
      />
      <TouchableOpacity onPress={() => { setSearchQuery(''); onClose(); }}>
        <Ionicons name="close" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Mobile top bar styles ─────────────────────────────────────────────────────
const m = StyleSheet.create({
  bar:      { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 10 },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  right:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 6 },
  logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  logo:     { width: 48, height: 48 },
  iconBtn:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBtnOn:{ backgroundColor: C.buttonBlueBg },
  iconTxt:  { fontSize: 20 },
  hashTxt:  { fontSize: 20, fontWeight: '700', color: C.textLabel },
  backTxt:  { fontSize: 28, fontWeight: '400', color: C.primary, marginTop: -2 },
  iconTxtOn:{ color: C.buttonBlue },
  tabs:     { flexDirection: 'row', backgroundColor: C.buttonBlueBg, borderRadius: R.pill, padding: 3, gap: 2, marginLeft: 6 },
  tab:      { width: 32, height: 28, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  tabOn:    { backgroundColor: C.buttonBlue },
  tabTxt:   { fontSize: 13, fontWeight: '700', color: '#48506a' },
  tabTxtOn: { color: C.white },
});

// ── Mobile bottom bar styles ──────────────────────────────────────────────────
const mb = StyleSheet.create({
  bar:       { paddingBottom: 24, height: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, backgroundColor: C.toolbar, borderTopWidth: 1, borderTopColor: C.border },
  sideBtn:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sideBtnTxt:{ fontSize: 30, color: C.textLabel },
  newBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center' },
  newBtnTxt: { fontSize: 24, color: '#fff', lineHeight: 26, marginTop: -1 },
  avatar:      { width: 38, height: 38, borderRadius: 19, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontSize: 14, fontWeight: '700', color: C.white },
  overlay:     { backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
  sheetItem:   { paddingHorizontal: 24, paddingVertical: 16 },
  sheetTxt:    { fontSize: 16, color: C.textBody },
  sheetDivider:{ height: 1, backgroundColor: C.border, marginVertical: 4 },
  sheetSignOut:{ color: '#c62828' },
});

// ── Mobile search bar styles ──────────────────────────────────────────────────
const ms = StyleSheet.create({
  bar:   { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: C.border },
  input: { flex: 1, fontSize: 15, color: C.text },
});

// ── Web styles (unchanged) ────────────────────────────────────────────────────
const s = StyleSheet.create({
  bar: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 0, paddingRight: 22, backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 10 },
  left:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo:  { height: 52, width: 52, marginLeft: 12 },
  tabs:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.buttonBlueBg, borderRadius: R.pill, padding: 3, gap: 2 },
  tab:      { paddingHorizontal: 16, paddingVertical: 6, borderRadius: R.pill },
  tabOn:    { backgroundColor: C.buttonBlue, ...Platform.select({ web: { boxShadow: '0 2px 6px -1px rgba(30,60,150,0.3)' } }) },
  tabTxt:   { fontSize: 13.5, fontWeight: '600', color: '#48506a' },
  tabTxtOn: { color: C.white },
  searchBtn:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  searchBtnIcon:{ fontSize: 26, color: C.textLabel },
  search:       { flexDirection: 'row', alignItems: 'center', width: 220, height: 36, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, gap: 8 },
  searchIcon:   { fontSize: 16, color: C.textMuted },
  searchInput:  { flex: 1, fontSize: 13.5, color: C.text, outlineWidth: 0 } as any,
  searchClose:  { fontSize: 12, color: C.textMuted, paddingLeft: 4 },
  newBtn:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0 2px 6px -1px rgba(30,60,150,0.25)' } }) },
  avatar:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(30,60,150,0.25)' } }) },
  avatarTxt:    { fontSize: 14, fontWeight: '700', color: C.white },
  accountMenu:  { minWidth: 160, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingVertical: 4, ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } }) },
  accountMenuItem:    { paddingHorizontal: 16, paddingVertical: 10 },
  accountMenuTxt:     { fontSize: 14, color: C.textBody },
  accountMenuSignOut: { color: '#c62828' },
  accountMenuDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
});
