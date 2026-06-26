import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, RefreshControl,
} from 'react-native';
import { C, S } from './theme';
import { useApp } from './context';
import { TimelineSidebar } from './TimelineSidebar';
import { TagsSidebar } from './TagsSidebar';
import { SectionCard } from './SectionCard';
import { SectionModal } from './SectionModal';
import { Section } from './types';
import { groupByDate, formatDateLabel } from './utils';

export function StreamScreen({
  newSectionOpen = false,
  onNewSectionClose,
  mobileTimelineOpen = false,
  onMobileTimelineClose,
  mobileTagsOpen = false,
  onMobileTagsClose,
}: {
  newSectionOpen?: boolean;
  onNewSectionClose?: () => void;
  mobileTimelineOpen?: boolean;
  onMobileTimelineClose?: () => void;
  mobileTagsOpen?: boolean;
  onMobileTagsClose?: () => void;
}) {
  const { filteredSections, addSection, editSection, removeSection, togglePin, updateSectionTags, reload } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const dateOffsets = useRef<Record<string, number>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget]     = useState<Section | undefined>();
  const [refreshing, setRefreshing]     = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await reload(); } finally { setRefreshing(false); }
  };

  useEffect(() => {
    if (newSectionOpen) {
      setEditTarget(undefined);
      setModalVisible(true);
      onNewSectionClose?.();
    }
  }, [newSectionOpen]);

  const pinned   = useMemo(() => filteredSections.filter(s => s.isPinned),  [filteredSections]);
  const unpinned = useMemo(() => filteredSections.filter(s => !s.isPinned), [filteredSections]);
  const groups   = useMemo(() => groupByDate(unpinned), [unpinned]);

  const handleDatePress = (date: string) => {
    const y = dateOffsets.current[date];
    if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
  };

  const openEdit = (s: Section) => { setEditTarget(s); setModalVisible(true); };
  const closeModal = () => setModalVisible(false);

  const handleSave = async (s: Section) => {
    if (editTarget) await editSection(s);
    else            await addSection(s);
    setModalVisible(false);
  };

  const isMobile = Platform.OS !== 'web';

  return (
    <View style={st.container}>
      {/* Web: sidebars inline on the LEFT */}
      {!isMobile && <TimelineSidebar onDatePress={handleDatePress} />}
      {!isMobile && <TagsSidebar />}

      <ScrollView
        ref={scrollRef}
        style={[st.scroll, isMobile && StyleSheet.absoluteFillObject]}
        contentContainerStyle={st.content}
        showsVerticalScrollIndicator={false}
        refreshControl={isMobile ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
        ) : undefined}
      >
        {/* Pinned sections */}
        {pinned.length > 0 && (
          <View>
{pinned.map(section => (
              <SectionCard
                key={section.id}
                section={section}
                onEdit={openEdit}
                onDelete={removeSection}
                onTogglePin={togglePin}
                onUpdate={editSection}
                onTagsChange={updateSectionTags}
              />
            ))}
          </View>
        )}

        {/* Section groups */}
        {groups.map(({ date, items }) => {
          const { label, year, isToday } = formatDateLabel(date);
          return (
            <View key={date} onLayout={e => { dateOffsets.current[date] = e.nativeEvent.layout.y; }}>
              {/* Date divider */}
              <View style={st.divider}>
                <Text style={[st.dividerLabel, isToday && st.dividerLabelToday]}>
                  {label}
                </Text>
                {isToday && <Text style={st.dividerYear}>{year}</Text>}
                <View style={[st.dividerLine, { backgroundColor: '#d0d5e2', height: 1 }]} />
              </View>

              {/* Sections */}
              {items.map(section => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onEdit={openEdit}
                  onDelete={removeSection}
                  onTogglePin={togglePin}
                  onUpdate={editSection}
                />
              ))}
            </View>
          );
        })}

        {pinned.length === 0 && groups.length === 0 && (
          <View style={st.empty}>
            <Text style={st.emptyTitle}>No notes yet</Text>
            <Text style={st.emptyBody}>Tap the composer above to add your first section.</Text>
          </View>
        )}
      </ScrollView>

      {/* Mobile: sidebars rendered after ScrollView so they float on top */}
      {isMobile && mobileTimelineOpen && <TimelineSidebar onDatePress={handleDatePress} />}
      {isMobile && mobileTagsOpen     && <TagsSidebar />}

      <SectionModal
        visible={modalVisible}
        initial={editTarget}
        onClose={closeModal}
        onSave={handleSave}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container:   { flex: 1, flexDirection: 'row' },
  scroll:      { flex: 1, backgroundColor: C.bg },
  content:     { maxWidth: 760, alignSelf: 'center', width: '100%', paddingHorizontal: Platform.OS === 'web' ? 40 : 16, paddingTop: Platform.OS === 'web' ? 26 : 14, paddingBottom: Platform.OS === 'web' ? 80 : 40 },
  pinnedHeader:{ marginTop: 4, marginBottom: 10, marginHorizontal: 2 },
  pinnedLabel: { color: '#b03030' },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 24, marginBottom: 14, marginHorizontal: 2 },
  dividerLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, color: '#6f7588', textTransform: 'uppercase' as const },
  dividerLabelToday: { color: C.todayText },
  dividerYear: { fontSize: 11, color: '#a6adbf', fontWeight: '500' },
  dividerLine: { flex: 1 },
  empty:       { alignItems: 'center', paddingTop: 60 },
  emptyTitle:  { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 8 },
  emptyBody:   { fontSize: 14, color: C.textMuted, textAlign: 'center' },
});
