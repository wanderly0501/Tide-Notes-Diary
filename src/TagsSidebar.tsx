import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, Alert, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { R, S, ColorsType } from './theme';
import { useTheme } from './ThemeContext';
import { useApp } from './context';
import { uuid } from './utils';


export function TagsSidebar() {
  const { tags, activeTags, toggleTag, deselectAllTags, selectAllTags, addTag, removeTag, renameTag } = useApp();
  const { C } = useTheme();
  const s = useMemo(() => makeStyles(C), [C]);
  const [open, setOpen]       = useState(false);
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState('');

  const DOC_COLORS = [
    '#e8607f','#f06fa0','#d95f3b','#ee7f43','#e3a417',
    '#2fa85a','#16b083','#15aaa2','#3d8fd6','#5b7fd6',
    '#9b6fdb','#b06fd6','#6f7fd6','#4a90d6','#2ec4b6',
    '#f4845f','#c0392b','#8e44ad','#2980b9','#27ae60',
    '#7f8c8d','#34495e','#e74c3c','#1abc9c',
  ];
  const [colorIdx, setColorIdx] = useState(0);

  // Context menu state
  const [ctxTag, setCtxTag]   = useState<{ id: string; name: string } | null>(null);
  const [ctxPos, setCtxPos]   = useState({ top: 0, left: 0 });
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const dotRefs = useRef<Record<string, TouchableOpacity | null>>({});

  const openCtx = (id: string, name: string) => {
    const ref = dotRefs.current[id];
    ref?.measureInWindow((x, y, _w, h) => {
      setCtxPos({ top: y + h / 2, left: x + _w + 4 });
      setCtxTag({ id, name });
      setRenaming(false);
      setRenameVal(name);
    });
  };

  const closeCtx = () => { setCtxTag(null); setRenaming(false); };

  const handleRename = async () => {
    if (!ctxTag || !renameVal.trim()) return;
    await renameTag(ctxTag.id, renameVal.trim());
    closeCtx();
  };

  const handleDelete = (id: string, name: string) => {
    closeCtx();
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete tag "${name}"? This will remove the tag from all sections.`)) removeTag(id);
    } else {
      Alert.alert(`Delete tag "${name}"?`, 'This will remove the tag from all sections.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeTag(id) },
      ]);
    }
  };

  const handleAddTag = async () => {
    const n = newName.trim();
    if (!n) return;
    await addTag({ id: uuid(), name: n, color: DOC_COLORS[colorIdx % DOC_COLORS.length], isPredefined: false });
    setNewName(''); setAdding(false);
  };

  if (!open) {
    return (
      <View style={[s.sidebar, s.sidebarClosed]}>
        <TouchableOpacity style={s.collapseBtn} onPress={() => setOpen(true)}>
          <Text style={s.tagIcon}>#</Text>
        </TouchableOpacity>
        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 4 }}>
          {tags.map(t => (
            <TouchableOpacity key={t.id} onPress={() => toggleTag(t.id)} style={s.miniTagBtn}>
              <View style={[s.miniDot,
                { borderColor: t.color, backgroundColor: activeTags.has(t.id) ? t.color : 'transparent' }
              ]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.sidebar}>
      <View style={s.header}>
        <Text style={s.headerTxt}>TAGS</Text>
        <TouchableOpacity style={s.chevronBtn} onPress={() => setOpen(false)}>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {tags.map(t => {
          const checked = activeTags.has(t.id);
          return (
            <View key={t.id} style={s.tagRow}>
              <TouchableOpacity
                style={s.tagRowMain}
                onPress={() => toggleTag(t.id)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, {
                  backgroundColor: checked ? t.color : C.surface,
                  borderColor: checked ? t.color : C.border,
                }]}>
                  {checked && <Ionicons name="checkmark" size={11} color="#fff" />}
                </View>
                <Text style={s.tagName}>{t.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                ref={r => { dotRefs.current[t.id] = r; }}
                style={s.tagDotBtn}
                onPress={() => openCtx(t.id, t.name)}
              >
                <Text style={s.tagDotTxt}>···</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Tag context menu */}
        {ctxTag && (
          <Modal visible transparent animationType="none" onRequestClose={closeCtx}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeCtx} />
            <View style={[s.ctxMenu, { position: 'absolute', top: ctxPos.top, left: ctxPos.left }]}>
              {renaming ? (
                <View style={s.ctxRenameRow}>
                  <TextInput
                    style={s.ctxRenameInput}
                    value={renameVal}
                    onChangeText={setRenameVal}
                    autoFocus
                    onSubmitEditing={handleRename}
                    // @ts-ignore
                    outlineStyle="none"
                  />
                  <TouchableOpacity onPress={handleRename} style={s.ctxRenameOk}>
                    <Text style={s.ctxRenameOkTxt}>OK</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={s.ctxItem} onPress={() => setRenaming(true)}>
                    <Ionicons name="create-outline" size={13} color={C.textBody} />
                    <Text style={s.ctxItemTxt}>Rename</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.ctxItem} onPress={() => handleDelete(ctxTag.id, ctxTag.name)}>
                    <Ionicons name="trash-outline" size={13} color="#c0392b" />
                    <Text style={[s.ctxItemTxt, { color: '#c0392b' }]}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Modal>
        )}
      </ScrollView>

      <View style={s.footer}>
        {adding ? (
          <View style={s.addForm}>
            <TextInput
              style={s.nameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Tag name…"
              placeholderTextColor={C.textMuted}
              autoFocus
              onSubmitEditing={handleAddTag}
              // @ts-ignore
              outlineStyle="none"
            />
            <View style={s.colorRow}>
              {DOC_COLORS.map((c, i) => (
                <TouchableOpacity key={c} onPress={() => setColorIdx(i)}>
                  <View style={[s.colorPick, { backgroundColor: c }, i === colorIdx && s.colorPickSel]} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.addBtns}>
              <TouchableOpacity onPress={() => setAdding(false)} style={s.cancelBtn}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddTag} style={s.saveBtn}>
                <Text style={s.saveTxt}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={s.selectRow}>
              {activeTags.size < tags.length && (
                <TouchableOpacity onPress={selectAllTags}>
                  <Text style={s.deselectTxt}>Select all</Text>
                </TouchableOpacity>
              )}
              {activeTags.size < tags.length && activeTags.size > 0 && (
                <Text style={s.sep}>·</Text>
              )}
              {activeTags.size > 0 && (
                <TouchableOpacity onPress={deselectAllTags}>
                  <Text style={s.deselectTxt}>Deselect all</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.newTagBtn} onPress={() => setAdding(true)}>
              <Ionicons name="add" size={14} color={C.textLabel} />
              <Text style={s.newTagTxt}>New tag</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(C: ColorsType) {
  return StyleSheet.create({
    sidebar: {
      width: 160, flexShrink: 0, backgroundColor: C.tagsSidebarBg,
      ...Platform.OS === 'web'
        ? { borderRightWidth: 1, borderRightColor: C.border }
        : { position: 'absolute' as const, right: 0, top: 0, bottom: 0, borderLeftWidth: 1, borderLeftColor: C.border, zIndex: 20 },
    },
    sidebarClosed: { width: 58, alignItems: 'center', paddingTop: 14, gap: 10 },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm,
    },
    headerTxt:   { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.textLabel },
    selectRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    deselectTxt: { fontSize: 11, color: C.buttonBlue },
    sep:         { fontSize: 11, color: C.textMuted },
    chevronBtn:  { width: 24, height: 24, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
    collapseBtn: { width: 30, height: 30, borderRadius: R.md, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
    tagIcon: { fontSize: 22, fontWeight: '700', color: C.textLabel },
    scroll: { flex: 1, paddingHorizontal: 10 },
    tagRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: S.sm, borderRadius: R.md, marginBottom: 2 },
    tagRowMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingVertical: 5 },
    tagDotBtn:  { padding: 4 },
    tagDotTxt:  { fontSize: 13, color: C.textMuted, letterSpacing: 1 },
    ctxMenu: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: R.md, minWidth: 140, zIndex: 9999,
      shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    },
    ctxItem:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    ctxItemTxt:     { fontSize: 13.5, color: C.textBody },
    ctxRenameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
    ctxRenameInput: { flex: 1, fontSize: 13.5, color: C.text, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4, outlineWidth: 0 } as any,
    ctxRenameOk:    { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.buttonBlue, borderRadius: R.sm },
    ctxRenameOkTxt: { fontSize: 13, fontWeight: '600', color: '#fff' },
    checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    tagName:  { fontSize: 13.5, color: C.textBody },
    miniTagBtn: { alignItems: 'center', paddingVertical: 4 },
    miniDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
    footer: { padding: S.md, borderTopWidth: 1, borderTopColor: C.border },
    newTagBtn: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.sm, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: R.md },
    newTagTxt:{ fontSize: 13, color: C.textLabel },
    addForm:  { gap: 8 },
    nameInput:{ borderWidth: 1, borderColor: C.border, borderRadius: R.sm, padding: S.sm, fontSize: 13, color: C.text, backgroundColor: C.surface, outlineWidth: 0 } as any,
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    colorPick:{ width: 18, height: 18, borderRadius: 9 },
    colorPickSel: { borderWidth: 2, borderColor: C.text },
    addBtns:  { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    cancelBtn:{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.sm, backgroundColor: C.border },
    cancelTxt:{ fontSize: 12, color: C.textBody },
    saveBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.sm, backgroundColor: C.primary },
    saveTxt:  { fontSize: 12, color: '#fff', fontWeight: '600' },
  });
}
