"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EditableText({
  initialValue,
  onSave,
  placeholder,
}: {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <Textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || saved}
          onClick={() => startTransition(async () => {
            await onSave(value);
            setSaved(true);
          })}
        >
          {isPending ? "Saving…" : saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
