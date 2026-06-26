import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Platform, Alert,
} from 'react-native';
import { C, R, S } from './theme';
import { useApp } from './context';
import { TideDocument } from './types';
import { uuid, nowISO } from './utils';

const DOC_COLORS = [
  '#9b6fdb','#2fa85a','#3d8fd6','#e8607f','#ee7f43',
  '#e3a417','#16b083','#f06fa0','#15aaa2',
];

function DocsSidebar({ onClose }: { onClose?: () => void }) {
  const { docs, setView } = useApp();
  const isMobile = Platform.OS !== 'web';
  const [open, setOpen] = useState(true);

  if (!isMobile && !open) {
    return (
      <View style={sb.closed}>
        <TouchableOpacity style={sb.iconBtn} onPress={() => setOpen(true)}>
          <Text style={sb.iconTxt}>☰</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={isMobile ? sb.sidebarMob : sb.sidebar}>
      <View style={sb.header}>
        <Text style={sb.headerTxt}>FILES</Text>
        <TouchableOpacity style={sb.chevronBtn} onPress={isMobile ? onClose : () => setOpen(false)}>
          <Text style={sb.chevron}>{isMobile ? '›' : '‹'}</Text>
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

const sb = StyleSheet.create({
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
  iconTxt:    { fontSize: 16, color: C.textLabel },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm,
  },
  headerTxt:  { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.textLabel },
  chevronBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  chevron:    { fontSize: 18, color: C.textMuted },
  scroll:     { flex: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: S.lg, paddingVertical: 9,
  },
  dot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rowTxt:     { fontSize: 13.5, color: C.textBody, flex: 1 },
  empty:      { fontSize: 12, color: C.textMuted, paddingHorizontal: S.lg, paddingTop: 12 },
});

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
      {/* Web: inline sidebar */}
      {!isMobile && <DocsSidebar />}

      {/* ScrollView: full width on mobile */}
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

      {/* Mobile: sidebar rendered after ScrollView so it floats on top (right side) */}
      {isMobile && mobileFilesOpen && <DocsSidebar onClose={onMobileFilesClose} />}

      {/* New document modal */}
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
  const [hover, setHover] = useState(false);
  const d = new Date(doc.updatedAt);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const meta = `Edited ${months[d.getMonth()]} ${d.getDate()} · ${doc.wordCount} words`;

  return (
    <TouchableOpacity
      style={[s.card, hover && s.cardHover]}
      onPress={onOpen}
      // @ts-ignore web
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      activeOpacity={0.85}
    >
      {/* Paper preview */}
      <View style={s.preview}>
        <View style={s.previewTitle} />
        <View style={[s.previewLine, { width: '100%' }]} />
        <View style={[s.previewLine, { width: '100%' }]} />
        <View style={[s.previewLine, { width: '85%' }]} />
        <View style={[s.previewLine, { width: '92%' }]} />
        {doc.content ? (
          <Text style={s.previewText} numberOfLines={2}>{doc.content.replace(/^#+\s/gm, '')}</Text>
        ) : null}
      </View>

      <View style={s.cardMeta}>
        <View style={[s.dot, { backgroundColor: doc.color }]} />
        <Text style={s.cardTitle} numberOfLines={1}>{doc.title}</Text>
      </View>
      <View style={s.cardFooter}>
        <Text style={s.cardMetaTxt}>{meta}</Text>
        <TouchableOpacity onPress={onDelete} style={s.delBtn}>
          <Text style={s.delTxt}>🗑</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: C.bg, flexDirection: 'row' },
  scroll: { flex: 1, backgroundColor: C.bg },
  content: { maxWidth: 860, alignSelf: 'center', width: '100%', paddingHorizontal: 40, paddingTop: 30, paddingBottom: 80 },
  topRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
  heading: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  sub:     { fontSize: 13.5, color: C.textMuted, marginTop: 3 },
  newBtn:  { flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, paddingHorizontal: 18, backgroundColor: C.buttonBlue, borderRadius: R.pill },
  newBtnIcon: { fontSize: 16, color: C.white },
  newBtnTxt:  { fontSize: 13.5, fontWeight: '600', color: C.white },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card:    {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 280,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: R.lg, padding: 18, gap: 10,
    ...Platform.select({ web: { transition: 'border-color 0.15s' } }),
  },
  cardHover: { borderColor: '#b6bfd8' },
  preview: {
    height: 96, borderRadius: R.sm, borderWidth: 1, borderColor: '#e1e5f1',
    backgroundColor: C.white, padding: 11, gap: 5, overflow: 'hidden',
  },
  previewTitle:{ width: '60%', height: 7, borderRadius: 3, backgroundColor: '#dde2f0' },
  previewLine: { height: 5, borderRadius: 3, backgroundColor: '#ebeef8' },
  previewText: { fontSize: 9, color: '#c0c8d8', lineHeight: 13 },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: C.text, flex: 1 },
  cardFooter:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMetaTxt:{ fontSize: 12.5, color: C.textMuted },
  delBtn:    { padding: 4 },
  delTxt:    { fontSize: 14 },
  empty:     { paddingTop: 80, alignItems: 'center' },
  emptyTitle:{ fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: C.textMuted, textAlign: 'center', maxWidth: 340 },
  overlay:   { flex: 1, backgroundColor: 'rgba(20,24,40,0.4)', alignItems: 'center', justifyContent: 'center' },
  dialog:    {
    backgroundColor: C.white, borderRadius: R.xl, padding: S.xl,
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
  dialogCreateTxt: { fontSize: 14, fontWeight: '600', color: C.white },
});
