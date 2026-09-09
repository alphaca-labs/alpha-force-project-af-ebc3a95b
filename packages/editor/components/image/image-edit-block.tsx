import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Editor } from "@tiptap/react";
import * as React from "react";

interface ImageEditBlockProps {
  editor: Editor;
  close: () => void;
}

export const ImageEditBlock: React.FC<ImageEditBlockProps> = ({
  editor,
  close,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [link, setLink] = React.useState("");

  const handleClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFile = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      const insertImages = async () => {
        const contentBucket = [];
        const filesArray = Array.from(files);

        for (const file of filesArray) {
          contentBucket.push({ src: file });
        }

        editor.commands.setImages(contentBucket);
      };

      await insertImages();
      close();
    },
    [editor, close],
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (link) {
        editor.commands.setImages([{ src: link }]);
        close();
      }
    },
    [editor, link, close],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="image-link">이미지 링크 추가</Label>
        <div className="flex items-center">
          <Input
            id="image-link"
            type="url"
            required
            placeholder="https://example.com"
            value={link}
            className="grow"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setLink(e.target.value)
            }
          />
          <Button type="submit" className="ml-2 h-10">
            제출
          </Button>
        </div>
      </div>
      <Button type="button" className="w-full" onClick={handleClick}>
        컴퓨터에서 이미지 업로드
      </Button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={handleFile}
      />
    </form>
  );
};

export default ImageEditBlock;
