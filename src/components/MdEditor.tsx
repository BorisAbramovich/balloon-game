import React, { useRef, useState } from "react";

interface MdEditorProps {
  initialValue?: string;
  onSave?: (content: string) => void;
  onCancel?: () => void;
}

type WrapMode = "wrap" | "linePrefix";

export const MdEditor: React.FC<MdEditorProps> = ({
  initialValue = "",
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const apply = (before: string, after = "", mode: WrapMode = "wrap", placeholder = "טקסט") => {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || placeholder;
    let newValue: string;
    let newStart: number;
    let newEnd: number;

    if (mode === "linePrefix") {
      // Find start of current line
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      newValue = value.substring(0, lineStart) + before + value.substring(lineStart);
      newStart = start + before.length;
      newEnd = end + before.length;
    } else {
      newValue = value.substring(0, start) + before + selected + after + value.substring(end);
      newStart = start + before.length;
      newEnd = newStart + selected.length;
    }

    setValue(newValue);
    // Restore focus + selection after React renders
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const ToolbarBtn: React.FC<{
    onClick: () => void;
    title: string;
    children: React.ReactNode;
  }> = ({ onClick, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="min-w-9 h-9 px-2 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded font-bold text-sm"
    >
      {children}
    </button>
  );

  return (
    <div className="w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-50 border-b border-slate-200">
        <ToolbarBtn onClick={() => apply("# ", "", "linePrefix")} title="Heading 1">H1</ToolbarBtn>
        <ToolbarBtn onClick={() => apply("## ", "", "linePrefix")} title="Heading 2">H2</ToolbarBtn>
        <ToolbarBtn onClick={() => apply("### ", "", "linePrefix")} title="Heading 3">H3</ToolbarBtn>
        <div className="w-px bg-slate-300 mx-1" />
        <ToolbarBtn onClick={() => apply("**", "**")} title="Bold"><b>B</b></ToolbarBtn>
        <ToolbarBtn onClick={() => apply("_", "_")} title="Italic"><i>I</i></ToolbarBtn>
        <ToolbarBtn onClick={() => apply("~~", "~~")} title="Strikethrough"><s>S</s></ToolbarBtn>
        <div className="w-px bg-slate-300 mx-1" />
        <ToolbarBtn onClick={() => apply("- ", "", "linePrefix")} title="Bulleted list">• List</ToolbarBtn>
        <ToolbarBtn onClick={() => apply("1. ", "", "linePrefix")} title="Numbered list">1.</ToolbarBtn>
        <ToolbarBtn onClick={() => apply("> ", "", "linePrefix")} title="Quote">❝</ToolbarBtn>
        <div className="w-px bg-slate-300 mx-1" />
        <ToolbarBtn onClick={() => apply("`", "`")} title="Inline code">{`</>`}</ToolbarBtn>
        <ToolbarBtn onClick={() => apply("[", "](https://)")} title="Link">🔗</ToolbarBtn>
      </div>

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="כתוב את פרטי המשימה כאן... ניתן להשתמש ב-Markdown"
        dir="auto"
        className="w-full h-64 p-3 outline-none resize-none font-mono text-sm text-slate-700 placeholder-slate-300"
        autoFocus
      />

      <div className="flex justify-end gap-2 p-2 bg-slate-50 border-t border-slate-100">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-200 rounded"
          >
            Cancel
          </button>
        )}
        {onSave && (
          <button
            onClick={() => onSave(value)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
};
