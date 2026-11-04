import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { sanitizeHTML } from '../../utils/sanitize';
// v1.10.11: transformación de texto (MAYÚSCULAS/minúsculas/oración/título/
// alternado/quitar espacios) compartida con la toolbar de TextInput/TextArea.
import { applyCaseMode } from '../../utils/textCase';
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
  // v1.10.11: iconos del grupo de transformación de texto.
  CaseUpper,
  CaseLower,
  CaseSensitive,
  Type,
  Shuffle,
  Eraser,
} from 'lucide-react';

function MenuBar({ editor }) {
  if (!editor) return null;

  // v1.10.11: transforma TODO el documento preservando marcas (negrita/
  // cursiva) y estructura (párrafos/listas/títulos): recorre los nodos de
  // texto y reemplaza cada uno. Los modos se aplican POR NODO — si una
  // oración está partida por una negrita, cada trozo se trata como inicio de
  // oración —; el tradeoff es aceptado a cambio de no perder formato (la
  // alternativa, pasar a texto plano, destruiría el diseño de la nota).
  const aplicarModo = (modo) => {
    const { tr, schema, doc } = editor.state;
    const cambios = [];
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const nuevo = applyCaseMode(node.text, modo);
        if (nuevo !== node.text) {
          cambios.push({ pos, nodeSize: node.nodeSize, nuevo, marks: node.marks });
        }
      }
    });
    if (!cambios.length) return;
    // De atrás hacia adelante: así los reemplazos no desplazan las
    // posiciones de los nodos que faltan por tocar.
    cambios.sort((a, b) => b.pos - a.pos);
    cambios.forEach(({ pos, nodeSize, nuevo, marks }) => {
      if (nuevo.length === 0) tr.delete(pos, pos + nodeSize);
      else tr.replaceWith(pos, pos + nodeSize, schema.text(nuevo, marks));
    });
    editor.view.dispatch(tr);
  };

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
    // v1.10.11: transformación de texto (mismos modos que la toolbar
    // TextCaseToolbar de los TextInput/TextArea — utils/textCase.js).
    { icon: CaseUpper, action: () => aplicarModo('upper'), active: false, label: 'MAYÚSCULAS' },
    { icon: CaseLower, action: () => aplicarModo('lower'), active: false, label: 'minúsculas' },
    { icon: CaseSensitive, action: () => aplicarModo('sentence'), active: false, label: 'Tipo oración' },
    { icon: Type, action: () => aplicarModo('title'), active: false, label: 'Tipo Título' },
    { icon: Shuffle, action: () => aplicarModo('alter'), active: false, label: 'aLtErNaR' },
    { icon: Eraser, action: () => aplicarModo('spaces'), active: false, label: 'Quitar espacios de más' },
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
              backgroundColor: btn.active ? 'color-mix(in srgb, var(--color-accent) 6.7%, transparent)' : 'transparent',
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
