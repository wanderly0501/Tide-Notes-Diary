import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Platform, Image, KeyboardAvoidingView, StatusBar, ActivityIndicator,
} from 'react-native';

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
import * as ImagePicker from 'expo-image-picker';
import { C, R, S } from './theme';
import { Section, Block, BulletsBlock, CheckboxBlock, ImageBlock } from './types';
import { useApp } from './context';
import { uuid, nowISO, todayISO } from './utils';
import { uploadSectionImage } from './supabase';

interface Props {
  visible: boolean;
  initial?: Section;
  onClose(): void;
  onSave(s: Section): void;
}

export function SectionModal({ visible, initial, onClose, onSave }: Props) {
  const { tags, userId } = useApp();

  const [title, setTitle]               = useState('');
  const [selTags, setSelTags]           = useState<string[]>([]);
  const [date, setDate]                 = useState(todayISO());
  const [isReminder, setIsReminder]     = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [blocks, setBlocks]             = useState<Block[]>([{ type: 'text', content: '' }]);
  const [uploading, setUploading]       = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setSelTags(initial?.tags.map(t => t.id) ?? []);
      setDate(initial?.date ?? todayISO());
      setIsReminder(initial?.isReminder ?? false);
      setReminderDate(initial?.reminderDate ?? '');
      setBlocks(initial?.blocks?.length ? initial.blocks : [{ type: 'text', content: '' }]);
    }
  }, [visible, initial]);

  const toggleTag = (id: string) =>
    setSelTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const updateBlock = (idx: number, patch: Partial<Block>) =>
    setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } as Block : b));

  const removeBlock = (idx: number) =>
    setBlocks(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const addTextBlock     = () => setBlocks(p => [...p, { type: 'text', content: '' }]);
  const addCheckboxBlock = () => setBlocks(p => [...p, { type: 'checkbox', items: [{ text: '', checked: false }] }]);

  const pickAndUpload = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted' && Platform.OS !== 'web') return null;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (res.canceled || !res.assets.length) return null;
    setUploading(true);
    try {
      return await uploadSectionImage(res.assets[0].uri, userId);
    } catch (e) {
      console.warn('Image upload failed:', e);
      return res.assets[0].uri; // fallback to local URI
    } finally {
      setUploading(false);
    }
  };

  const addImageBlock = async () => {
    if (blocks.filter(b => b.type === 'image').length >= 9) return;
    const url = await pickAndUpload();
    if (url) setBlocks(p => [...p, { type: 'image', uri: url, label: 'photo', layout: 'single' }]);
  };

  const handleSave = () => {
    const selectedTagObjs = tags.filter(t => selTags.includes(t.id));
    const section: Section = {
      id: initial?.id ?? uuid(),
      title: title.trim(),
      date,
      createdAt: initial?.createdAt ?? nowISO(),
      isReminder,
      reminderDate: isReminder && reminderDate ? reminderDate : undefined,
      isPinned: initial?.isPinned ?? false,
      blocks: blocks.filter(b =>
        b.type === 'text'     ? b.content.trim() :
        b.type === 'bullets'  ? b.items.some(x => x.trim()) :
        b.type === 'checkbox' ? b.items.some(x => x.text.trim()) :
        !!b.uri
      ),
      tags: selectedTagObjs,
    };
    if (!section.blocks.length) section.blocks = [{ type: 'text', content: '' }];
    onSave(section);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
            {/* Top bar */}
            <View style={s.topBar}>
              <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TextInput
                style={s.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Section title…"
                placeholderTextColor={C.textMuted}
                // @ts-ignore
                outlineStyle="none"
              />
              <TouchableOpacity onPress={handleSave} style={s.saveBtn}>
                <Text style={s.saveTxt}>Save</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.bodyScroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
              {/* Date + Reminder */}
              <View style={s.metaRow}>
                <View style={s.metaField}>
                  <Text style={s.metaLabel}>DATE</Text>
                  <TextInput
                    style={s.metaInput}
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={C.textMuted}
                    // @ts-ignore
                    outlineStyle="none"
                  />
                </View>
                <TouchableOpacity
                  style={[s.reminderToggle, isReminder && s.reminderToggleOn]}
                  onPress={() => setIsReminder(!isReminder)}
                >
                  <Ionicons name="alarm-outline" size={14} color={isReminder ? C.pinkText : C.textMuted} />
                  <Text style={[s.reminderToggleTxt, isReminder && { color: C.pinkText }]}>
                    {isReminder ? 'Reminder on' : 'Set reminder'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isReminder && (
                <View style={s.reminderDateRow}>
                  <Text style={s.metaLabel}>REMINDER DATE</Text>
                  <TextInput
                    style={s.metaInput}
                    value={reminderDate}
                    onChangeText={setReminderDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={C.textMuted}
                    // @ts-ignore
                    outlineStyle="none"
                  />
                </View>
              )}

              {/* Tags */}
              <View style={s.section}>
                <Text style={s.sectionLabel}>TAGS</Text>
                <View style={s.tagGrid}>
                  {tags.map(t => {
                    const on = selTags.includes(t.id);
                    return (
                      <TouchableOpacity key={t.id} onPress={() => toggleTag(t.id)}
                        style={[s.tagChip, on && { backgroundColor: t.color + '22', borderColor: t.color }]}
                      >
                        {on && <View style={[s.tagDot, { backgroundColor: t.color }]} />}
                        <Text style={[s.tagName, on && { color: t.color, fontWeight: '600' }]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Content blocks */}
              <View style={s.section}>
                <Text style={s.sectionLabel}>CONTENT</Text>
                {blocks.map((block, idx) => (
                  <View key={idx} style={s.blockWrap}>
                    {block.type === 'text' && (
                      <TextBlockEditor
                        value={block.content}
                        onChange={v => updateBlock(idx, { content: v })}
                      />
                    )}

                    {block.type === 'bullets' && (
                      <BulletsEditor
                        items={(block as BulletsBlock).items}
                        onChange={items => updateBlock(idx, { items })}
                      />
                    )}

                    {block.type === 'checkbox' && (
                      <CheckboxEditor
                        items={(block as CheckboxBlock).items}
                        onChange={items => updateBlock(idx, { items })}
                      />
                    )}

                    {block.type === 'image' && (
                      <ImageBlockView
                        block={block as ImageBlock}
                        onReplace={async (slot: 1 | 2) => {
                          const url = await pickAndUpload();
                          if (!url) return;
                          if (slot === 1) updateBlock(idx, { uri: url, label: 'photo' });
                          else            updateBlock(idx, { uri2: url, label2: 'photo' });
                        }}
                        onToggleLayout={() => updateBlock(idx, { layout: (block as ImageBlock).layout === 'single' ? 'split' : 'single' } as any)}
                      />
                    )}

                    {blocks.length > 1 && (
                      <TouchableOpacity onPress={() => removeBlock(idx)} style={s.removeBlock}>
                        <Ionicons name="close" size={12} color={C.textMuted} />
                        <Text style={s.removeBlockTxt}>Remove block</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Add block footer */}
            <View style={s.addRowOuter}>
              <View style={s.addRow}>
                <TouchableOpacity style={s.addBtn} onPress={addTextBlock}>
                  <Text style={s.addBtnTxt}>＋ Text</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.addBtn} onPress={addCheckboxBlock}>
                  <Text style={s.addBtnTxt}>☑ Checklist</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.addBtn, blocks.filter(b => b.type === 'image').length >= 9 && s.addBtnDisabled]}
                  onPress={addImageBlock}
                  disabled={blocks.filter(b => b.type === 'image').length >= 9}
                >
                  <Text style={[s.addBtnTxt, blocks.filter(b => b.type === 'image').length >= 9 && s.addBtnTxtDisabled]}>🖼 Image</Text>
                </TouchableOpacity>
              </View>
            </View>
      </KeyboardAvoidingView>

      {uploading && (
        <View style={s.uploadOverlay}>
          <ActivityIndicator size="large" color={C.buttonBlue} />
          <Text style={s.uploadTxt}>Uploading image…</Text>
        </View>
      )}
    </Modal>
  );
}

// ── Text block with formatting bar ───────────────────────────────────────────

const WORD_LIMIT = 1000;

function countWords(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

// Web-only: native <textarea> that auto-grows with content
function WebTextArea({ value, onChange, onSel }: {
  value: string;
  onChange(v: string): void;
  onSel(start: number, end: number): void;
}) {
  const ref = useRef<any>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);

  return React.createElement('textarea', {
    ref,
    value,
    placeholder: 'Write something…',
    onChange:  (e: any) => onChange(e.target.value),
    onSelect:  (e: any) => onSel(e.target.selectionStart, e.target.selectionEnd),
    onInput:   (e: any) => {
      e.target.style.height = '0px';
      e.target.style.height = e.target.scrollHeight + 'px';
    },
    style: {
      fontSize: 14.5, lineHeight: '23px', color: C.textBody,
      width: '100%', resize: 'none', overflow: 'hidden',
      outline: 'none', border: 'none', background: 'transparent',
      padding: 0, margin: 0, display: 'block',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
  });
}

function TextBlockEditor({ value, onChange }: { value: string; onChange(v: string): void }) {
  const selRef    = useRef({ start: 0, end: 0 });
  const [height, setHeight] = useState<number | undefined>(undefined);
  const wordCount = countWords(value);
  const atLimit   = wordCount >= WORD_LIMIT;

  const handleChange = (v: string) => {
    if (countWords(v) > WORD_LIMIT) return;
    onChange(v);
  };

  const applyFormat = (marker: string) => {
    const { start, end } = selRef.current;
    onChange(value.slice(0, start) + marker + (value.slice(start, end) || '') + marker + value.slice(end));
  };

  const insertBullet = () => {
    const { start } = selRef.current;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    onChange(value.slice(0, lineStart) + '• ' + value.slice(lineStart));
  };

  const fmtBar = (
    <View style={fb.bar}>
      <TouchableOpacity style={fb.btn} onPress={() => applyFormat('**')}>
        <Text style={fb.bold}>B</Text>
      </TouchableOpacity>
      <TouchableOpacity style={fb.btn} onPress={() => applyFormat('*')}>
        <Text style={fb.italic}>I</Text>
      </TouchableOpacity>
      <TouchableOpacity style={fb.btn} onPress={() => applyFormat('__')}>
        <Text style={fb.under}>U</Text>
      </TouchableOpacity>
      <View style={fb.sep} />
      <TouchableOpacity style={fb.btn} onPress={insertBullet}>
        <Text style={fb.fmtTxt}>• List</Text>
      </TouchableOpacity>
      <TouchableOpacity style={fb.btn} onPress={() => applyFormat('`')}>
        <Text style={fb.code}>{ '{ }' }</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      {fmtBar}
      {atLimit && <Text style={s.wordLimitTxt}>Word limit reached (1000)</Text>}
      {Platform.OS === 'web' ? (
        <WebTextArea
          value={value}
          onChange={handleChange}
          onSel={(start, end) => { selRef.current = { start, end }; }}
        />
      ) : (
        <TextInput
          style={[s.textBlock, height !== undefined ? { height } : undefined]}
          multiline
          scrollEnabled={false}
          value={value}
          onChangeText={handleChange}
          placeholder="Write something…"
          placeholderTextColor={C.textMuted}
          textAlignVertical="top"
          onSelectionChange={e => { selRef.current = e.nativeEvent.selection; }}
          onContentSizeChange={e => {
            const h = e.nativeEvent.contentSize.height;
            if (h > 0) setHeight(h);
          }}
        />
      )}
    </View>
  );
}

const fb = StyleSheet.create({
  bar:    { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.borderLight, marginBottom: 8 },
  btn:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm },
  bold:   { fontSize: 13, fontWeight: '700', color: C.textBody },
  italic: { fontSize: 13, fontStyle: 'italic', color: C.textBody },
  under:  { fontSize: 13, textDecorationLine: 'underline', color: C.textBody },
  fmtTxt: { fontSize: 12, color: C.textBody },
  code:   { fontSize: 11, color: C.textBody, fontFamily: Platform.OS === 'web' ? 'ui-monospace,monospace' : 'monospace' },
  sep:    { width: 1, height: 16, backgroundColor: C.borderLight, marginHorizontal: 4 },
});

// ── Checkbox editor ───────────────────────────────────────────────────────────

function CheckboxEditor({ items, onChange }: {
  items: Array<{ text: string; checked: boolean }>;
  onChange(items: Array<{ text: string; checked: boolean }>): void;
}) {
  const update = (i: number, patch: Partial<{ text: string; checked: boolean }>) =>
    onChange(items.map((x, j) => j === i ? { ...x, ...patch } : x));
  const remove = (i: number) => items.length > 1 && onChange(items.filter((_, j) => j !== i));
  const add    = () => onChange([...items, { text: '', checked: false }]);

  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={cb.row}>
          <TouchableOpacity style={[cb.box, item.checked && cb.boxChecked]} onPress={() => update(i, { checked: !item.checked })}>
            {item.checked && <Ionicons name="checkmark" size={11} color={C.white} />}
          </TouchableOpacity>
          <TextInput
            style={[cb.input, item.checked && cb.inputDone]}
            value={item.text}
            onChangeText={v => update(i, { text: v })}
            placeholder="Item…"
            placeholderTextColor={C.textMuted}
            // @ts-ignore
            outlineStyle="none"
          />
          {items.length > 1 && (
            <TouchableOpacity onPress={() => remove(i)} style={cb.del}>
              <Ionicons name="close" size={14} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity onPress={add} style={cb.addBtn}>
        <Text style={cb.addBtnTxt}>＋ Add item</Text>
      </TouchableOpacity>
    </View>
  );
}

const cb = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  box:        { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  boxChecked: { backgroundColor: '#8a8f9e', borderColor: '#8a8f9e' },
  tick:       { fontSize: 11, color: C.white, fontWeight: '700' },
  input:      { flex: 1, fontSize: 14.5, color: C.textBody, borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingVertical: 4, outlineWidth: 0 } as any,
  inputDone:  { color: C.textMuted, textDecorationLine: 'line-through' },
  del:        { padding: 4 },
  delTxt:     { fontSize: 12, color: C.textMuted },
  addBtn:     { marginTop: 4, paddingVertical: 6 },
  addBtnTxt:  { fontSize: 13, color: C.buttonBlue },
});

// ── Bullets editor ────────────────────────────────────────────────────────────

function BulletsEditor({ items, onChange }: { items: string[]; onChange(items: string[]): void }) {
  const update = (i: number, v: string) => onChange(items.map((x, j) => j === i ? v : x));
  const remove = (i: number) => items.length > 1 && onChange(items.filter((_, j) => j !== i));
  const add    = () => onChange([...items, '']);
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={bs.row}>
          <View style={bs.dot} />
          <TextInput
            style={bs.input}
            value={item}
            onChangeText={v => update(i, v)}
            placeholder="Bullet point…"
            placeholderTextColor={C.textMuted}
            // @ts-ignore
            outlineStyle="none"
          />
          {items.length > 1 && (
            <TouchableOpacity onPress={() => remove(i)} style={bs.del}>
              <Text style={bs.delTxt}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity onPress={add} style={bs.addBtn}>
        <Text style={bs.addBtnTxt}>＋ Add bullet</Text>
      </TouchableOpacity>
    </View>
  );
}

const bs = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: C.bullet, flexShrink: 0 },
  input:    { flex: 1, fontSize: 14.5, color: C.textBody, borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingVertical: 4, outlineWidth: 0 } as any,
  del:      { padding: 4 },
  delTxt:   { fontSize: 12, color: C.textMuted },
  addBtn:   { marginTop: 4, paddingVertical: 6 },
  addBtnTxt:{ fontSize: 13, color: C.primary },
});

// ── Image block ───────────────────────────────────────────────────────────────

function ImageSlot({ uri, onReplace, label }: { uri?: string; onReplace(): void; label: string }) {
  return (
    <TouchableOpacity style={ib.slot} onPress={onReplace} activeOpacity={0.8}>
      {uri
        ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        : <View style={ib.placeholder}><Text style={ib.placeholderTxt}>{label}</Text></View>
      }
      <View style={ib.slotOverlay}>
        <Text style={ib.slotOverlayTxt}>Replace</Text>
      </View>
    </TouchableOpacity>
  );
}

function ImageBlockView({ block, onReplace, onToggleLayout }: { block: ImageBlock; onReplace(slot: 1 | 2): void; onToggleLayout(): void }) {
  return (
    <View style={ib.wrap}>
      <View style={ib.canvas}>
        {block.layout === 'split' ? (
          <View style={ib.splitRow}>
            <ImageSlot uri={block.uri}  onReplace={() => onReplace(1)} label="Tap to add" />
            <View style={ib.splitDivider} />
            <ImageSlot uri={block.uri2} onReplace={() => onReplace(2)} label="Tap to add" />
          </View>
        ) : (
          <ImageSlot uri={block.uri} onReplace={() => onReplace(1)} label="Tap to add photo" />
        )}
      </View>
      <View style={ib.actions}>
        <TouchableOpacity onPress={onToggleLayout} style={ib.btn}>
          <Text style={ib.btnTxt}>{block.layout === 'split' ? 'Single photo' : 'Split in two'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ib = StyleSheet.create({
  wrap:            { marginBottom: 8 },
  canvas:          { aspectRatio: 3/2, borderWidth: 1, borderColor: '#d3d9e8', overflow: 'hidden', backgroundColor: '#e6eaf5' },
  splitRow:        { flex: 1, flexDirection: 'row' },
  splitDivider:    { width: 6, backgroundColor: '#fff' },
  slot:            { flex: 1, overflow: 'hidden' },
  placeholder:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderTxt:  { fontSize: 12, color: C.textMuted },
  slotOverlay:     { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  slotOverlayTxt:  { fontSize: 11, color: '#fff', fontWeight: '600' },
  actions:         { flexDirection: 'row', gap: 10, marginTop: 6 },
  btn:             { paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.sm, borderWidth: 1, borderColor: C.border },
  btnTxt:          { fontSize: 12, color: C.textBody },
});

// ── Main styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: C.bg,
    paddingTop: Platform.OS === 'web' ? 0 : STATUS_BAR_HEIGHT,
  },
  topBar: {
    height: 62, flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: S.lg, backgroundColor: C.toolbar,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cancelBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: R.md, backgroundColor: C.border },
  cancelTxt:  { fontSize: 13.5, color: C.textBody },
  titleInput: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text, textAlign: 'center', outlineWidth: 0 } as any,
  saveBtn:    { paddingHorizontal: 16, paddingVertical: 6, borderRadius: R.md, backgroundColor: C.buttonBlue },
  saveTxt:    { fontSize: 13.5, fontWeight: '600', color: C.white },
  bodyScroll: { flex: 1 },
  body:       { maxWidth: 760, width: '100%', alignSelf: 'center', padding: S.lg, paddingBottom: 40 },
  metaRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: S.lg },
  metaField:  { flex: 1 },
  metaLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textLabel, marginBottom: 4 },
  metaInput:  {
    fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border,
    borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 6,
    backgroundColor: C.white, outlineWidth: 0,
  } as any,
  reminderToggle:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  reminderToggleOn:  { backgroundColor: '#f4e2e2', borderColor: C.pinkBar },
  reminderToggleTxt: { fontSize: 13, color: C.textLabel },
  reminderDateRow:   { marginBottom: S.lg },
  section:       { marginBottom: S.xl },
  sectionLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textLabel, marginBottom: S.sm },
  tagGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill, borderWidth: 1.5, borderColor: C.borderLight, backgroundColor: C.white },
  tagDot:        { width: 7, height: 7, borderRadius: 4 },
  tagName:       { fontSize: 13, color: C.textMuted },
  blockWrap:     { marginBottom: S.lg, backgroundColor: C.white, borderRadius: R.md, borderWidth: 1, borderColor: C.borderLight, padding: S.md },
  textBlock:     { fontSize: 14.5, lineHeight: 23, color: C.textBody, ...Platform.select({ web: { resize: 'none', outline: 'none' } as any }) } as any,
  wordLimitTxt:  { fontSize: 11, color: '#c0392b', marginBottom: 4 },
  removeBlock:   { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: R.sm },
  removeBlockTxt:{ fontSize: 12, color: '#d32f2f' },
  addRowOuter:   { borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.toolbar, paddingBottom: Platform.OS === 'web' ? 0 : 20 },
  addRow:        { flexDirection: 'row', gap: 10, padding: S.lg, maxWidth: 760, width: '100%', alignSelf: 'center' },
  addBtn:            { flex: 1, paddingVertical: 9, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center' },
  addBtnTxt:         { fontSize: 13, color: C.textBody, fontWeight: '500' },
  addBtnDisabled:    { opacity: 0.4 },
  addBtnTxtDisabled: { color: C.textMuted },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  uploadTxt:     { fontSize: 14, color: C.textBody, fontWeight: '500' },
});
