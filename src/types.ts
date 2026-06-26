export interface TextBlock { type: 'text'; content: string }
export interface BulletsBlock { type: 'bullets'; items: string[] }
export interface CheckboxBlock { type: 'checkbox'; items: Array<{ text: string; checked: boolean }> }
export interface ImageBlock { type: 'image'; uri: string; label: string; layout: 'single' | 'split'; uri2?: string; label2?: string }
export type Block = TextBlock | BulletsBlock | CheckboxBlock | ImageBlock;

export interface Tag {
  id: string;
  name: string;
  color: string;
  isPredefined: boolean;
}

export interface Section {
  id: string;
  title: string;
  date: string;        // YYYY-MM-DD
  createdAt: string;   // ISO datetime
  isReminder: boolean;
  reminderDate?: string;
  isPinned: boolean;
  blocks: Block[];
  tags: Tag[];
}

export interface TideDocument {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

export type AppView = 'stream' | 'docs' | { type: 'editor'; docId: string };
