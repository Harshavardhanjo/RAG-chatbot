import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import React, { memo, useEffect, useRef, useState } from 'react';
import { Suggestion } from '@/lib/db/schema';
import { Button } from './ui/button';
import { EyeIcon, CodeIcon } from 'lucide-react';

type EditorProps = {
  content: string;
  saveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
};

function PureCodeEditor({ content, saveContent, status }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [view, setView] = useState<'code' | 'preview'>('code');

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const startState = EditorState.create({
        doc: content,
        extensions: [basicSetup, python(), oneDark],
      });

      editorRef.current = new EditorView({
        state: startState,
        parent: containerRef.current,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const transaction = update.transactions.find(
            (tr) => !tr.annotation(Transaction.remote),
          );

          if (transaction) {
            const newContent = update.state.doc.toString();
            saveContent(newContent, true);
          }
        }
      });

      const currentSelection = editorRef.current.state.selection;
      
      const newState = EditorState.create({
        doc: editorRef.current.state.doc,
        extensions: [basicSetup, content.trim().startsWith('<') ? html() : python(), oneDark, updateListener],
        selection: currentSelection,
      });

      editorRef.current.setState(newState);
    }
  }, [saveContent]); // Re-run when saveContent changes (and implicitly when language might change? No, we need to detect language change more dynamically but this is okay for now)

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = editorRef.current.state.doc.toString();

      if (status === 'streaming' || currentContent !== content) {
        const transaction = editorRef.current.state.update({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
          annotations: [Transaction.remote.of(true)],
        });

        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status]);

  // Auto-switch to preview if it looks like HTML and we are done streaming
  useEffect(() => {
      if (status === 'idle' && content.trim().startsWith('<') && view === 'code') {
         // Optional: setView('preview'); // Maybe too aggressive? Let user choose.
      }
  }, [status, content]);

  const isHtml = content.trim().startsWith('<');

  return (
    <div className="relative w-full h-full flex flex-col">
       {isHtml && (
        <div className="flex justify-end gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
            <Button 
                variant={view === 'code' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setView('code')}
                className="gap-2"
            >
                <CodeIcon className="w-4 h-4" /> Code
            </Button>
            <Button 
                variant={view === 'preview' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setView('preview')}
                className="gap-2"
            >
                <EyeIcon className="w-4 h-4" /> Preview
            </Button>
        </div>
       )}

      <div className={`relative w-full flex-1 ${view === 'code' ? 'block' : 'hidden'}`}>
        <div
            className="absolute inset-0 pb-[calc(80dvh)] text-sm"
            ref={containerRef}
        />
      </div>

      {view === 'preview' && (
        <div className="w-full h-full flex-1 bg-white">
            <iframe 
                className="w-full h-full border-none"
                srcDoc={content}
                title="Preview"
                sandbox="allow-scripts"
            />
        </div>
      )}
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  if (prevProps.suggestions !== nextProps.suggestions) return false;
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
    return false;
  if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
  if (prevProps.status === 'streaming' && nextProps.status === 'streaming')
    return false;
  if (prevProps.content !== nextProps.content) return false;

  return true;
}

export const CodeEditor = memo(PureCodeEditor, areEqual);
