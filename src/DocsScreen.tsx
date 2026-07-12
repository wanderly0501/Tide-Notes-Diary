import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { R, S, ColorsType } from './theme';
import { useTheme } from './ThemeContext';
import { useApp } from './context';
import { TideDocument } from './types';
import { uuid, nowISO } from './utils';

const DOC_COLORS = [
  '#9b6fdb','#2fa85a','#3d8fd6','#e8607f','#ee7f43',
  '#e3a417','#16b083','#f06fa0','#15aaa2',
];

function DocsSidebar({ onClose }: { onClose?: () => void }) {
  const { docs, setView } = useApp();
  const { C } = useTheme();
  const sb = useMemo(() => makeSbStyles(C), [C]);
  const isMobile = Platform.OS !== 'web';
  const [open, setOpen] = useState(true);

  if (!isMobile && !open) {
    return (
      <View style={sb.closed}>
        <TouchableOpacity style={sb.iconBtn} onPress={() => setOpen(true)}>
          <Ionicons name="menu-outline" size={18} color={C.textLabel} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={isMobile ? sb.sidebarMob : sb.sidebar}>
      <View style={sb.header}>
        <Text style={sb.headerTxt}>FILES</Text>
        <TouchableOpacity style={sb.chevronBtn} onPress={isMobile ? onClose : () => setOpen(false)}>
          <Ionicons name={isMobile ? 'chevron-forward' : 'chevron-back'} size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={sb.scroll} showsVerticalScrollIndicator={false}>
        {docs.map(doc => (
          <TouchableOpacity
            key={doc.id}
            style={sb.row}
            onPress={() => { setView({ type: 'editor', docId: doc.id }); onClose?.(); }}
            activeOpacity={0.7}
          >
            <View style={[sb.dot, { backgroundColor: doc.color }]} />
            <Text style={sb.rowTxt} numberOfLines={1}>{doc.title}</Text>
          </TouchableOpacity>
        ))}
        {docs.length === 0 && (
          <Text style={sb.empty}>No documents</Text>
        )}
      </ScrollView>
    </View>
  );
}

function makeSbStyles(C: ColorsType) {
  return StyleSheet.create({
    sidebar: {
      width: 260, flexShrink: 0, backgroundColor: C.tagsSidebarBg,
      borderRightWidth: 1, borderRightColor: C.border,
      flexDirection: 'column',
    },
    sidebarMob: {
      position: 'absolute', right: 0, top: 0, bottom: 0, width: 160, zIndex: 20,
      backgroundColor: C.tagsSidebarBg,
      borderLeftWidth: 1, borderLeftColor: C.border,
      flexDirection: 'column',
    },
    closed: {
      width: 66, flexShrink: 0, backgroundColor: C.tagsSidebarBg,
      borderRightWidth: 1, borderRightColor: C.border,
      alignItems: 'center', paddingTop: 12,
    },
    iconBtn:    { padding: 8 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm,
    },
    headerTxt:  { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.textLabel },
    chevronBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    scroll:     { flex: 1 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: S.lg, paddingVertical: 9,
    },
    dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    rowTxt:     { fontSize: 13.5, color: C.textBody, flex: 1 },
    empty:      { fontSize: 12, color: C.textMuted, paddingHorizontal: S.lg, paddingTop: 12 },
  });
}

export function DocsScreen({
  newDocOpen = false,
  onNewDocClose,
  mobileFilesOpen,
  onMobileFilesClose,
}: {
  newDocOpen?: boolean;
  onNewDocClose?: () => void;
  mobileFilesOpen?: boolean;
  onMobileFilesClose?: () => void;
}) {
  const isMobile = Platform.OS !== 'web';
  const { docs, addDoc, removeDoc, setView } = useApp();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    if (newDocOpen) {
      setCreating(true);
      onNewDocClose?.();
    }
  }, [newDocOpen]);

  const handleCreate = async () => {
    const title = newTitle.trim() || 'Untitled document';
    const now   = nowISO();
    const doc: TideDocument = {
      id: uuid(), title, content: '', color: DOC_COLORS[colorIdx],
      createdAt: now, updatedAt: now, wordCount: 0,
    };
    await addDoc(doc);
    setCreating(false);
    setNewTitle('');
    setColorIdx(0);
    setView({ type: 'editor', docId: doc.id });
  };

  const confirmDelete = (doc: TideDocument) => {
    Alert.alert(`Delete "${doc.title}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeDoc(doc.id) },
    ]);
  };

  return (
    <View style={s.wrap}>
      {!isMobile && <DocsSidebar />}

      <ScrollView style={[s.scroll, isMobile && StyleSheet.absoluteFillObject]} contentContainerStyle={s.content}>
        <View style={s.topRow}>
          <View>
            <Text style={s.heading}>Documents</Text>
            <Text style={s.sub}>Long-form notes that live across time</Text>
          </View>
        </View>

        {docs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No documents yet</Text>
            <Text style={s.emptyBody}>Create one to start writing long-form notes, journals, or papers.</Text>
          </View>
        ) : (
          <View style={s.grid}>
            {docs.map(doc => (
              <DocCard key={doc.id} doc={doc} onOpen={() => setView({ type: 'editor', docId: doc.id })} onDelete={() => confirmDelete(doc)} />
            ))}
          </View>
        )}
      </ScrollView>

      {isMobile && mobileFilesOpen && <DocsSidebar onClose={onMobileFilesClose} />}

      <Modal visible={creating} animationType="fade" transparent onRequestClose={() => setCreating(false)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>New Document</Text>
            <TextInput
              style={s.dialogInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Document title…"
              placeholderTextColor={C.textMuted}
              autoFocus
              onSubmitEditing={handleCreate}
              // @ts-ignore
              outlineStyle="none"
            />
            <View style={s.colorRow}>
              {DOC_COLORS.map((c, i) => (
                <TouchableOpacity key={c} onPress={() => setColorIdx(i)}>
                  <View style={[s.colorDot, { backgroundColor: c }, i === colorIdx && s.colorDotSel]} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.dialogBtns}>
              <TouchableOpacity onPress={() => setCreating(false)} style={s.dialogCancel}>
                <Text style={s.dialogCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={s.dialogCreate}>
                <Text style={s.dialogCreateTxt}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DocCard({ doc, onOpen, onDelete }: { doc: TideDocument; onOpen(): void; onDelete(): void }) {
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [hover, setHover] = useState(false);
  const d = new Date(doc.updatedAt);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const meta = `${months[d.getMonth()]} ${d.getDate()} · ${doc.wordCount}w`;
  const snippet = doc.content
    ? doc.content.replace(/<[^>]+>/g, '').replace(/\*\*|__|==|\*/g, '').replace(/\s+/g, ' ').trim()
    : '';

  return (
    <TouchableOpacity
      style={[s.card, hover && s.cardHover]}
      onPress={onOpen}
      // @ts-ignore web
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      activeOpacity={0.85}
    >
      <View style={s.cardHeader}>
        <View style={[s.dot, { backgroundColor: doc.color }]} />
        <Text style={s.cardTitle} numberOfLines={1}>{doc.title}</Text>
        <TouchableOpacity onPress={onDelete} style={s.delBtn} hitSlop={8}>
          <Ionicons name="trash-outline" size={14} color={C.textMuted} />
        </TouchableOpacity>
      </View>
      {snippet ? (
        <Text style={s.snippet} numberOfLines={2}>{snippet}</Text>
      ) : (
        <Text style={s.snippetEmpty}>No content yet</Text>
      )}
      <Text style={s.cardMetaTxt}>{meta}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(C: ColorsType) {
  return StyleSheet.create({
    wrap:   { flex: 1, backgroundColor: C.bg, flexDirection: 'row' },
    scroll: { flex: 1, backgroundColor: C.bg },
    content: { maxWidth: 860, alignSelf: 'center', width: '100%', paddingHorizontal: 40, paddingTop: 30, paddingBottom: 80 },
    topRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
    heading: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
    sub:     { fontSize: 13.5, color: C.textMuted, marginTop: 3 },
    newBtn:  { flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 18, backgroundColor: C.buttonBlue, borderRadius: R.pill },
    newBtnTxt:  { fontSize: 13.5, fontWeight: '600', color: '#fff' },
    grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card:    {
      flexBasis: '30%',
      flexGrow: 1,
      minWidth: 200,
      maxWidth: 340,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
      borderRadius: R.md, padding: 12, gap: 6,
      ...Platform.select({ web: { transition: 'border-color 0.15s' } }),
    },
    cardHover:   { borderColor: '#b6bfd8' },
    cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    cardTitle:   { fontSize: 13.5, fontWeight: '600', color: C.text, flex: 1 },
    snippet:     { fontSize: 12, color: C.textMuted, lineHeight: 17 },
    snippetEmpty:{ fontSize: 12, color: C.border, fontStyle: 'italic' },
    cardMetaTxt: { fontSize: 11, color: C.textMuted },
    delBtn:      { padding: 2 },
    empty:     { paddingTop: 80, alignItems: 'center' },
    emptyTitle:{ fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 8 },
    emptyBody: { fontSize: 14, color: C.textMuted, textAlign: 'center', maxWidth: 340 },
    overlay:   { flex: 1, backgroundColor: 'rgba(20,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
    dialog:    {
      backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl,
      width: 380, gap: 16,
      ...Platform.select({ web: { boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } }),
    },
    dialogTitle: { fontSize: 18, fontWeight: '700', color: C.text },
    dialogInput: {
      borderWidth: 1, borderColor: C.border, borderRadius: R.md,
      padding: 12, fontSize: 15, color: C.text, outlineWidth: 0,
    } as any,
    colorRow:  { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    colorDot:  { width: 22, height: 22, borderRadius: 11 },
    colorDotSel: { borderWidth: 3, borderColor: C.text },
    dialogBtns:{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    dialogCancel: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.md, backgroundColor: C.border },
    dialogCancelTxt: { fontSize: 14, color: C.textBody },
    dialogCreate:{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.md, backgroundColor: C.primary },
    dialogCreateTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
  });
}
