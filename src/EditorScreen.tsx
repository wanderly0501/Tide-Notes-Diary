import React, { useState, useEffect, useRef, useCallback, useMemo, createElement } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { C, R, S } from './theme';
import { useApp } from './context';
import { TideDocument } from './types';
import { nowISO, countWords } from './utils';

// ── Inline format conversion (markdown ↔ HTML) ────────────────────────────────

function mdToHtmlInline(text: string): string {
  return text
    .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
    .replace(/\*([\s\S]*?)\*/g, '<i>$1</i>')
    .replace(/__([\s\S]*?)__/g, '<u>$1</u>')
    .replace(/==([\s\S]*?)==/g, '<mark>$1</mark>');
}

function htmlToMdInline(text: string): string {
  return text
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '__$1__')
    .replace(/<mark[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==')
    .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

// ── HTML ↔ line model ─────────────────────────────────────────────────────────

type LineFormat = 'title' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bullet' | 'ordered';
interface Line { id: number; format: LineFormat; text: string }

let _id = 0;
const mkLine = (format: LineFormat = 'body', text = ''): Line => ({ id: ++_id, format, text });

function htmlToLines(html: string): Line[] {
  if (!html) return [mkLine()];
  const processed = html
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, c) =>
      c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_2: string, t: string) => `§bullet§${t}\n`))
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, c) =>
      c.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_2: string, t: string) => `§ordered§${t}\n`))
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `§title§${t}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `§h1§${t}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `§h2§${t}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `§h3§${t}\n`)
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, t) => `§h4§${t}\n`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,  (_, t) => `§body§${t}\n`)
    .replace(/<br\s*\/?>/gi, '');
  const rows = processed.split('\n').filter(r => r.trim());
  if (!rows.length) return [mkLine()];
  return rows.map(row => {
    const m = row.match(/^§(\w+)§([\s\S]*)/);
    if (!m) return mkLine('body', htmlToMdInline(row));
    return mkLine(m[1] as LineFormat, htmlToMdInline(m[2]));
  });
}

function linesToHtml(lines: Line[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.format === 'bullet') {
      const items: string[] = [];
      while (i < lines.length && lines[i].format === 'bullet') {
        items.push(`<li>${mdToHtmlInline(lines[i].text)}</li>`);
        i++;
      }
      parts.push(`<ul>${items.join('')}</ul>`);
    } else if (line.format === 'ordered') {
      const items: string[] = [];
      while (i < lines.length && lines[i].format === 'ordered') {
        items.push(`<li>${mdToHtmlInline(lines[i].text)}</li>`);
        i++;
      }
      parts.push(`<ol>${items.join('')}</ol>`);
    } else {
      const tagMap: Record<string, string> = {
        title: 'h1', h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', body: 'p',
      };
      const tag = tagMap[line.format] ?? 'p';
      parts.push(`<${tag}>${mdToHtmlInline(line.text) || '<br>'}</${tag}>`);
      i++;
    }
  }
  return parts.join('');
}

function legacyToHtml(content: string): string {
  if (!content.trim()) return '<p><br></p>';
  if (content.trimStart().startsWith('<')) return content;
  return content.split('\n').map(line => {
    const m = line.match(/^(#{1,5})\s*(.*)/);
    if (!m) return line ? `<p>${line}</p>` : '<p><br></p>';
    const tags = ['h1', 'h2', 'h3', 'h4', 'h5'];
    return `<${tags[m[1].length - 1]}>${m[2] || '<br>'}</${tags[m[1].length - 1]}>`;
  }).join('');
}

// ── Styles ────────────────────────────────────────────────────────────────────

const LINE_STYLE: Record<LineFormat, object> = {
  title:   { fontSize: 26, fontWeight: '700', lineHeight: 42, color: '#1a1f36', marginTop: 8  },
  h1:      { fontSize: 21, fontWeight: '700', lineHeight: 34, color: '#222840', marginTop: 6  },
  h2:      { fontSize: 17, fontWeight: '600', lineHeight: 28, color: '#2b3252', marginTop: 4  },
  h3:      { fontSize: 15, fontWeight: '600', lineHeight: 26, color: '#383d4b', marginTop: 2  },
  h4:      { fontSize: 13, fontWeight: '600', lineHeight: 22, color: '#50566b', marginTop: 2  },
  body:    { fontSize: 16, fontWeight: '400', lineHeight: 28, color: '#383d4b'                },
  bullet:  { fontSize: 16, fontWeight: '400', lineHeight: 28, color: '#383d4b'                },
  ordered: { fontSize: 16, fontWeight: '400', lineHeight: 28, color: '#383d4b'                },
};

const INDENT: Record<LineFormat, number> = {
  title: 0, h1: 0, h2: 10, h3: 20, h4: 30, body: 0, bullet: 0, ordered: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { docId: string }

const WEB_FORMATS = [
  { label: 'Title',  tag: 'h1' }, { label: 'H1', tag: 'h2' },
  { label: 'H2',     tag: 'h3' }, { label: 'H3', tag: 'h4' }, { label: 'Normal', tag: 'p' },
] as const;

const MOB_FORMATS: Array<{ label: string; format: LineFormat }> = [
  { label: 'Title', format: 'title' }, { label: 'H1', format: 'h1' },
  { label: 'H2',    format: 'h2'   }, { label: 'H3', format: 'h3' },
  { label: 'Normal', format: 'body' },
];

const FONT_SIZES = [
  { label: 'S', val: '2' }, { label: 'M', val: '3' },
  { label: 'L', val: '5' }, { label: 'XL', val: '6' },
] as const;

export function EditorScreen({ docId }: Props) {
  const { setView, getDoc, editDoc } = useApp();

  const [doc, setDoc]       = useState<TideDocument | null>(null);
  const [title, setTitle]   = useState('');
  const [saved, setSaved]   = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [lines, setLines]   = useState<Line[]>([mkLine()]);
  const [activeLine, setActiveLine]   = useState(0);
  const [lineSelection, setLineSelection] = useState({ start: 0, end: 0 });
  const [linkBarOpen, setLinkBarOpen] = useState(false);
  const [linkUrl, setLinkUrl]         = useState('');
  const [webHeadings, setWebHeadings] = useState<{ text: string; level: number }[]>([]);

  const docRef    = useRef<TideDocument | null>(null);
  const titleRef  = useRef('');
  const saveTimer = useRef<any>(null);
  const lineRefs  = useRef<Record<number, TextInput | null>>({});
  const webRef    = useRef<any>(null);
  const htmlRef   = useRef('');

  useEffect(() => { docRef.current = doc; },    [doc]);
  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => {
    getDoc(docId).then(d => {
      if (d) {
        setDoc(d);
        setTitle(d.title);
        const html = legacyToHtml(d.content);
        htmlRef.current = html;
        if (Platform.OS !== 'web') setLines(htmlToLines(html));
        else {
          if (webRef.current) webRef.current.innerHTML = html;
          parseAndSetWebHeadings(html);
        }
      }
    });
  }, [docId]);

  const parseAndSetWebHeadings = useCallback((html: string) => {
    const matches = [...html.matchAll(/<(h[1-5])[^>]*>([\s\S]*?)<\/\1>/gi)];
    setWebHeadings(matches.map(m => ({
      level: parseInt(m[1][1]),
      text: m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(),
    })));
  }, []);

  const setWebRef = useCallback((el: any) => {
    webRef.current = el;
    if (el && htmlRef.current) {
      el.innerHTML = htmlRef.current;
      parseAndSetWebHeadings(htmlRef.current);
    }
  }, [parseAndSetWebHeadings]);

  const scrollToWebHeading = useCallback((index: number) => {
    if (!webRef.current) return;
    const els: NodeListOf<HTMLElement> = webRef.current.querySelectorAll('h1,h2,h3,h4,h5');
    const el = els[index];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(el, 0); range.collapse(true);
    sel?.removeAllRanges(); sel?.addRange(range);
    webRef.current?.focus();
  }, []);

  // ── Shared save (always HTML) ───────────────────────────────────────────────

  const triggerSave = useCallback((html: string, newTitle?: string) => {
    const d = docRef.current;
    if (!d) return;
    const t = newTitle ?? titleRef.current;
    clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(async () => {
      const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const updated: TideDocument = {
        ...d, title: t.trim() || 'Untitled', content: html,
        updatedAt: nowISO(), wordCount: countWords(stripped),
      };
      await editDoc(updated);
      setDoc(updated);
      setSaved(true);
    }, 1200);
  }, [editDoc]);

  const saveLines = useCallback((newLines: Line[], newTitle?: string) => {
    const html = linesToHtml(newLines);
    htmlRef.current = html;
    triggerSave(html, newTitle);
  }, [triggerSave]);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (Platform.OS === 'web') triggerSave(htmlRef.current, v);
    else saveLines(lines, v);
  };

  // ── Web helpers ─────────────────────────────────────────────────────────────

  const exec = (cmd: string, value?: string) => {
    webRef.current?.focus();
    document.execCommand(cmd, false, value ?? undefined);
  };

  const handleWebInput = useCallback(() => {
    const html = webRef.current?.innerHTML ?? '';
    htmlRef.current = html;
    triggerSave(html);
    parseAndSetWebHeadings(html);
  }, [triggerSave, parseAndSetWebHeadings]);

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) exec('createLink', url);
  }, []);

  // ── Mobile line handlers ────────────────────────────────────────────────────

  const handleTextChange = useCallback((index: number, text: string) => {
    setLines(prev => {
      if (text.includes('\n')) {
        const parts = text.split('\n');
        const next = [...prev];
        next[index] = { ...next[index], text: parts[0] };
        const inserts = parts.slice(1).map(t => mkLine('body', t));
        next.splice(index + 1, 0, ...inserts);
        saveLines(next);
        const focusId = next[index + inserts.length]?.id;
        if (focusId) setTimeout(() => lineRefs.current[focusId]?.focus(), 30);
        return next;
      }
      const next = [...prev];
      next[index] = { ...next[index], text };
      saveLines(next);
      return next;
    });
  }, [saveLines]);

  const handleEnter = useCallback((index: number) => {
    setLines(prev => {
      const next = [...prev];
      // Bullet/ordered: continue same format on Enter
      const fmt = next[index]?.format;
      const ins = mkLine(fmt === 'bullet' || fmt === 'ordered' ? fmt : 'body');
      next.splice(index + 1, 0, ins);
      saveLines(next);
      setTimeout(() => lineRefs.current[ins.id]?.focus(), 30);
      return next;
    });
  }, [saveLines]);

  const handleBackspaceEmpty = useCallback((index: number) => {
    setLines(prev => {
      if (prev.length <= 1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      saveLines(next);
      const prevId = next[Math.max(0, index - 1)]?.id;
      if (prevId) setTimeout(() => lineRefs.current[prevId]?.focus(), 30);
      return next;
    });
  }, [saveLines]);

  const applyFormat = useCallback((format: LineFormat) => {
    setLines(prev => {
      const next = [...prev];
      const line = next[activeLine];
      if (!line) return prev;
      next[activeLine] = { ...line, format };
      saveLines(next);
      setTimeout(() => lineRefs.current[line.id]?.focus(), 30);
      return next;
    });
  }, [activeLine, saveLines]);

  const wrapWith = useCallback((open: string, close: string) => {
    setLines(prev => {
      const next = [...prev];
      const line = next[activeLine];
      if (!line) return prev;
      const { start, end } = lineSelection;
      const t = line.text;
      next[activeLine] = { ...line, text: t.slice(0, start) + open + t.slice(start, end) + close + t.slice(end) };
      saveLines(next);
      return next;
    });
    setTimeout(() => lineRefs.current[lines[activeLine]?.id]?.focus(), 30);
  }, [activeLine, lineSelection, lines, saveLines]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const headings = useMemo(() =>
    lines.map((l, i) => ({ ...l, i })).filter(l => !['body','bullet','ordered'].includes(l.format)),
    [lines]
  );

  const outlineEntries = useMemo(() => {
    if (Platform.OS === 'web') {
      return webHeadings.map((h, i) => ({
        key: `wh${i}`,
        text: h.text || '(empty)',
        isTitleLevel: h.level === 1,
        indent: (h.level - 1) * 10,
        onPress: () => scrollToWebHeading(i),
      }));
    }
    return headings.map(h => ({
      key: String(h.id),
      text: h.text || '(empty)',
      isTitleLevel: h.format === 'title',
      indent: INDENT[h.format],
      onPress: () => lineRefs.current[h.id]?.focus(),
    }));
  }, [webHeadings, headings]);

  // Ordered list numbering per line index
  const orderedNums = useMemo(() => {
    const nums: Record<number, number> = {};
    let n = 0;
    lines.forEach((l, i) => { nums[i] = l.format === 'ordered' ? ++n : (n = 0, 0); });
    return nums;
  }, [lines]);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const meta = doc ? (() => {
    const d = new Date(doc.updatedAt);
    return `Edited ${months[d.getMonth()]} ${d.getDate()} · ${doc.wordCount} words`;
  })() : '';

  const activeFormat = lines[activeLine]?.format ?? 'body';
  const isWeb = Platform.OS === 'web';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.wrap}>
      {isWeb && createElement('style', null, `
        .tide-editor { outline: none; min-height: 500px; word-break: break-word; }
        .tide-editor h1 { font-size: 26px; font-weight: 700; line-height: 1.35; margin: 20px 0 8px; color: #1a1f36; }
        .tide-editor h2 { font-size: 21px; font-weight: 700; line-height: 1.4;  margin: 16px 0 6px; color: #222840; }
        .tide-editor h3 { font-size: 17px; font-weight: 600; line-height: 1.45; margin: 14px 0 5px; color: #2b3252; }
        .tide-editor h4 { font-size: 15px; font-weight: 600; line-height: 1.5;  margin: 10px 0 4px; color: #383d4b; }
        .tide-editor h5 { font-size: 13px; font-weight: 600; line-height: 1.5;  margin: 8px  0 3px; color: #50566b; }
        .tide-editor p  { font-size: 16px; font-weight: 400; line-height: 1.75; margin: 2px  0; color: #383d4b; }
        .tide-editor ul, .tide-editor ol { padding-left: 28px; margin: 4px 0; }
        .tide-editor li { font-size: 16px; line-height: 1.75; color: #383d4b; margin: 2px 0; }
        .tide-editor a    { color: #3d6fd4; text-decoration: underline; }
        .tide-editor mark { background-color: #ffe066; border-radius: 2px; padding: 0 2px; }
      `)}

      {/* Sub-toolbar: title + saved */}
      <View style={s.subBar}>
        <View style={s.subLeft}>
          {isWeb && (
            <>
              <TouchableOpacity style={s.backBtn} onPress={() => setView('docs')}>
                <Text style={s.backChevron}>‹</Text>
              </TouchableOpacity>
              <View style={s.barDiv} />
            </>
          )}
          {doc && (
            <View style={s.docInfo}>
              <View style={s.docInfoRow}>
                <View style={[s.dot, { backgroundColor: doc.color }]} />
                <TextInput
                  style={s.docTitle}
                  value={title}
                  onChangeText={handleTitleChange}
                  // @ts-ignore
                  outlineStyle="none"
                />
              </View>
              <Text style={s.docMeta}>{meta}</Text>
            </View>
          )}
        </View>
        <View style={s.subRight}>
          <View style={s.savedBadge}>
            {saved && <Text style={s.savedIcon}>✓</Text>}
            <Text style={s.savedTxt}>{saved ? 'Saved' : 'Saving…'}</Text>
          </View>
        </View>
      </View>

      {/* Format toolbar */}
      {isWeb ? (
        <View style={s.fmtBar}>
          {WEB_FORMATS.map(({ label, tag }) => (
            <TouchableOpacity key={label} style={s.fmtBtn} onPress={() => exec('formatBlock', tag)}>
              <Text style={[s.fmtTxt, label === 'Title' && s.fmtBold]}>{label}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.fmtDiv} />
          {FONT_SIZES.map(({ label, val }) => (
            <TouchableOpacity key={label} style={s.fmtBtn} onPress={() => exec('fontSize', val)}>
              <Text style={s.fmtTxt}>{label}</Text>
            </TouchableOpacity>
          ))}
          <View style={s.fmtDiv} />
          <TouchableOpacity style={s.fmtBtn} onPress={() => exec('bold')}>
            <Text style={[s.fmtTxt, s.fmtBold]}>B</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fmtBtn} onPress={() => exec('italic')}>
            <Text style={[s.fmtTxt, s.fmtItalic]}>I</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fmtBtn} onPress={() => exec('underline')}>
            <Text style={[s.fmtTxt, s.fmtUnderline]}>U</Text>
          </TouchableOpacity>
          <View style={s.fmtDiv} />
          <TouchableOpacity style={s.fmtBtn} onPress={() => exec('insertUnorderedList')}>
            <Text style={s.fmtTxt}>• List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fmtBtn} onPress={() => exec('insertOrderedList')}>
            <Text style={s.fmtTxt}>1. List</Text>
          </TouchableOpacity>
          <View style={s.fmtDiv} />
          <TouchableOpacity style={s.fmtBtn} onPress={() => exec('hiliteColor', '#ffe066')}>
            <Text style={[s.fmtTxt, s.fmtHighlight]}>H</Text>
          </TouchableOpacity>
          <View style={s.fmtDiv} />
          <TouchableOpacity style={s.fmtBtn} onPress={addLink}>
            <Text style={s.fmtTxt}>🔗</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Mobile: 2-row toolbar
        <View style={s.fmtBarMob}>
          {/* Row 1: heading formats */}
          <View style={s.fmtRow}>
            {MOB_FORMATS.map(({ label, format }) => (
              <TouchableOpacity
                key={label}
                style={[s.fmtBtn, activeFormat === format && s.fmtBtnActive]}
                onPress={() => applyFormat(format)}
              >
                <Text style={[s.fmtTxt, label === 'Title' && s.fmtBold, activeFormat === format && s.fmtActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Row 2: inline + lists + link */}
          <View style={s.fmtRow}>
            <TouchableOpacity style={s.fmtBtn} onPress={() => wrapWith('**', '**')}>
              <Text style={[s.fmtTxt, s.fmtBold]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fmtBtn} onPress={() => wrapWith('*', '*')}>
              <Text style={[s.fmtTxt, s.fmtItalic]}>I</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fmtBtn} onPress={() => wrapWith('__', '__')}>
              <Text style={[s.fmtTxt, s.fmtUnderline]}>U</Text>
            </TouchableOpacity>
            <View style={s.fmtDiv} />
            <TouchableOpacity
              style={[s.fmtBtn, activeFormat === 'bullet' && s.fmtBtnActive]}
              onPress={() => applyFormat('bullet')}
            >
              <Text style={[s.fmtTxt, activeFormat === 'bullet' && s.fmtActive]}>• List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.fmtBtn, activeFormat === 'ordered' && s.fmtBtnActive]}
              onPress={() => applyFormat('ordered')}
            >
              <Text style={[s.fmtTxt, activeFormat === 'ordered' && s.fmtActive]}>1. List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fmtBtn} onPress={() => wrapWith('==', '==')}>
              <Text style={[s.fmtTxt, s.fmtHighlight]}>H</Text>
            </TouchableOpacity>
            <View style={s.fmtDiv} />
            <TouchableOpacity style={[s.fmtBtn, linkBarOpen && s.fmtBtnActive]} onPress={() => { setLinkBarOpen(o => !o); setLinkUrl(''); }}>
              <Text style={[s.fmtTxt, linkBarOpen && s.fmtActive]}>🔗</Text>
            </TouchableOpacity>
          </View>
          {/* Link input row */}
          {linkBarOpen && (
            <View style={s.linkBar}>
              <TextInput
                style={s.linkInput}
                value={linkUrl}
                onChangeText={setLinkUrl}
                placeholder="https://…"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (linkUrl.trim()) wrapWith('[', `](${linkUrl.trim()})`);
                  setLinkBarOpen(false);
                  setLinkUrl('');
                }}
                // @ts-ignore
                outlineStyle="none"
              />
              <TouchableOpacity style={s.linkInsertBtn} onPress={() => {
                if (linkUrl.trim()) wrapWith('[', `](${linkUrl.trim()})`);
                setLinkBarOpen(false);
                setLinkUrl('');
              }}>
                <Text style={s.linkInsertTxt}>Insert</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Body */}
      <View style={s.body}>
        {/* Web: in-flow left sidebar */}
        {isWeb && (!outlineOpen ? (
          <View style={s.outlineClosed}>
            <TouchableOpacity onPress={() => setOutlineOpen(true)} style={s.outlineIconBtn}>
              <Text style={s.outlineIconTxt}>☰</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.outline}>
            <View style={s.outlineHead}>
              <Text style={s.outlineHeader}>OUTLINE</Text>
              <TouchableOpacity onPress={() => setOutlineOpen(false)}>
                <Text style={s.outlineClose}>‹</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {outlineEntries.map(h => (
                <TouchableOpacity key={h.key} style={[s.outlineItem, { paddingLeft: 10 + h.indent }]} onPress={h.onPress}>
                  {h.isTitleLevel && <View style={s.outlineBar} />}
                  <Text style={[s.outlineTxt, h.isTitleLevel && s.outlineTxtTitle]} numberOfLines={1}>{h.text}</Text>
                </TouchableOpacity>
              ))}
              {outlineEntries.length === 0 && <Text style={s.outlineEmpty}>No headings yet</Text>}
            </ScrollView>
          </View>
        ))}

        {/* Editor */}
        <ScrollView style={s.editorScroll} contentContainerStyle={s.editorContent}>
          <View style={s.paper}>
            {isWeb ? (
              createElement('div', {
                ref: setWebRef,
                className: 'tide-editor',
                contentEditable: true,
                suppressContentEditableWarning: true,
                onInput: handleWebInput,
                style: { outline: 'none', minHeight: 500, fontFamily: 'system-ui, -apple-system, sans-serif' },
              })
            ) : (
              lines.map((line, index) => {
                const isBullet  = line.format === 'bullet';
                const isOrdered = line.format === 'ordered';
                const num = orderedNums[index];
                return (
                  <View key={line.id} style={[s.lineRow, (isBullet || isOrdered) && s.lineRowList]}>
                    {isBullet  && <Text style={s.listPrefix}>•</Text>}
                    {isOrdered && <Text style={s.listPrefix}>{num}.</Text>}
                    <TextInput
                      ref={r => { lineRefs.current[line.id] = r; }}
                      style={[s.lineBase, LINE_STYLE[line.format]]}
                      value={line.text}
                      onChangeText={text => handleTextChange(index, text)}
                      onFocus={() => { setActiveLine(index); setLineSelection({ start: 0, end: 0 }); }}
                      onSelectionChange={e => {
                        if (index === activeLine) setLineSelection(e.nativeEvent.selection);
                      }}
                      onKeyPress={e => {
                        if (e.nativeEvent.key === 'Backspace' && line.text === '') handleBackspaceEmpty(index);
                      }}
                      // @ts-ignore web
                      onKeyDown={Platform.OS === 'web' ? (e: any) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleEnter(index); }
                        if (e.key === 'Backspace' && line.text === '') { e.preventDefault(); handleBackspaceEmpty(index); }
                      } : undefined}
                      placeholder={index === 0 && lines.length === 1 ? 'Start writing…' : ''}
                      placeholderTextColor={C.textMuted}
                      blurOnSubmit={false}
                      multiline
                      textAlignVertical="top"
                      // @ts-ignore
                      outlineStyle="none"
                    />
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Mobile: absolute overlay on the right */}
        {!isWeb && (!outlineOpen ? (
          <TouchableOpacity style={s.outlineToggleMob} onPress={() => setOutlineOpen(true)}>
            <Text style={s.outlineIconTxt}>☰</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.outlineMobOverlay}>
            <View style={s.outlineHead}>
              <Text style={s.outlineHeader}>OUTLINE</Text>
              <TouchableOpacity onPress={() => setOutlineOpen(false)}>
                <Text style={s.outlineClose}>›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {outlineEntries.map(h => (
                <TouchableOpacity
                  key={h.key}
                  style={[s.outlineItem, { paddingLeft: 10 + h.indent }]}
                  onPress={() => { h.onPress(); setOutlineOpen(false); }}
                >
                  {h.isTitleLevel && <View style={s.outlineBar} />}
                  <Text style={[s.outlineTxt, h.isTitleLevel && s.outlineTxtTitle]} numberOfLines={1}>{h.text}</Text>
                </TouchableOpacity>
              ))}
              {outlineEntries.length === 0 && <Text style={s.outlineEmpty}>No headings yet</Text>}
            </ScrollView>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap:         { flex: 1 },
  subBar:       {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 11, paddingHorizontal: 22, backgroundColor: C.toolbar,
    borderBottomWidth: 1, borderBottomColor: '#e1e5f1',
  },
  subLeft:      { flexDirection: 'row', alignItems: 'center', gap: 13, flex: 1 },
  subRight:     { flexDirection: 'row', alignItems: 'center', gap: 11 },
  backBtn:      { width: 32, height: 32, borderRadius: R.md, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  backChevron:  { fontSize: 20, color: C.primary, fontWeight: '600' },
  barDiv:       { width: 1, height: 18, backgroundColor: C.border, marginHorizontal: 2 },
  docInfo:      { flex: 1 },
  docInfoRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:          { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  docTitle:     { fontSize: 16, fontWeight: '600', color: C.text, flex: 1, outlineWidth: 0 } as any,
  docMeta:      { fontSize: 12, color: C.textMuted },
  savedBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedIcon:    { fontSize: 13, color: C.success, fontWeight: '700' },
  savedTxt:     { fontSize: 12.5, color: C.success },
  // Web format bar
  fmtBar:       {
    flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap',
    paddingVertical: 6, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#e1e5f1', backgroundColor: C.toolbar,
  },
  // Mobile format bar (2 rows)
  fmtBarMob:    { backgroundColor: C.toolbar, borderBottomWidth: 1, borderBottomColor: '#e1e5f1', flexShrink: 0, paddingVertical: 5, paddingHorizontal: 12, gap: 5 },
  fmtRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkBar:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 2 },
  linkInput:    { flex: 1, height: 32, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: R.sm, paddingHorizontal: 10, fontSize: 13, color: C.text, outlineWidth: 0 } as any,
  linkInsertBtn:{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.primary, borderRadius: R.sm },
  linkInsertTxt:{ fontSize: 12.5, fontWeight: '600', color: C.white },
  fmtBtn:       { paddingHorizontal: 9, paddingVertical: 5, borderRadius: R.sm, borderWidth: 1, borderColor: C.border },
  fmtBtnActive: { backgroundColor: C.primaryLight, borderColor: C.primary },
  fmtTxt:       { fontSize: 12.5, color: '#383d4b', fontWeight: '500' },
  fmtBold:      { fontWeight: '700' },
  fmtItalic:    { fontStyle: 'italic' },
  fmtUnderline: { textDecorationLine: 'underline' },
  fmtHighlight: { backgroundColor: '#ffe066', borderRadius: 2, overflow: 'hidden', paddingHorizontal: 2 },
  fmtActive:    { color: C.primary },
  fmtDiv:       { width: 1, height: 18, backgroundColor: C.border, marginHorizontal: 2 },
  body:              { flex: 1, flexDirection: 'row' },
  outline:           { width: 160, flexShrink: 0, backgroundColor: C.sidebarBg, borderRightWidth: 1, borderRightColor: C.border, padding: S.md },
  outlineClosed:     { width: 40, flexShrink: 0, backgroundColor: C.sidebarBg, borderRightWidth: 1, borderRightColor: C.border, alignItems: 'center', paddingTop: 12 },
  outlineToggleMob:  { position: 'absolute', right: 12, top: 12, zIndex: 10, width: 32, height: 32, borderRadius: R.md, backgroundColor: C.sidebarBg, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  outlineMobOverlay: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 190, zIndex: 20, backgroundColor: C.sidebarBg, borderLeftWidth: 1, borderLeftColor: C.border, padding: S.md },
  outlineIconBtn:    { padding: 6 },
  outlineIconTxt:    { fontSize: 16, color: C.textLabel },
  outlineHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.sm },
  outlineClose: { fontSize: 18, color: C.textMuted, paddingHorizontal: 4 },
  outlineHeader:{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: C.textLabel },
  outlineItem:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderRadius: R.md },
  outlineBar:   { width: 3, height: 16, borderRadius: 3, backgroundColor: C.primary, flexShrink: 0 },
  outlineTxt:   { fontSize: 12.5, color: '#383d4b', flex: 1 },
  outlineTxtTitle: { fontWeight: '700', color: C.primary },
  outlineEmpty: { fontSize: 11.5, color: C.textMuted, lineHeight: 18 },
  editorScroll: { flex: 1, backgroundColor: Platform.OS === 'web' ? C.bg : C.white },
  editorContent:{
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { padding: 12, paddingBottom: 60 }
      : { flexGrow: 1 }),
  },
  paper: Platform.OS === 'web' ? {
    width: 768, maxWidth: '100%',
    backgroundColor: C.white, borderWidth: 1, borderColor: '#e1e5f1',
    borderRadius: R.sm, padding: 40,
    boxShadow: '0 14px 40px -22px rgba(20,30,60,0.3)',
  } as any : {
    flex: 1, width: '100%', backgroundColor: C.white,
    padding: 16, paddingBottom: 60,
  },
  lineRow:      { flexDirection: 'row', alignItems: 'flex-start', width: '100%' },
  lineRowList:  { paddingLeft: 4 },
  listPrefix:   { fontSize: 16, lineHeight: 28, color: '#383d4b', marginTop: 2, marginRight: 6, width: 20, flexShrink: 0 },
  lineBase:     { flex: 1, outlineWidth: 0, paddingVertical: 2 } as any,
});
