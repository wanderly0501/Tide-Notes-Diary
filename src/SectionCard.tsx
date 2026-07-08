import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, StyleSheet,
  Alert, Platform, Modal, Pressable, ScrollView, Dimensions, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from './theme';
import { Section, Block, CheckboxBlock, BulletsBlock } from './types';
import { formatDateDisplay } from './utils';
import { useApp } from './context';

// Renders inline markdown + auto-linked URLs
function MarkdownText({ text, style }: { text: string; style?: any }) {
  const patterns: Array<{ re: RegExp; st: object; link?: boolean }> = [
    { re: /\*\*(.+?)\*\*/s, st: { fontWeight: '700' as const } },
    { re: /\*(.+?)\*/s,     st: { fontStyle: 'italic' as const } },
    { re: /__(.+?)__/s,     st: { textDecorationLine: 'underline' as const } },
    { re: /`(.+?)`/s,       st: { fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : 'monospace' } },
    { re: /(https?:\/\/[^\s]+)/, st: { color: C.buttonBlue, textDecorationLine: 'underline' as const }, link: true },
  ];

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliest: { index: number; match: RegExpExecArray; st: object; link?: boolean } | null = null;
    for (const { re, st, link } of patterns) {
      const m = re.exec(remaining);
      if (m && (earliest === null || m.index < earliest.index)) {
        earliest = { index: m.index, match: m, st, link };
      }
    }
    if (!earliest) {
      parts.push(<Text key={key++} style={style}>{remaining}</Text>);
      break;
    }
    if (earliest.index > 0) {
      parts.push(<Text key={key++} style={style}>{remaining.slice(0, earliest.index)}</Text>);
    }
    const inner = earliest.match[1] ?? earliest.match[0];
    if (earliest.link) {
      const url = inner;
      const linkProps: any = Platform.OS === 'web'
        ? { accessibilityRole: 'link', href: url, target: '_blank' }
        : { onPress: () => Linking.openURL(url) };
      parts.push(<Text key={key++} style={[style, earliest.st]} {...linkProps}>{url}</Text>);
    } else {
      parts.push(<Text key={key++} style={[style, earliest.st]}>{inner}</Text>);
    }
    remaining = remaining.slice(earliest.index + earliest.match[0].length);
  }

  return <Text style={style}>{parts}</Text>;
}

interface Props {
  section: Section;
  onEdit(s: Section): void;
  onDelete(id: string): void;
  onTogglePin(id: string, pinned: boolean): void;
  onUpdate?(s: Section): void;
  onTagsChange?(sectionId: string, tags: Tag[]): Promise<void>;
}

function firstLine(section: Section): string {
  for (const b of section.blocks) {
    if (b.type === 'text' && b.content.trim())
      return b.content.trim().split('\n')[0];
    if (b.type === 'bullets' && b.items.some(x => x.trim()))
      return '• ' + b.items.find(x => x.trim())!;
    if (b.type === 'checkbox' && b.items.some(x => x.text.trim()))
      return '☐ ' + b.items.find(x => x.text.trim())!.text;
    if (b.type === 'image')
      return '🖼 Image';
  }
  return '';
}

function ImageViewer({ uri, onClose }: { uri: string; onClose(): void }) {
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={iv.overlay} onPress={onClose}>
        <Image source={{ uri }} style={iv.img} resizeMode="contain" />
        <TouchableOpacity style={iv.closeBtn} onPress={onClose} hitSlop={16}>
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

const iv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  img:     { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  closeBtn:{ position: 'absolute', top: 52, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeTxt:{ fontSize: 16, color: '#fff', fontWeight: '600' },
});


export function SectionCard({ section, onEdit, onDelete, onTogglePin, onUpdate, onTagsChange }: Props) {
  const { tags: allTags } = useApp();
  const [folded, setFolded]           = useState(false);
  const [localBlocks, setLocalBlocks] = useState<Block[]>(section.blocks);
  const [localTags, setLocalTags]     = useState(section.tags);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [viewerUri, setViewerUri]     = useState<string | null>(null);
  const [tagMenuPos, setTagMenuPos]   = useState({ top: 0, left: 0 });
  const addTagBtnRef = useRef<TouchableOpacity>(null);

  const openTagMenu = () => {
    addTagBtnRef.current?.measureInWindow((x, y, _w, h) => {
      setTagMenuPos({ top: y + h + 4, left: x });
      setTagMenuOpen(true);
    });
  };

  const toggleSectionTag = (tagId: string) => {
    const has = localTags.some(t => t.id === tagId);
    const found = allTags.find(t => t.id === tagId);
    if (!found && !has) return;
    const newTags = has
      ? localTags.filter(t => t.id !== tagId)
      : [...localTags, found!];
    setLocalTags(newTags);
    onTagsChange?.(section.id, newTags);
  };

  useEffect(() => { setLocalBlocks(section.blocks); }, [section.blocks]);
  useEffect(() => { setLocalTags(section.tags); }, [section.tags]);

  const confirmDelete = () => {
    const msg = section.title
      ? `"${section.title}" will be permanently deleted.`
      : 'This section will be permanently deleted.';
    if (Platform.OS === 'web') {
      if (window.confirm(msg)) onDelete(section.id);
    } else {
      Alert.alert('Delete section?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(section.id) },
      ]);
    }
  };

  const saveBlocks = (blocks: Block[]) => {
    setLocalBlocks(blocks);
    onUpdate?.({ ...section, tags: localTags, blocks });
  };

  const toggleCheckbox = (blockIdx: number, itemIdx: number) => {
    const updated = localBlocks.map((b, bi) => {
      if (bi !== blockIdx || b.type !== 'checkbox') return b;
      const cb = b as CheckboxBlock;
      return {
        ...cb,
        items: cb.items.map((it, ii) => ii === itemIdx ? { ...it, checked: !it.checked } : it),
      };
    });
    saveBlocks(updated);
  };

  const updateTextBlock = (blockIdx: number, content: string) => {
    const updated = localBlocks.map((b, bi) =>
      bi === blockIdx && b.type === 'text' ? { ...b, content } : b
    );
    saveBlocks(updated);
  };

  const updateBulletItem = (blockIdx: number, itemIdx: number, value: string) => {
    const updated = localBlocks.map((b, bi) => {
      if (bi !== blockIdx || b.type !== 'bullets') return b;
      const bb = b as BulletsBlock;
      return { ...bb, items: bb.items.map((it, ii) => ii === itemIdx ? value : it) };
    });
    saveBlocks(updated);
  };

  const isReminder = section.isReminder && section.reminderDate;

  return (
    <View style={s.card}>
      {/* Reminder badge */}
      {isReminder && (
        <View style={s.reminderBadge}>
          <Ionicons name="alarm-outline" size={12} color={C.pinkText} />
          <Text style={s.reminderTxt}>Reminder · {formatDateDisplay(section.reminderDate!)}</Text>
        </View>
      )}

      {/* Header: tags + actions */}
      <View style={s.header}>
        <View style={s.tagRow}>
          {section.isPinned && <Text style={s.pinnedEmoji}>📌</Text>}
          {localTags.map(t => (
            <View key={t.id} style={s.tagChip}>
              <View style={[s.tagDot, { backgroundColor: t.color }]} />
              <Text style={s.tagTxt}>{t.name.toLowerCase()}</Text>
            </View>
          ))}
          {(onUpdate || onTagsChange) && (
            <TouchableOpacity ref={addTagBtnRef} onPress={openTagMenu} style={s.addTagBtn}>
              <Ionicons name="add" size={14} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tag picker dropdown */}
        <Modal visible={tagMenuOpen} transparent animationType="none" onRequestClose={() => setTagMenuOpen(false)}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTagMenuOpen(false)} />
          <View style={[s.tagMenu, { position: 'absolute', top: tagMenuPos.top, left: tagMenuPos.left }]}>
            <ScrollView style={s.tagMenuScroll} showsVerticalScrollIndicator={false}>
              {allTags.map(t => {
                const selected = localTags.some(st => st.id === t.id);
                return (
                  <TouchableOpacity key={t.id} style={s.tagMenuItem} onPress={() => toggleSectionTag(t.id)}>
                    <View style={[s.tagMenuCheck, selected && { backgroundColor: t.color, borderColor: t.color }]}>
                      {selected && <Ionicons name="checkmark" size={9} color={C.white} />}
                    </View>
                    <View style={[s.tagMenuDot, { backgroundColor: t.color }]} />
                    <Text style={s.tagMenuTxt}>{t.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

        <View style={s.headerActions}>
          <TouchableOpacity onPress={() => onEdit(section)} style={s.actionBtn}>
            <Ionicons name="create-outline" size={15} color="#a0a8b8" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onTogglePin(section.id, !section.isPinned)} style={s.actionBtn}>
            <Ionicons
              name={section.isPinned ? 'arrow-down' : 'arrow-up-outline'}
              size={15}
              color={section.isPinned ? '#4a5a7a' : '#a0a8b8'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete} style={s.actionBtn}>
            <Ionicons name="trash-outline" size={15} color="#a0a8b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title */}
      {!!section.title && <Text style={s.title}>{section.title}</Text>}

      {/* Folded preview */}
      {folded && <Text style={s.foldPreview} numberOfLines={1}>{firstLine(section)}</Text>}

      {/* Blocks */}
      {!folded && localBlocks.map((block, i) => {
        if (block.type === 'text') {
          return (
            <MarkdownText key={i} text={block.content} style={s.bodyTxt} />
          );
        }

        if (block.type === 'bullets') {
          const bb = block as BulletsBlock;
          return (
            <View key={i} style={s.bulletList}>
              {bb.items.map((item, j) => (
                <View key={j} style={s.bulletRow}>
                  <View style={s.bullet} />
                  <TextInput
                    style={s.bulletTxt}
                    value={item}
                    onChangeText={v => updateBulletItem(i, j, v)}
                    // @ts-ignore
                    outlineStyle="none"
                  />
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'checkbox') {
          const cb = block as CheckboxBlock;
          return (
            <View key={i} style={s.checkList}>
              {cb.items.map((item, j) => (
                <View key={j} style={s.checkRow}>
                  <TouchableOpacity
                    style={[s.checkBox, item.checked && s.checkBoxDone]}
                    onPress={() => toggleCheckbox(i, j)}
                  >
                    {item.checked && <Ionicons name="checkmark" size={10} color={C.white} />}
                  </TouchableOpacity>
                  <Text style={[s.checkTxt, item.checked && s.checkTxtDone]}>{item.text}</Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'image') {
          return (
            <View key={i} style={s.imgWrap}>
              <View style={StyleSheet.absoluteFill}>
                {block.layout === 'split' ? (
                  <View style={s.imgSplitRow}>
                    <TouchableOpacity style={s.imgHalf} activeOpacity={0.9} onPress={() => block.uri && setViewerUri(block.uri)}>
                      {block.uri ? <Image source={{ uri: block.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.imgHalf, { borderLeftWidth: 6, borderLeftColor: '#fff' }]} activeOpacity={0.9} onPress={() => block.uri2 && setViewerUri(block.uri2)}>
                      {block.uri2 ? <Image source={{ uri: block.uri2 }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={0.9} onPress={() => block.uri && setViewerUri(block.uri)}>
                    {block.uri ? <Image source={{ uri: block.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }
        return null;
      })}

      {/* Fold / unfold */}
      <TouchableOpacity style={s.foldBtn} onPress={() => setFolded(f => !f)} activeOpacity={0.6}>
        <Ionicons name={folded ? 'chevron-down-outline' : 'chevron-up-outline'} size={12} color="#b0b8c8" />
      </TouchableOpacity>

      {viewerUri && <ImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    borderRadius: R.lg, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 4, marginBottom: 14,
  },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 6 },
  title:        { fontSize: 17, fontWeight: '600', color: C.text, letterSpacing: -0.17, marginBottom: 10 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 7, flex: 1 },
  tagChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.tagBg, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 2 },
  tagDot:       { width: 7, height: 7, borderRadius: 4 },
  tagTxt:       { fontSize: 12, color: C.tagText },
  addTagBtn:    { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addTagTxt:    { fontSize: 13, color: C.textMuted, lineHeight: 16, marginTop: -1 },
  tagMenu: {
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, minWidth: 160,
    ...Platform.select({ web: { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } }),
  },
  tagMenuScroll: { maxHeight: 400, paddingVertical: 4 },
  tagMenuItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  tagMenuCheck: { width: 15, height: 15, borderRadius: 3, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  tagMenuTick:  { fontSize: 9, color: C.white, fontWeight: '700' },
  tagMenuDot:   { width: 8, height: 8, borderRadius: 4 },
  tagMenuTxt:   { fontSize: 13, color: C.textBody },
  reminderBadge:{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: '#f4e2e2', borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 4, marginBottom: 8 },
  reminderIcon: { fontSize: 12 },
  reminderTxt:  { fontSize: 12, fontWeight: '600', color: C.pinkText },
  headerActions:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn:    { paddingVertical: 5, paddingLeft: 6, paddingRight: 0 },
  actionIcon:   { fontSize: 14, color: '#a0a8b8' },
  pinnedEmoji:  { fontSize: 13 },
  pinArrow:     { fontSize: 15, color: '#a0a8b8', fontWeight: '300' as any },
  pinArrowOn:   { color: '#4a5a7a', fontWeight: '700' as any },
  foldPreview:  { fontSize: 13.5, color: C.textMuted, marginTop: 6, marginBottom: 2 },
  foldBtn:      { alignSelf: 'flex-end', marginTop: 1, paddingBottom: 2, paddingLeft: 4, paddingRight: 0 },

  bodyTxt:      { fontSize: 14.5, lineHeight: 23, color: C.textBody, marginBottom: 8 },
  bulletList:   { marginTop: 4, marginBottom: 8, gap: 7 },
  bulletRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.bullet, marginTop: 8, flexShrink: 0 },
  bulletTxt:    { fontSize: 14.5, lineHeight: 23, color: C.textBody, flex: 1, outlineWidth: 0 } as any,
  checkList:    { marginTop: 4, marginBottom: 8, gap: 6 },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkBox:     { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkBoxDone: { backgroundColor: '#8a8f9e', borderColor: '#8a8f9e' },
  checkTick:    { fontSize: 10, color: C.white, fontWeight: '700' },
  checkTxt:     { fontSize: 14, lineHeight: 22, color: C.textBody },
  checkTxtDone: { color: C.textMuted, textDecorationLine: 'line-through' },
  imgWrap:      { paddingBottom: '66.666%', overflow: 'hidden', marginBottom: 12, backgroundColor: '#e6eaf5' },
  imgSplitRow:  { flex: 1, flexDirection: 'row' },
  imgHalf:      { flex: 1, overflow: 'hidden' },
});
