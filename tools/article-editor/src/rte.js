/* eslint-disable */
/* Rich text for one Text block (Tiptap). No inline styles: size, font and alignment are CSS class names only
   (fs-*, ff-*, ta-*). The same names are whitelisted by art_rich() in lib/articles.php and styled in articles.css. */
import { Editor, Mark, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

export const SIZES = [
  { v: 'normal', label: 'Normal' },
  { v: 'sm', label: 'Kecil' },
  { v: 'lg', label: 'Besar' },
  { v: 'xl', label: 'Sangat besar' },
  { v: 'display', label: 'Display' },
];
export const FONTS = [
  { v: 'default', label: 'Bawaan tema' },
  { v: 'jakarta', label: 'Plus Jakarta Sans' },
  { v: 'lilita', label: 'Lilita One' },
  { v: 'kite', label: 'Kite One' },
  { v: 'nunito', label: 'Nunito' },
  { v: 'poppins', label: 'Poppins' },
  { v: 'montserrat', label: 'Montserrat' },
  { v: 'fredoka', label: 'Fredoka' },
  { v: 'lora', label: 'Lora' },
  { v: 'playfair', label: 'Playfair Display' },
];
export const ALIGNS = ['left', 'center', 'right', 'justify'];

/** a mark that renders <span class="prefix-value"> and only accepts approved values */
function classMark(name, prefix, allowed) {
  const pick = (el) => {
    const hit = (el.getAttribute('class') || '').split(/\s+/).find((c) => c.indexOf(prefix) === 0 && allowed.indexOf(c.slice(prefix.length)) !== -1);
    return hit ? hit.slice(prefix.length) : null;
  };
  return Mark.create({
    name,
    addAttributes() {
      return {
        value: {
          default: null,
          parseHTML: pick,
          renderHTML: (a) => (a.value ? { class: prefix + a.value } : {}),
        },
      };
    },
    parseHTML() {
      return [{ tag: 'span', getAttrs: (el) => (pick(el) ? null : false) }];
    },
    renderHTML({ HTMLAttributes }) {
      return ['span', HTMLAttributes, 0];
    },
  });
}

const FontSize = classMark('fontSize', 'fs-', SIZES.map((s) => s.v).filter((v) => v !== 'normal'));
const FontFamily = classMark('fontFamily', 'ff-', FONTS.map((f) => f.v).filter((v) => v !== 'default'));

/** paragraph and heading alignment as a class (ta-center, ta-right, ta-justify); left is the default and writes nothing */
const Align = Extension.create({
  name: 'alignClass',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        align: {
          default: null,
          parseHTML: (el) => {
            const hit = (el.getAttribute('class') || '').split(/\s+/).find((c) => /^ta-(center|right|justify)$/.test(c));
            return hit ? hit.slice(3) : null;
          },
          renderHTML: (a) => (a.align ? { class: 'ta-' + a.align } : {}),
        },
      },
    }];
  },
});

export function makeEditor(host, html, cb) {
  return new Editor({
    element: host,
    content: html || '<p></p>',
    injectCSS: false, // the panel blocks <style> tags; the ProseMirror base rules ship in article-editor.css instead
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        blockquote: false, code: false, codeBlock: false, horizontalRule: false, trailingNode: false,
        link: { openOnClick: false, autolink: false, HTMLAttributes: { target: null, rel: 'noopener noreferrer', class: null } },
      }),
      FontSize,
      FontFamily,
      Align,
    ],
    editorProps: {
      attributes: { class: 'ae-rte', role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Isi teks' },
      // Word / Google Docs paste is full of style="" attributes and <style> blocks. Remove them as text before the browser parses
      // them (the panel policy would log a warning for each one). The schema still drops everything unknown afterwards.
      transformPastedHTML: (html) => html
        .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
        .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''),
    },
    onUpdate: () => cb.update && cb.update(),
    onSelectionUpdate: () => cb.selection && cb.selection(),
    onTransaction: () => cb.selection && cb.selection(),
  });
}

/** what the toolbar should show for the current selection */
export function stateOf(ed) {
  let block = 'p';
  [2, 3, 4].forEach((n) => { if (ed.isActive('heading', { level: n })) block = 'h' + n; });
  return {
    block,
    size: ed.getAttributes('fontSize').value || 'normal',
    font: ed.getAttributes('fontFamily').value || 'default',
    align: ed.getAttributes('paragraph').align || ed.getAttributes('heading').align || 'left',
    bold: ed.isActive('bold'), italic: ed.isActive('italic'), underline: ed.isActive('underline'), strike: ed.isActive('strike'),
    link: ed.isActive('link'), href: ed.getAttributes('link').href || '',
    ul: ed.isActive('bulletList'), ol: ed.isActive('orderedList'),
  };
}

export function applyBlock(ed, v) {
  // setNode replaces the attributes, so carry the current alignment over to the new paragraph or heading
  const align = ed.getAttributes('paragraph').align || ed.getAttributes('heading').align || null;
  const c = ed.chain().focus();
  if (v === 'p') c.setNode('paragraph', { align }).run();
  else c.setNode('heading', { level: parseInt(v.slice(1), 10), align }).run();
}
export function applySize(ed, v) {
  const c = ed.chain().focus();
  if (v === 'normal') c.unsetMark('fontSize').run(); else c.setMark('fontSize', { value: v }).run();
}
export function applyFont(ed, v) {
  const c = ed.chain().focus();
  if (v === 'default') c.unsetMark('fontFamily').run(); else c.setMark('fontFamily', { value: v }).run();
}
export function applyAlign(ed, v) {
  const val = v === 'left' ? null : v;
  ed.chain().focus().updateAttributes('paragraph', { align: val }).updateAttributes('heading', { align: val }).run();
}

/** saved HTML: no empty paragraphs left at the end */
export function cleanHtml(ed) {
  return ed.getHTML()
    .replace(/<a\s[^>]*>/g, (m) => m.replace(/\s(?:target|rel)="[^"]*"/g, '')) // the server adds target and rel to external links, so the editor keeps only href
    .replace(/(<p><\/p>)+$/, '') || '';
}
