import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';

function CalendarIcon({ color = C.textLabel, size = 22 }: { color?: string; size?: number }) {
  const sz = size;
  return (
    <View style={{ width: sz, height: sz }}>
      <View style={{
        position: 'absolute', top: sz * 0.18, left: 0, right: 0, bottom: 0,
        borderWidth: 1.5, borderColor: color, borderRadius: 2, overflow: 'hidden',
      }}>
        <View style={{ height: sz * 0.27, backgroundColor: color }} />
      </View>
      <View style={{ position: 'absolute', top: 0, left: sz * 0.23, width: 2, height: sz * 0.32, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 0, left: sz * 0.65, width: 2, height: sz * 0.32, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}
import { C, R, S } from './theme';
import { useApp } from './context';
import { formatMonthLabel, todayISO } from './utils';

interface Props {
  onDatePress(date: string): void;
}

export function TimelineSidebar({ onDatePress }: Props) {
  const { sections } = useApp();
  const [open, setOpen] = useState(true);
  const today = todayISO();

  const months = useMemo(() => {
    const dateMap = new Map<string, number>();
    for (const sec of sections) {
      const d = sec.date.split('T')[0];
      dateMap.set(d, (dateMap.get(d) || 0) + 1);
    }
    const sorted = Array.from(dateMap.keys()).sort().reverse();

    const monthMap = new Map<string, { date: string; count: number; isToday: boolean }[]>();
    for (const d of sorted) {
      const key = d.slice(0, 7); // YYYY-MM
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push({ date: d, count: dateMap.get(d)!, isToday: d === today });
    }
    return Array.from(monthMap.entries()).map(([key, days]) => ({
      label: formatMonthLabel(key + '-01'),
      days,
    }));
  }, [sections, today]);

  if (!open) {
    return (
      <View style={[s.sidebar, s.sidebarClosed]}>
        <TouchableOpacity style={s.collapseBtn} onPress={() => setOpen(true)}>
          <CalendarIcon size={15} />
        </TouchableOpacity>
        {months.slice(0, 1).map(m =>
          m.days.slice(0, 4).map(d => (
            <Text key={d.date} style={[s.miniCount, d.isToday && s.miniCountToday]}>{d.count}</Text>
          ))
        )}
      </View>
    );
  }

  return (
    <View style={s.sidebar}>
      <View style={s.header}>
        <Text style={s.headerTxt}>TIMELINE</Text>
        <TouchableOpacity style={s.chevronBtn} onPress={() => setOpen(false)}>
          <Text style={s.chevron}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {months.map(m => (
          <View key={m.label}>
            <Text style={s.monthLabel}>{m.label}</Text>
            {m.days.map(d => {
              const [, , day] = d.date.split('-');
              const dt = new Date(d.date + 'T12:00:00');
              const wd = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()];
              const isToday = d.isToday;
              return (
                <TouchableOpacity
                  key={d.date}
                  style={[s.dayRow, isToday && s.dayRowToday]}
                  onPress={() => onDatePress(d.date)}
                  activeOpacity={0.7}
                >
                  <View style={[s.dayBar, { backgroundColor: isToday ? C.pinkBar : 'transparent' }]} />
                  <View>
                    <Text style={[s.dayNum, { fontWeight: isToday ? '700' : '500', color: isToday ? '#1f2742' : '#383d4b' }]}>
                      {parseInt(day, 10)}
                    </Text>
                    <Text style={s.dayWd}>{isToday ? wd + ' · Today' : wd}</Text>
                  </View>
                  <Text style={[s.countBadge, isToday && s.countBadgeToday]}>{d.count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {months.length === 0 && (
          <Text style={s.empty}>No entries yet</Text>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 160, flexShrink: 0, backgroundColor: C.sidebarBg, flexDirection: 'column',
    ...Platform.OS === 'web'
      ? { borderRightWidth: 1, borderRightColor: C.border }
      : { position: 'absolute' as const, right: 0, top: 0, bottom: 0, borderLeftWidth: 1, borderLeftColor: C.border, zIndex: 20 },
  },
  sidebarClosed: { width: 56, alignItems: 'center', paddingTop: 14, gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.sm,
  },
  headerTxt: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.textLabel },
  chevronBtn: {
    width: 24, height: 24, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center',
  },
  chevron: { fontSize: 18, color: C.textMuted },
  collapseBtn: {
    width: 30, height: 30, borderRadius: R.md, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  collapseIcon: { fontSize: 16 },
  scroll: { flex: 1, paddingHorizontal: 10 },
  monthLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: '#a6adbf',
    paddingVertical: S.sm, paddingHorizontal: S.sm,
  },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: R.md,
    marginBottom: 2,
  },
  dayRowToday: { backgroundColor: C.today },
  dayBar: { width: 3, height: 26, borderRadius: 3 },
  dayNum: { fontSize: 13.5, lineHeight: 16 },
  dayWd:  { fontSize: 11, color: '#a6adbf' },
  countBadge:      { marginLeft: 'auto', fontSize: 14, fontWeight: '600', color: C.bullet },
  countBadgeToday: { color: C.pinkBar },
  miniCount:       { fontSize: 11, fontWeight: '600', color: C.bullet, textAlign: 'center' },
  miniCountToday:  { color: C.pinkBar },
  empty:  { fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 24 },
});
