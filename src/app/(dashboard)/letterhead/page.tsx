'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from 'next/image';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { addCertificate, addLetterTemplate, getLetterTemplates } from '@/lib/firestore';
import { LetterStyle, LetterTemplate } from '@/lib/types';

type PresetStore = {
  presets: Record<string, LetterStyle>;
  defaultPreset?: string;
};

const STYLE_PRESET_KEY = 'letterhead-style-presets-v1';

const DEFAULT_STYLE: LetterStyle = {
  fontFamily: 'Times New Roman, serif',
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  textAlign: 'left',
  fontWeight: 400,
  italic: false,
};

const PROFESSIONAL_STYLE: LetterStyle = {
  fontFamily: 'Georgia, serif',
  fontSize: 17,
  lineHeight: 1.7,
  letterSpacing: 0.1,
  textAlign: 'left',
  fontWeight: 400,
  italic: false,
};

const PRINT_READY_PRESETS: Array<{ name: string; style: LetterStyle }> = [
  {
    name: 'Classic Medical',
    style: {
      fontFamily: 'Georgia, serif',
      fontSize: 17,
      lineHeight: 1.7,
      letterSpacing: 0.1,
      textAlign: 'left',
      fontWeight: 400,
      italic: false,
    },
  },
  {
    name: 'Formal Compact',
    style: {
      fontFamily: 'Times New Roman, serif',
      fontSize: 15,
      lineHeight: 1.55,
      letterSpacing: 0,
      textAlign: 'justify',
      fontWeight: 400,
      italic: false,
    },
  },
  {
    name: 'Clear Sans',
    style: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 15,
      lineHeight: 1.6,
      letterSpacing: 0,
      textAlign: 'left',
      fontWeight: 400,
      italic: false,
    },
  },
];

const FONT_OPTIONS = [
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Noto Nastaliq Urdu', value: 'Noto Nastaliq Urdu, serif' },
];

const BUILT_IN_TEMPLATE_ID = '__professional__';

export default function LetterheadPage() {
  const { user } = useAuth();
  const branch = user?.branch || 'branch-1';
  const headerSrc = branch === 'branch-2' ? '/header-branch-2.png' : '/header-branch-1.png';
  const footerSrc = branch === 'branch-2' ? '/footer-branch-2.png' : '/footer-branch-1.jpg';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentHtml, setContentHtml] = useState('<p></p>');
  const [style, setStyle] = useState<LetterStyle>(DEFAULT_STYLE);
  const [presetStore, setPresetStore] = useState<PresetStore>({ presets: {} });
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Type your letter here. You can center/bold heading and keep body left/right aligned.',
      }),
    ],
    content: '<p></p>',
    onUpdate: ({ editor: tiptapEditor }) => {
      setContent(tiptapEditor.getText());
      setContentHtml(tiptapEditor.getHTML());
    },
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STYLE_PRESET_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PresetStore;
      const nextStore: PresetStore = {
        presets: parsed?.presets || {},
        defaultPreset: parsed?.defaultPreset,
      };
      setPresetStore(nextStore);

      if (nextStore.defaultPreset && nextStore.presets[nextStore.defaultPreset]) {
        setSelectedPreset(nextStore.defaultPreset);
        setStyle(nextStore.presets[nextStore.defaultPreset]);
      }
    } catch (err) {
      console.error('Failed to load letterhead presets:', err);
    }
  }, []);

  useEffect(() => {
    getLetterTemplates()
      .then((data) => setTemplates(data))
      .catch((err) => console.error('Failed to load templates:', err));
  }, []);

  const persistStore = (nextStore: PresetStore) => {
    setPresetStore(nextStore);
    window.localStorage.setItem(STYLE_PRESET_KEY, JSON.stringify(nextStore));
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      window.alert('Please enter a preset name.');
      return;
    }
    const nextStore: PresetStore = {
      ...presetStore,
      presets: {
        ...presetStore.presets,
        [name]: style,
      },
    };
    persistStore(nextStore);
    setSelectedPreset(name);
    setPresetName('');
  };

  const applyPreset = () => {
    if (!selectedPreset || !presetStore.presets[selectedPreset]) return;
    setStyle(presetStore.presets[selectedPreset]);
  };

  const setDefaultPreset = () => {
    if (!selectedPreset || !presetStore.presets[selectedPreset]) {
      window.alert('Please select a preset first.');
      return;
    }
    const nextStore: PresetStore = {
      ...presetStore,
      defaultPreset: selectedPreset,
    };
    persistStore(nextStore);
  };

  const applyPrintReadyPreset = (stylePreset: LetterStyle) => {
    setStyle(stylePreset);
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const applyTemplateContent = (template: {
    title?: string;
    content?: string;
    contentHtml?: string;
    style?: LetterStyle;
  }) => {
    if (template.style) setStyle(template.style);
    if (template.title) setTitle(template.title);

    if (template.contentHtml) {
      editor?.commands.setContent(template.contentHtml);
      return;
    }

    const fallbackText = template.content || '';
    const html = fallbackText
      ? `<p>${escapeHtml(fallbackText).replace(/\n/g, '<br>')}</p>`
      : '<p></p>';
    editor?.commands.setContent(html);
  };

  const useProfessionalTemplate = () => {
    const today = new Date().toLocaleDateString('en-GB');
    const html =
      `<p>Date: ${today}</p>
       <p>To,<br>Whom It May Concern</p>
       <h2 style="text-align:center;"><strong>Medical Recommendation</strong></h2>
       <p>Dear Sir/Madam,</p>
       <p>This is to certify that the above-named patient was examined at our clinic and is under medical care as advised. Kindly extend necessary consideration and support as required.</p>
       <p>Please contact the clinic for any further clarification.</p>
       <p>Sincerely,</p>
       <p>Dr. ____________________<br>Consultant Eye Surgeon</p>`;

    setStyle(PROFESSIONAL_STYLE);
    setTitle((prev) => prev || 'Medical Recommendation Letter');
    editor?.commands.setContent(html);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId) return;
    if (templateId === BUILT_IN_TEMPLATE_ID) {
      useProfessionalTemplate();
      return;
    }

    const selected = templates.find((template) => template.id === templateId);
    if (selected) {
      applyTemplateContent(selected);
    }
  };

  const handleSaveTemplate = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      window.alert('Please write content before saving a template.');
      return;
    }

    const name = window.prompt('Template name');
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    setIsSavingTemplate(true);
    try {
      const saved = await addLetterTemplate({
        name: trimmedName,
        title: title.trim() || trimmedName,
        content: trimmedContent,
        contentHtml,
        style,
        createdByUid: user?.uid || '',
        createdByName: user?.username || 'doctor',
        isActive: true,
      });
      setTemplates((prev) => [saved, ...prev]);
      setSelectedTemplateId(saved.id);
      window.alert('Template saved.');
    } catch (err) {
      console.error('Failed to save template:', err);
      window.alert('Could not save template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const editorStyle: CSSProperties = {
    fontFamily: style.fontFamily,
    fontSize: `${style.fontSize}px`,
    lineHeight: String(style.lineHeight),
    letterSpacing: `${style.letterSpacing}px`,
    textAlign: style.textAlign,
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? 'italic' : 'normal',
  };

  const handleSaveAndPrint = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      window.alert('Please enter certificate content before saving.');
      return;
    }

    const firstLine = trimmedContent.split('\n').map((line) => line.trim()).find(Boolean) || '';
    const finalTitle = title.trim() || firstLine || 'Custom Certificate';

    setIsSaving(true);
    try {
      await addCertificate({
        title: finalTitle,
        content: trimmedContent,
        contentHtml,
        createdByUid: user?.uid || '',
        createdByName: user?.username || 'doctor',
        isActive: true,
        style,
      });
      window.print();
    } catch (err) {
      console.error('Failed to save certificate:', err);
      window.alert('Could not save certificate. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 print:hidden">
          <div>
            <h1 className="text-xl font-semibold text-text">Letter Head Editor</h1>
            <p className="text-xs text-text-muted mt-0.5">Clean writing mode with compact controls.</p>
          </div>

          <div className="bg-white rounded-xl border border-border p-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title"
                className="h-9 px-3 rounded-md border border-border bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 min-w-[220px] flex-1"
              />
              <button
                onClick={useProfessionalTemplate}
                className="px-3 py-1.5 rounded-md border border-border bg-white text-text text-xs font-medium hover:bg-surface-alt transition-all cursor-pointer"
              >
                Template
              </button>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="h-9 px-2 rounded-md border border-border bg-white text-xs min-w-[170px]"
              >
                <option value="">Choose template</option>
                <option value={BUILT_IN_TEMPLATE_ID}>Professional (Built-in)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
              <button
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                className="px-3 py-1.5 rounded-md border border-border bg-white text-text text-xs font-medium hover:bg-surface-alt transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingTemplate ? 'Saving...' : 'Save Template'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-md border border-border bg-white text-text text-xs font-medium hover:bg-surface-alt transition-all cursor-pointer"
              >
                Print
              </button>
              <button
                onClick={handleSaveAndPrint}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save & Print'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-md p-1.5">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              title="Bold"
              className={`px-2 py-1 rounded text-xs font-semibold border min-w-8 text-center ${editor?.isActive('bold') ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              B
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              title="Italic"
              className={`px-2 py-1 rounded text-xs italic border min-w-8 text-center ${editor?.isActive('italic') ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              I
            </button>
            <button
              onClick={() => editor?.chain().focus().setParagraph().run()}
              title="Paragraph"
              className={`px-2 py-1 rounded text-xs font-medium border min-w-8 text-center ${editor?.isActive('paragraph') ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              P
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading"
              className={`px-2 py-1 rounded text-xs font-medium border min-w-8 text-center ${editor?.isActive('heading', { level: 2 }) ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              H2
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              title="Align Left"
              className={`px-2 py-1 rounded text-xs font-medium border min-w-8 text-center ${editor?.isActive({ textAlign: 'left' }) ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              L
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              title="Align Center"
              className={`px-2 py-1 rounded text-xs font-medium border min-w-8 text-center ${editor?.isActive({ textAlign: 'center' }) ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              C
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              title="Align Right"
              className={`px-2 py-1 rounded text-xs font-medium border min-w-8 text-center ${editor?.isActive({ textAlign: 'right' }) ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              R
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              title="Justify"
              className={`px-2 py-1 rounded text-xs font-medium border min-w-8 text-center ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              J
            </button>

              <div className="w-px h-5 bg-border mx-1" />

              <select
                value={style.fontFamily}
                onChange={(e) => setStyle((prev) => ({ ...prev, fontFamily: e.target.value }))}
                className="h-8 px-2 rounded border border-border bg-white text-xs"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>

              <input
                type="number"
                min={10}
                max={32}
                value={style.fontSize}
                onChange={(e) => setStyle((prev) => ({ ...prev, fontSize: Math.min(32, Math.max(10, Number(e.target.value) || 16)) }))}
                className="h-8 w-16 px-2 rounded border border-border bg-white text-xs"
              />

              <select
                value=""
                onChange={(e) => {
                  const selected = PRINT_READY_PRESETS.find((p) => p.name === e.target.value);
                  if (selected) applyPrintReadyPreset(selected.style);
                }}
                className="h-8 px-2 rounded border border-border bg-white text-xs"
              >
                <option value="">Quick style</option>
                {PRINT_READY_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>{preset.name}</option>
                ))}
              </select>
            </div>

            <details className="text-xs text-text-muted">
              <summary className="cursor-pointer select-none">Style Presets</summary>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2">
                <input
                  type="text"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="h-8 px-2 rounded border border-border bg-white text-xs"
                />
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  className="h-8 px-2 rounded border border-border bg-white text-xs"
                >
                  <option value="">Select preset</option>
                  {Object.keys(presetStore.presets).map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <button onClick={savePreset} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text hover:bg-surface-alt cursor-pointer">
                  Save
                </button>
                <button onClick={applyPreset} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text hover:bg-surface-alt cursor-pointer">
                  Apply
                </button>
                <button onClick={setDefaultPreset} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text hover:bg-surface-alt cursor-pointer">
                  Default
                </button>
              </div>
            </details>

            <details className="text-xs text-text-muted">
              <summary className="cursor-pointer select-none">Advanced Typography</summary>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  max={2.5}
                  value={style.lineHeight}
                  onChange={(e) => setStyle((prev) => ({ ...prev, lineHeight: Math.min(2.5, Math.max(1, Number(e.target.value) || 1.5)) }))}
                  className="h-8 px-2 rounded border border-border bg-white text-xs"
                  title="Line height"
                />
                <input
                  type="number"
                  step={0.2}
                  min={-1}
                  max={8}
                  value={style.letterSpacing}
                  onChange={(e) => setStyle((prev) => ({ ...prev, letterSpacing: Math.min(8, Math.max(-1, Number(e.target.value) || 0)) }))}
                  className="h-8 px-2 rounded border border-border bg-white text-xs"
                  title="Letter spacing"
                />
                <select
                  value={style.fontWeight}
                  onChange={(e) => setStyle((prev) => ({ ...prev, fontWeight: Number(e.target.value) as 400 | 500 | 700 }))}
                  className="h-8 px-2 rounded border border-border bg-white text-xs"
                >
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={700}>Bold</option>
                </select>
                <label className="h-8 px-2 rounded border border-border bg-white text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={style.italic}
                    onChange={(e) => setStyle((prev) => ({ ...prev, italic: e.target.checked }))}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  Italic base
                </label>
              </div>
            </details>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
          {/* Letterhead Preview — A4 size */}
          <div className="max-w-[210mm] mx-auto print:!max-w-[190mm] print:!w-[190mm] print:!mx-auto" style={{ minHeight: '297mm' }}>
            <div className="hidden print:block print:fixed print:top-[0.5in] print:bottom-[0.5in] print:left-[calc(50%-95mm)] print:border-l-2 print:border-black print:z-30" />
            <div className="hidden print:block print:fixed print:top-[0.5in] print:bottom-[0.5in] print:left-[calc(50%+95mm)] print:border-l-2 print:border-black print:z-30" />
            {/* Header Image */}
            <div className="w-full print:fixed print:top-[0.5in] print:left-1/2 print:-translate-x-1/2 print:w-[190mm] print:z-50 bg-white">
              <Image
                src={headerSrc}
                alt="Clinic Header"
                width={794}
                height={200}
                className="w-full h-auto border border-black"
                priority
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-8 min-h-[500px] print:p-0 print:pt-[268px] print:pb-[218px]">
              <div className="w-full max-w-[170mm] mx-auto flex-1">
                <div
                  className="letter-editor-shell w-full min-h-[400px] border border-slate-300 rounded-md bg-white px-6 py-8 print:border-none print:rounded-none print:bg-transparent print:p-0"
                  style={editorStyle}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>

            {/* Footer Image */}
            <div className="w-full mt-auto print:fixed print:bottom-[0.5in] print:left-1/2 print:-translate-x-1/2 print:w-[190mm] print:z-50 bg-white">
              <Image
                src={footerSrc}
                alt="Clinic Footer"
                width={794}
                height={150}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        <style jsx global>{`
          .letter-editor-shell .ProseMirror {
            min-height: 400px;
            outline: none;
            white-space: pre-wrap;
          }

          .letter-editor-shell .ProseMirror h1,
          .letter-editor-shell .ProseMirror h2,
          .letter-editor-shell .ProseMirror h3 {
            margin: 0 0 0.6em;
            line-height: 1.25;
          }

          .letter-editor-shell .ProseMirror p {
            margin: 0 0 0.75em;
          }

          .letter-editor-shell .ProseMirror p.is-editor-empty:first-child::before {
            color: #94a3b8;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }

          @media print {
            .letter-editor-shell .ProseMirror p.is-editor-empty:first-child::before {
              content: '';
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
