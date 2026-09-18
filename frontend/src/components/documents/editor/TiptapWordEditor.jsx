import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Code, Minus,
  Undo, Redo, Link as LinkIcon, ImageIcon, Table as TableIcon,
  ChevronDown, Type, Palette, Highlighter, Plus, Trash2,
  ArrowUpDown, ArrowLeftRight,
} from 'lucide-react';

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '64'];
const HEADING_OPTIONS = [
  { label: 'Paragraph', value: 0 },
  { label: 'Heading 1', value: 1 },
  { label: 'Heading 2', value: 2 },
  { label: 'Heading 3', value: 3 },
  { label: 'Heading 4', value: 4 },
];
const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169', '#3182ce', '#805ad5',
  '#ed64a6', '#f56565', '#ed8936', '#ecc94b', '#48bb78', '#4299e1',
  '#9f7aea', '#fc8181',
];

const FontSizeExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize?.replace('px', '') || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}px` };
        },
      },
    };
  },
});

function ToolbarButton({ onClick, active, disabled, children, title }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 rounded-md ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-1" />;
}

function ColorPicker({ currentColor, onSelect, icon: Icon, title }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={title}
          className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground"
        >
          <div className="flex flex-col items-center">
            <Icon className="w-3.5 h-3.5" />
            <div className="w-3.5 h-0.5 mt-0.5 rounded-full" style={{ backgroundColor: currentColor || '#000' }} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto p-2">
        <div className="grid grid-cols-6 gap-1">
          {COLORS.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => onSelect(color)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TiptapWordEditor({ content, onUpdate, editable = true }) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, HTMLAttributes: { class: 'text-primary underline cursor-pointer' } },
        underline: {},
      }),
      FontSizeExtension,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start typing your document…' }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[600px] px-8 sm:px-16 py-8',
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== undefined) {
      const currentHtml = editor.getHTML();
      if (content !== currentHtml) {
        editor.commands.setContent(content || '', false);
      }
    }
  }, [content, editor]);

  if (!editor) return null;

  const getCurrentHeading = () => {
    for (let i = 1; i <= 4; i++) {
      if (editor.isActive('heading', { level: i })) return HEADING_OPTIONS.find(h => h.value === i)?.label;
    }
    return 'Paragraph';
  };

  const handleSetLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const handleImageInsert = () => {
    const url = prompt('Enter image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-xl overflow-hidden bg-background">
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-secondary/30 overflow-x-auto">
          {/* Undo / Redo */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Heading Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                {getCurrentHeading()} <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {HEADING_OPTIONS.map(opt => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 0) editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: opt.value }).run();
                  }}
                  className={opt.value === 0
                    ? editor.isActive('paragraph') ? 'bg-primary/10' : ''
                    : editor.isActive('heading', { level: opt.value }) ? 'bg-primary/10' : ''
                  }
                >
                  <span className={opt.value > 0 ? `text-${['2xl', 'xl', 'lg', 'base'][opt.value - 1]} font-bold` : ''}>
                    {opt.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Font Size Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <Type className="w-3.5 h-3.5" />
                <span className="text-xs">{editor.getAttributes('textStyle')?.fontSize || '16'}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {FONT_SIZES.map(size => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: size }).run()}
                >
                  <span style={{ fontSize: `${Math.min(parseInt(size), 24)}px` }}>{size}px</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ToolbarDivider />

          {/* Text Formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Colors */}
          <ColorPicker
            currentColor={editor.getAttributes('textStyle')?.color}
            onSelect={(color) => editor.chain().focus().setColor(color).run()}
            icon={Palette}
            title="Text Color"
          />
          <ColorPicker
            currentColor={editor.getAttributes('highlight')?.color}
            onSelect={(color) => editor.chain().focus().toggleHighlight({ color }).run()}
            icon={Highlighter}
            title="Highlight"
          />

          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify">
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist">
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Block Elements */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code Block">
            <Code className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="w-4 h-4" />
          </ToolbarButton>

          <ToolbarDivider />

          {/* Table */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-foreground" title="Table">
                <TableIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                <Plus className="w-4 h-4 mr-2" /> Insert Table
              </DropdownMenuItem>
              {editor.isActive('table') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                    <ArrowUpDown className="w-4 h-4 mr-2" /> Add Row
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                    <ArrowLeftRight className="w-4 h-4 mr-2" /> Add Column
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Row
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Column
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Table
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Image */}
          <ToolbarButton onClick={handleImageInsert} title="Insert Image">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>

          {/* Link */}
          <ToolbarButton
            onClick={() => {
              const prev = editor.getAttributes('link').href || '';
              setLinkUrl(prev);
              setShowLinkInput(!showLinkInput);
            }}
            active={editor.isActive('link')}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>

          {showLinkInput && (
            <div className="flex items-center gap-1 ml-1">
              <input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetLink()}
                className="h-7 px-2 text-xs border border-border rounded bg-background w-48"
                autoFocus
              />
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleSetLink}>
                Apply
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-[850px] mx-auto my-4 sm:my-8 bg-card shadow-sm border border-border/50 rounded-lg min-h-[700px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
        <span>{editor.storage.characterCount?.characters?.() ?? editor.getText().length} characters</span>
        <span>{editor.storage.characterCount?.words?.() ?? editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>

      <style>{`
        .ProseMirror {
          min-height: 600px;
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1em 0;
        }
        .ProseMirror td, .ProseMirror th {
          border: 1px solid hsl(var(--border));
          padding: 8px 12px;
          position: relative;
          min-width: 80px;
        }
        .ProseMirror th {
          background: hsl(var(--secondary));
          font-weight: 600;
        }
        .ProseMirror .selectedCell {
          background: hsl(var(--primary) / 0.1);
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .ProseMirror ul[data-type="taskList"] li label {
          margin-top: 3px;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
        }
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1em;
          color: hsl(var(--muted-foreground));
        }
        .ProseMirror pre {
          background: hsl(var(--secondary));
          border-radius: 8px;
          padding: 12px 16px;
          font-family: monospace;
        }
        .ProseMirror hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  );
}
