"use client";

import { useRef } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/design-system/components/ui/field";
import { Button } from "../ui/button";
import Image from "next/image";
import { Plus, RefreshCcw } from "lucide-react";
import { Input } from "../ui/input";

type ImageSize = [number, number];

type Props<T extends FieldValues> = {
  title: string;
  name: FieldPath<T>;
  control: Control<T>;
  description?: string;
  size?: ImageSize;
  orientation?: "vertical" | "horizontal" | "responsive";
};

export const ImageField = <T extends FieldValues>({
  title,
  name,
  control,
  size,
  description,
  orientation = "vertical",
}: Props<T>) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = `image-field-${name}`;

  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { value, onChange },
        fieldState: { error, invalid },
      }) => (
        <Field orientation={orientation} data-invalid={invalid}>
          <FieldLabel htmlFor={inputId}>{title}</FieldLabel>
          <div className="flex items-center gap-2">
            {value && (
              <Image
                src={value}
                alt="thumbnail"
                width={50}
                height={50}
                className="h-[50px] w-[50px] shrink-0 rounded-md object-cover"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                fileRef.current?.click();
              }}
            >
              {value ? (
                <RefreshCcw className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
            </Button>
            <Input
              id={inputId}
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*"
              aria-invalid={invalid}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onChange("");
                // const url = await uploadFile(file);
                // onChange(url);
              }}
            />
          </div>
          {(description || size) && (
            <FieldDescription>
              {description}
              {description && size && " "}
              {size && `권장 사이즈 - ${size[0]}px x ${size[1]}px. `}
              이미지 포멧 - JPG, PNG
            </FieldDescription>
          )}
          {error && <FieldError>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
};
