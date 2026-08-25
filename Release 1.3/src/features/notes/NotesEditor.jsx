import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { sanitizeHTML } from '../../utils/sanitize';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';

function MenuBar({ editor }) {
  if (!editor) return null;

  const buttons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), label: 'Negrita' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), label: 'Cursiva' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), label: 'Subrayado' },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), label: 'Tachado' },
    { type: 'divider' },
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), label: 'Titulo 1' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'Titulo 2' },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'Titulo 3' },
    { type: 'divider' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), label: 'Lista' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), label: 'Lista ordenada' },
    { type: 'divider' },
    { icon: LinkIcon, action: () => {
        const prevUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', prevUrl || 'https://');
        if (url === null) return;
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }, active: editor.isActive('link'), label: 'Link' },
    { type: 'divider' },
    { icon: Undo, action: () => editor.chain().focus().undo().run(), active: false, label: 'Deshacer' },
    { icon: Redo, action: () => editor.chain().focus().redo().run(), active: false, label: 'Rehacer' },
  ];

  return (
    <div
      className="flex items-center gap-0.5 p-1.5 rounded-t-md flex-wrap"
      style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
    >
      {buttons.map((btn, i) => {
        if (btn.type === 'divider') {
          return <div key={i} className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--color-border)' }} />;
        }
        const Icon = btn.icon;
        return (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            className="p-1 rounded transition-colors hover:bg-white/5"
            style={{
              color: btn.active ? 'var(--color-accent)' : 'var(--color-text-muted)',
              backgroundColor: btn.active ? 'var(--color-accent)11' : 'transparent',
            }}
            title={btn.label}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}

export default function NotesEditor({ content, onChange, placeholder = 'Escribe tu nota...' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
      }),
      Placeholder.configure({ placeholder }),
      Underline,
    ],
    content: sanitizeHTML(content || ''),
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(sanitizeHTML(content || ''), false);
    }
  }, [content, editor]);

  return (
    <div
      className="rounded-md"
      style={{
        backgroundColor: 'var(--color-surface2)',
        border: '1px solid var(--color-border)',
      }}
    >
      <MenuBar editor={editor} />
      <div
        className="p-3 min-h-[200px] prose prose-sm max-w-none"
        style={{ color: 'var(--color-text)' }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
