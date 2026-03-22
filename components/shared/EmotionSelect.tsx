"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmotionTag } from "@/types";

interface EmotionOption {
  value: EmotionTag;
  label: string;
  emoji: string;
}

const emotionOptions: EmotionOption[] = [
  { value: "CONFIDENT", label: "Confident", emoji: "💪" },
  { value: "ANXIOUS", label: "Anxious", emoji: "😰" },
  { value: "NEUTRAL", label: "Neutral", emoji: "😐" },
  { value: "FOMO", label: "FOMO", emoji: "😤" },
  { value: "REVENGE", label: "Revenge", emoji: "😠" },
  { value: "GREEDY", label: "Greedy", emoji: "🤑" },
  { value: "FEARFUL", label: "Fearful", emoji: "😨" },
  { value: "DISCIPLINED", label: "Disciplined", emoji: "🎯" },
  { value: "IMPULSIVE", label: "Impulsive", emoji: "⚡" },
  { value: "PATIENT", label: "Patient", emoji: "🧘" },
];

interface EmotionSelectProps {
  value?: EmotionTag | null;
  onChange: (value: EmotionTag | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function EmotionSelect({
  value,
  onChange,
  placeholder = "Select emotion…",
  disabled = false,
  className,
}: EmotionSelectProps) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(val) => {
        if (val === "__none__") {
          onChange(null);
        } else {
          onChange(val as EmotionTag);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={`bg-slate-800/60 border-slate-700 text-slate-100 focus:border-indigo-500 h-10 ${className ?? ""}`}
      >
        <SelectValue placeholder={placeholder}>
          {value
            ? (() => {
                const opt = emotionOptions.find((o) => o.value === value);
                return opt ? (
                  <span className="flex items-center gap-2">
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </span>
                ) : null;
              })()
            : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
        <SelectItem
          value="__none__"
          className="text-slate-500 hover:bg-slate-700 focus:bg-slate-700"
        >
          <span className="italic text-slate-500">None</span>
        </SelectItem>
        {emotionOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="hover:bg-slate-700 focus:bg-slate-700 text-slate-200"
          >
            <span className="flex items-center gap-2">
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
