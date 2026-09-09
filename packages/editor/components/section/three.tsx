import { CaretDownIcon, CheckIcon } from "@radix-ui/react-icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import type { toggleVariants } from "@repo/design-system/components/ui/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@repo/design-system/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/design-system/components/ui/tooltip";
import type { Editor } from "@tiptap/react";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { useTheme } from "../../hooks/use-theme";
import { ToolbarButton } from "../toolbar-button";

interface ColorItem {
  cssVar: string;
  label: string;
  darkLabel?: string;
}

interface ColorPalette {
  label: string;
  colors: ColorItem[];
  inverse: string;
}

const COLORS: ColorPalette[] = [
  {
    label: "팔레트 1",
    inverse: "hsl(var(--background))",
    colors: [
      { cssVar: "hsl(var(--foreground))", label: "기본" },
      { cssVar: "var(--mt-accent-bold-blue)", label: "진한 파랑" },
      { cssVar: "var(--mt-accent-bold-teal)", label: "진한 청록" },
      { cssVar: "var(--mt-accent-bold-green)", label: "진한 녹색" },
      { cssVar: "var(--mt-accent-bold-orange)", label: "진한 주황" },
      { cssVar: "var(--mt-accent-bold-red)", label: "진한 빨강" },
      { cssVar: "var(--mt-accent-bold-purple)", label: "진한 보라" },
    ],
  },
  {
    label: "팔레트 2",
    inverse: "hsl(var(--background))",
    colors: [
      { cssVar: "var(--mt-accent-gray)", label: "회색" },
      { cssVar: "var(--mt-accent-blue)", label: "파랑" },
      { cssVar: "var(--mt-accent-teal)", label: "청록" },
      { cssVar: "var(--mt-accent-green)", label: "녹색" },
      { cssVar: "var(--mt-accent-orange)", label: "주황" },
      { cssVar: "var(--mt-accent-red)", label: "빨강" },
      { cssVar: "var(--mt-accent-purple)", label: "보라" },
    ],
  },
  {
    label: "팔레트 3",
    inverse: "hsl(var(--foreground))",
    colors: [
      { cssVar: "hsl(var(--background))", label: "흰색", darkLabel: "검정색" },
      { cssVar: "var(--mt-accent-blue-subtler)", label: "연한 파랑" },
      { cssVar: "var(--mt-accent-teal-subtler)", label: "연한 청록" },
      { cssVar: "var(--mt-accent-green-subtler)", label: "연한 녹색" },
      { cssVar: "var(--mt-accent-yellow-subtler)", label: "연한 노랑" },
      { cssVar: "var(--mt-accent-red-subtler)", label: "연한 빨강" },
      { cssVar: "var(--mt-accent-purple-subtler)", label: "연한 보라" },
    ],
  },
];

const MemoizedColorButton = React.memo<{
  color: ColorItem;
  isSelected: boolean;
  inverse: string;
  onClick: (value: string) => void;
}>(({ color, isSelected, inverse, onClick }) => {
  const isDarkMode = useTheme();
  const label = isDarkMode && color.darkLabel ? color.darkLabel : color.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ToggleGroupItem
          className="relative size-7 rounded-md p-0"
          value={color.cssVar}
          aria-label={label}
          style={{ backgroundColor: color.cssVar }}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault();
            onClick(color.cssVar);
          }}
        >
          {isSelected && (
            <CheckIcon
              className="absolute inset-0 m-auto size-6"
              style={{ color: inverse }}
            />
          )}
        </ToggleGroupItem>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
});

MemoizedColorButton.displayName = "MemoizedColorButton";

const MemoizedColorPicker = React.memo<{
  palette: ColorPalette;
  selectedColor: string;
  inverse: string;
  onColorChange: (value: string) => void;
}>(({ palette, selectedColor, inverse, onColorChange }) => (
  <ToggleGroup
    type="single"
    value={selectedColor}
    onValueChange={(value: string) => {
      if (value) onColorChange(value);
    }}
    className="gap-1.5"
  >
    {palette.colors.map((color, index) => (
      <MemoizedColorButton
        key={index}
        inverse={inverse}
        color={color}
        isSelected={selectedColor === color.cssVar}
        onClick={onColorChange}
      />
    ))}
  </ToggleGroup>
));

MemoizedColorPicker.displayName = "MemoizedColorPicker";

interface SectionThreeProps extends VariantProps<typeof toggleVariants> {
  editor: Editor;
}

export const SectionThree: React.FC<SectionThreeProps> = ({
  editor,
  size,
  variant,
}) => {
  const color =
    editor.getAttributes("textStyle")?.color || "hsl(var(--foreground))";
  const [selectedColor, setSelectedColor] = React.useState(color);

  const handleColorChange = React.useCallback(
    (value: string) => {
      setSelectedColor(value);
      editor.chain().setColor(value).run();
    },
    [editor],
  );

  React.useEffect(() => {
    setSelectedColor(color);
  }, [color]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ToolbarButton
          tooltip="글자색"
          aria-label="글자색"
          className="w-12"
          size={size}
          variant={variant}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            style={{ color: selectedColor }}
            aria-hidden={true}
          >
            <path d="M4 20h16" />
            <path d="m6 16 6-12 6 12" />
            <path d="M8 12h8" />
          </svg>
          <CaretDownIcon className="size-5" />
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-full">
        <div className="space-y-1.5">
          {COLORS.map((palette, index) => (
            <MemoizedColorPicker
              key={index}
              palette={palette}
              inverse={palette.inverse}
              selectedColor={selectedColor}
              onColorChange={handleColorChange}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

SectionThree.displayName = "SectionThree";

export default SectionThree;
