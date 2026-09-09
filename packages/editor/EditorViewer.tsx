import parse from "html-react-parser";
import "./styles/index.css";
import { cn } from "@repo/design-system/lib/utils";

const EditorViewer = ({
  className,
  content,
}: {
  className?: string;
  content: string;
}) => {
  return (
    <div className={cn("minimal-tiptap-editor", className)}>
      <div className={cn("ProseMirror")}>{parse(content)}</div>
    </div>
  );
};

export default EditorViewer;
