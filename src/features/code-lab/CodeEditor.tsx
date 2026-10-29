import { useEffect, useRef } from 'react';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  EditorView,
  Decoration,
  lineNumbers,
  highlightActiveLineGutter,
  keymap,
  drawSelection,
} from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
const codeColors = HighlightStyle.define([
  { tag: tags.keyword, color: '#e9b565' },
  { tag: [tags.variableName, tags.propertyName], color: '#e8e2d8' },
  { tag: tags.function(tags.variableName), color: '#95bfdc' },
  { tag: [tags.number, tags.bool], color: '#b8cda3' },
  { tag: tags.comment, color: '#a59b8d', fontStyle: 'italic' },
  { tag: [tags.operator, tags.punctuation], color: '#c5beb2' },
]);
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
const highlight = StateEffect.define<{ line?: number; error?: boolean }>();
const highlightedLine = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    value = value.map(transaction.changes);
    for (const effect of transaction.effects)
      if (effect.is(highlight)) {
        const line = effect.value.line;
        value =
          line && line <= transaction.state.doc.lines
            ? Decoration.set([
                Decoration.line({
                  class: effect.value.error
                    ? 'code-error-line'
                    : 'code-execution-line',
                }).range(transaction.state.doc.line(line).from),
              ])
            : Decoration.none;
      }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
export default function CodeEditor({
  source,
  onChange,
  line,
  errorLine,
}: {
  source: string;
  onChange: (source: string) => void;
  line?: number;
  errorLine?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    if (!container.current) return;
    const view = new EditorView({
      parent: container.current,
      state: EditorState.create({
        doc: source,
        extensions: [
          javascript(),
          syntaxHighlighting(codeColors),
          lineNumbers(),
          highlightActiveLineGutter(),
          drawSelection(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          highlightedLine,
          EditorView.contentAttributes.of({
            'aria-label': 'Algorithm code editor',
            'aria-describedby': 'syntax-help',
          }),
          EditorView.theme(
            {
              '&': {
                backgroundColor: '#1c1c1c',
                color: '#eee9e0',
                fontSize: '12px',
                height: '100%',
              },
              '.cm-content': {
                fontFamily: 'IBM Plex Mono, monospace',
                padding: '16px 0',
              },
              '.cm-gutters': {
                backgroundColor: '#1c1c1c',
                color: '#8f887d',
                border: 'none',
              },
              '.cm-line': { padding: '0 16px', lineHeight: '1.9' },
              '.cm-cursor': { borderLeftColor: '#e9b565' },
              '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
                background: '#51422f !important',
              },
              '.cm-scroller': { overflow: 'auto' },
            },
            { dark: true },
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) change.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
    // Source changes are synchronized without recreating the editor below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== source)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: source },
      });
  }, [source]);
  useEffect(() => {
    const view = editor.current;
    const active = errorLine ?? line;
    if (view)
      view.dispatch({
        effects: [
          highlight.of({ line: active, error: errorLine !== undefined }),
          ...(active && active <= view.state.doc.lines
            ? [
                EditorView.scrollIntoView(view.state.doc.line(active).from, {
                  y: 'nearest',
                }),
              ]
            : []),
        ],
      });
  }, [line, errorLine]);
  return <div ref={container} className="code-editor" />;
}
