import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Image, StatusBar, Modal, Pressable, Switch, Linking, Alert } from 'react-native';

const PRIVACY_URL = Platform.OS === 'web' ? '/privacy' : 'https://tide-notes-diary.vercel.app/privacy';
import { Ionicons } from '@expo/vector-icons';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
import { R, ColorsType } from './theme';
import { useTheme } from './ThemeContext';
import { supabase } from './supabase';
import { useApp } from './context';

// ── Account info modal ────────────────────────────────────────────────────────

function AccountModal({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { C } = useTheme();
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

  const am = useMemo(() => makeAccountStyles(C), [C]);

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

function makeAccountStyles(C: ColorsType) {
  return StyleSheet.create({
    overlay:      { backgroundColor: 'rgba(0,0,0,0.35)' },
    card:         { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -160 }, { translateY: -140 }], width: 320, backgroundColor: C.surface, borderRadius: R.lg, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.border, ...Platform.select({ web: { boxShadow: '0 8px 32px rgba(0,0,0,0.22)' } }) },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    avatarTxt:    { fontSize: 26, fontWeight: '700', color: '#fff' },
    emailTxt:     { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 20 },
    divider:      { width: '100%', height: 1, backgroundColor: C.border, marginBottom: 16 },
    row:          { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    label:        { fontSize: 13, color: C.textMuted },
    value:        { fontSize: 13, color: C.textBody, fontWeight: '500' },
    closeBtn:     { paddingHorizontal: 28, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.buttonBlue },
    closeTxt:     { fontSize: 14, fontWeight: '600', color: '#fff' },
  });
}

// ── Settings modal ────────────────────────────────────────────────────────────

function SettingsModal({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { C, darkMode, palette, setDarkMode, setPalette } = useTheme();
  const ss = useMemo(() => makeSettingsStyles(C), [C]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, ss.overlay]} onPress={onClose} />
      <View style={ss.card}>
        <Text style={ss.heading}>Settings</Text>
        <View style={ss.divider} />

        <Text style={ss.sectionLabel}>APPEARANCE</Text>
        <View style={ss.row}>
          <View style={ss.rowLeft}>
            <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={18} color={C.textBody} />
            <Text style={ss.rowTxt}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: C.border, true: C.buttonBlue }}
            thumbColor="#fff"
          />
        </View>

        <View style={ss.divider} />
        <Text style={ss.sectionLabel}>COLOR PALETTE</Text>
        <View style={ss.paletteRow}>
          <TouchableOpacity
            style={[ss.paletteBtn, palette === 'blue' && ss.paletteBtnOn]}
            onPress={() => setPalette('blue')}
          >
            <View style={[ss.paletteSwatch, { backgroundColor: '#4a7be0' }]} />
            <Text style={[ss.paletteTxt, palette === 'blue' && { color: C.buttonBlue, fontWeight: '600' }]}>Blue</Text>
            {palette === 'blue' && <Ionicons name="checkmark" size={14} color={C.buttonBlue} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[ss.paletteBtn, palette === 'pink' && ss.paletteBtnOn]}
            onPress={() => setPalette('pink')}
          >
            <View style={[ss.paletteSwatch, { backgroundColor: '#bf607e' }]} />
            <Text style={[ss.paletteTxt, palette === 'pink' && { color: '#bf607e', fontWeight: '600' }]}>Pink</Text>
            {palette === 'pink' && <Ionicons name="checkmark" size={14} color="#bf607e" />}
          </TouchableOpacity>
        </View>

        <View style={ss.divider} />
        <TouchableOpacity style={ss.doneBtn} onPress={onClose}>
          <Text style={ss.doneTxt}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function makeSettingsStyles(C: ColorsType) {
  return StyleSheet.create({
    overlay:      { backgroundColor: 'rgba(0,0,0,0.35)' },
    card:         { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -160 }, { translateY: -150 }], width: 320, backgroundColor: C.surface, borderRadius: R.lg, padding: 24, borderWidth: 1, borderColor: C.border, ...Platform.select({ web: { boxShadow: '0 8px 32px rgba(0,0,0,0.22)' } }) },
    heading:      { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
    sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textLabel, marginBottom: 10 },
    divider:      { height: 1, backgroundColor: C.border, marginVertical: 14 },
    row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 },
    rowLeft:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowTxt:       { fontSize: 15, color: C.textBody },
    paletteRow:   { flexDirection: 'row', gap: 10 },
    paletteBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border },
    paletteBtnOn: { borderColor: C.buttonBlue, backgroundColor: C.primaryLight },
    paletteSwatch:{ width: 16, height: 16, borderRadius: 8 },
    paletteTxt:   { fontSize: 14, color: C.textBody, flex: 1 },
    doneBtn:      { alignSelf: 'flex-end', paddingHorizontal: 24, paddingVertical: 9, borderRadius: R.pill, backgroundColor: C.buttonBlue },
    doneTxt:      { fontSize: 14, fontWeight: '600', color: '#fff' },
  });
}

// ── Mobile settings sheet ─────────────────────────────────────────────────────

function SettingsSheet({ visible, onClose }: { visible: boolean; onClose(): void }) {
  const { C, darkMode, palette, setDarkMode, setPalette } = useTheme();
  const mb = useMemo(() => makeMobileBottomStyles(C), [C]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[StyleSheet.absoluteFill, mb.overlay]} onPress={onClose} />
      <View style={mb.sheet}>
        <View style={mb.sheetHandle} />
        <Text style={mb.settingsHeading}>Settings</Text>

        <Text style={mb.sectionLabel}>APPEARANCE</Text>
        <View style={mb.settingsRow}>
          <View style={mb.settingsRowLeft}>
            <Ionicons name={darkMode ? 'moon' : 'sunny-outline'} size={18} color={C.textBody} />
            <Text style={mb.settingsRowTxt}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: C.border, true: C.buttonBlue }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[mb.sectionLabel, { marginTop: 16 }]}>COLOR PALETTE</Text>
        <View style={mb.paletteRow}>
          <TouchableOpacity
            style={[mb.paletteBtn, palette === 'blue' && { borderColor: C.buttonBlue, backgroundColor: C.primaryLight }]}
            onPress={() => setPalette('blue')}
          >
            <View style={[mb.paletteSwatch, { backgroundColor: '#4a7be0' }]} />
            <Text style={[mb.paletteTxt, palette === 'blue' && { color: C.buttonBlue, fontWeight: '600' }]}>Blue</Text>
            {palette === 'blue' && <Ionicons name="checkmark" size={14} color={C.buttonBlue} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[mb.paletteBtn, palette === 'pink' && { borderColor: '#bf607e', backgroundColor: '#f5e0ea' }]}
            onPress={() => setPalette('pink')}
          >
            <View style={[mb.paletteSwatch, { backgroundColor: '#bf607e' }]} />
            <Text style={[mb.paletteTxt, palette === 'pink' && { color: '#bf607e', fontWeight: '600' }]}>Pink</Text>
            {palette === 'pink' && <Ionicons name="checkmark" size={14} color="#bf607e" />}
          </TouchableOpacity>
        </View>

        <View style={mb.sheetDivider} />
        <TouchableOpacity style={mb.sheetItem} onPress={onClose}>
          <Text style={[mb.sheetTxt, { color: C.buttonBlue, fontWeight: '600' }]}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

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
  const { view, setView, deleteAccount } = useApp();
  const { C } = useTheme();
  const isStream = view === 'stream';
  const isDocs   = view === 'docs' || (typeof view === 'object');
  const isEditor = typeof view === 'object';
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen]       = useState(false);
  const [avatarPos, setAvatarPos] = useState({ top: 0, right: 0 });
  const avatarRef = useRef<View>(null);

  const s  = useMemo(() => makeWebStyles(C), [C]);
  const m  = useMemo(() => makeMobileTopStyles(C), [C]);

  const openAccountMenu = () => {
    avatarRef.current?.measureInWindow((x, y, w, h) => {
      setAvatarPos({ top: y + h + 6, right: window.innerWidth - x - w });
      setAccountMenuOpen(true);
    });
  };

  const confirmDeleteAccount = () => {
    setAccountMenuOpen(false);
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data (notes, images, tags). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account', style: 'destructive',
          onPress: () => Alert.alert(
            'Are you absolutely sure?',
            'All your notes, images, and documents will be permanently erased.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, delete everything', style: 'destructive', onPress: deleteAccount },
            ]
          ),
        },
      ]
    );
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={m.bar}>
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

        <View style={m.logoWrap} pointerEvents="none">
          <Image source={require('../logo/2.png')} style={m.logo} resizeMode="contain" />
        </View>

        <View style={m.right}>
          {!isEditor && isDocs && (
            <TouchableOpacity style={[m.iconBtn, filesOpen && m.iconBtnOn]} onPress={onToggleFiles}>
              <Ionicons name="menu-outline" size={22} color={filesOpen ? C.buttonBlue : C.textLabel} />
            </TouchableOpacity>
          )}
          {isStream && (
            <>
              <TouchableOpacity style={[m.iconBtn, tagsOpen && m.iconBtnOn]} onPress={onToggleTags}>
                <Text style={[m.hashTxt, tagsOpen && { color: C.buttonBlue }]}>#</Text>
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

  // ── Web layout ────────────────────────────────────────────────────────────
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
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.8} onPress={() => setSettingsOpen(true)}>
          <Ionicons name="settings-outline" size={18} color={C.textLabel} />
        </TouchableOpacity>
        <TouchableOpacity ref={avatarRef as any} style={s.iconBtn} activeOpacity={0.8} onPress={openAccountMenu}>
          <Ionicons name="person-outline" size={18} color={C.textLabel} />
        </TouchableOpacity>
      </View>

      {/* Account dropdown */}
      <Modal visible={accountMenuOpen} transparent animationType="none" onRequestClose={() => setAccountMenuOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAccountMenuOpen(false)} />
        <View style={[s.accountMenu, { position: 'absolute', top: avatarPos.top, right: avatarPos.right }]}>
          <TouchableOpacity style={s.accountMenuItem} onPress={() => { setAccountMenuOpen(false); setAccountInfoOpen(true); }}>
            <Text style={s.accountMenuTxt}>Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.accountMenuItem} onPress={() => { setAccountMenuOpen(false); Linking.openURL(PRIVACY_URL); }}>
            <Text style={s.accountMenuTxt}>Privacy Policy</Text>
          </TouchableOpacity>
          <View style={s.accountMenuDivider} />
          <TouchableOpacity style={s.accountMenuItem} onPress={confirmDeleteAccount}>
            <Text style={[s.accountMenuTxt, s.accountMenuDanger]}>Delete Account</Text>
          </TouchableOpacity>
          <View style={s.accountMenuDivider} />
          <TouchableOpacity style={s.accountMenuItem} onPress={() => { setAccountMenuOpen(false); onSignOut?.(); }}>
            <Text style={[s.accountMenuTxt, s.accountMenuSignOut]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <AccountModal visible={accountInfoOpen} onClose={() => setAccountInfoOpen(false)} />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

// ── Mobile bottom bar ─────────────────────────────────────────────────────────

interface BottomBarProps { onNew?(): void; }

export function MobileBottomBar({ onNew }: BottomBarProps) {
  const { signOut, deleteAccount } = useApp();
  const { C } = useTheme();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [accountOpen, setAccountOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mb = useMemo(() => makeMobileBottomStyles(C), [C]);

  const confirmDeleteAccountMobile = () => {
    setMenuOpen(false);
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data (notes, images, tags). This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account', style: 'destructive',
          onPress: () => Alert.alert(
            'Are you absolutely sure?',
            'All your notes, images, and documents will be permanently erased.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, delete everything', style: 'destructive', onPress: deleteAccount },
            ]
          ),
        },
      ]
    );
  };

  if (Platform.OS === 'web') return null;
  return (
    <View style={mb.bar}>
      {/* Left: Account */}
      <TouchableOpacity style={mb.sideBtn} activeOpacity={0.8} onPress={() => setMenuOpen(true)}>
        <Ionicons name="person-outline" size={24} color={C.textLabel} />
      </TouchableOpacity>

      {/* Center: New */}
      <TouchableOpacity style={mb.newBtn} onPress={onNew} activeOpacity={0.8}>
        <Ionicons name="add" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Right: Settings */}
      <TouchableOpacity style={mb.sideBtn} activeOpacity={0.8} onPress={() => setSettingsOpen(true)}>
        <Ionicons name="settings-outline" size={24} color={C.textLabel} />
      </TouchableOpacity>

      {/* Account options sheet */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={[StyleSheet.absoluteFill, mb.overlay]} onPress={() => setMenuOpen(false)} />
        <View style={mb.sheet}>
          <View style={mb.sheetHandle} />
          <TouchableOpacity style={mb.sheetItem} onPress={() => { setMenuOpen(false); setAccountOpen(true); }}>
            <Text style={mb.sheetTxt}>Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mb.sheetItem} onPress={() => { setMenuOpen(false); Linking.openURL(PRIVACY_URL); }}>
            <Text style={mb.sheetTxt}>Privacy Policy</Text>
          </TouchableOpacity>
          <View style={mb.sheetDivider} />
          <TouchableOpacity style={mb.sheetItem} onPress={confirmDeleteAccountMobile}>
            <Text style={[mb.sheetTxt, mb.sheetDanger]}>Delete Account</Text>
          </TouchableOpacity>
          <View style={mb.sheetDivider} />
          <TouchableOpacity style={mb.sheetItem} onPress={() => { setMenuOpen(false); signOut(); }}>
            <Text style={[mb.sheetTxt, mb.sheetSignOut]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <AccountModal visible={accountOpen} onClose={() => setAccountOpen(false)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

// ── Mobile search bar (kept for external consumers) ───────────────────────────

export function MobileSearchBar({ onClose }: { onClose(): void }) {
  const { C } = useTheme();
  const { searchQuery, setSearchQuery } = useApp() as any;
  const inputRef = React.useRef<TextInput>(null);
  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <Ionicons name="search-outline" size={18} color={C.textMuted} />
      <TextInput
        ref={inputRef}
        style={{ flex: 1, fontSize: 15, color: C.text }}
        value={searchQuery ?? ''}
        onChangeText={setSearchQuery}
        placeholder="Search…"
        placeholderTextColor={C.textMuted}
      />
      <TouchableOpacity onPress={() => { setSearchQuery?.(''); onClose(); }}>
        <Ionicons name="close" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── Style factories ───────────────────────────────────────────────────────────

function makeMobileTopStyles(C: ColorsType) {
  return StyleSheet.create({
    bar:      { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 10 },
    left:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    right:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 6 },
    logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    logo:     { width: 48, height: 48 },
    iconBtn:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    iconBtnOn:{ backgroundColor: C.buttonBlueBg },
    hashTxt:  { fontSize: 20, fontWeight: '700', color: C.textLabel },
    tabs:     { flexDirection: 'row', backgroundColor: C.buttonBlueBg, borderRadius: R.pill, padding: 3, gap: 2, marginLeft: 6 },
    tab:      { width: 32, height: 28, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
    tabOn:    { backgroundColor: C.buttonBlue },
    tabTxt:   { fontSize: 13, fontWeight: '700', color: C.textLabel },
    tabTxtOn: { color: '#fff' },
  });
}

function makeMobileBottomStyles(C: ColorsType) {
  return StyleSheet.create({
    bar:          { paddingBottom: 24, height: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 28, backgroundColor: C.toolbar, borderTopWidth: 1, borderTopColor: C.border },
    sideBtn:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    newBtn:       { width: 46, height: 46, borderRadius: 23, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center' },
    overlay:      { backgroundColor: 'rgba(0,0,0,0.3)' },
    sheet:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingTop: 12 },
    sheetHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    sheetItem:    { paddingHorizontal: 24, paddingVertical: 16 },
    sheetTxt:     { fontSize: 16, color: C.textBody },
    sheetDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
    sheetSignOut: { color: '#c62828' },
    sheetDanger:  { color: '#c62828', fontWeight: '600' },
    settingsHeading:  { fontSize: 17, fontWeight: '700', color: C.text, paddingHorizontal: 24, marginBottom: 16 },
    sectionLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textLabel, paddingHorizontal: 24, marginBottom: 10 },
    settingsRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 6 },
    settingsRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    settingsRowTxt:   { fontSize: 16, color: C.textBody },
    paletteRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 24 },
    paletteBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border },
    paletteSwatch:    { width: 16, height: 16, borderRadius: 8 },
    paletteTxt:       { fontSize: 14, color: C.textBody, flex: 1 },
  });
}

function makeWebStyles(C: ColorsType) {
  return StyleSheet.create({
    bar:          { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 0, paddingRight: 22, backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 10 },
    left:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
    right:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
    logo:         { height: 52, width: 52, marginLeft: 12 },
    tabs:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.buttonBlueBg, borderRadius: R.pill, padding: 3, gap: 2 },
    tab:          { paddingHorizontal: 16, paddingVertical: 6, borderRadius: R.pill },
    tabOn:        { backgroundColor: C.buttonBlue, ...Platform.select({ web: { boxShadow: '0 2px 6px -1px rgba(30,60,150,0.3)' } }) },
    tabTxt:       { fontSize: 13.5, fontWeight: '600', color: C.textLabel },
    tabTxtOn:     { color: '#fff' },
    newBtn:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0 2px 6px -1px rgba(30,60,150,0.25)' } }) },
    iconBtn:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    avatar:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.buttonBlue, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(30,60,150,0.25)' } }) },
    accountMenu:  { minWidth: 160, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingVertical: 4, ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,0,0,0.18)' } }) },
    accountMenuItem:    { paddingHorizontal: 16, paddingVertical: 10 },
    accountMenuTxt:     { fontSize: 14, color: C.textBody },
    accountMenuSignOut: { color: '#c62828' },
    accountMenuDanger:  { color: '#c62828', fontWeight: '600' },
    accountMenuDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  });
}
