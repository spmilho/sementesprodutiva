import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface Profile {
  id: string;
  full_name: string;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
}

export default function FeedMentionInput({ value, onChange, onKeyDown, placeholder, className }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: profiles } = useQuery({
    queryKey: ["feed-mention-profiles"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_all_profiles");
      return (data ?? []).filter((p: Profile) => p.full_name?.trim()) as Profile[];
    },
    staleTime: 60_000,
  });

  const filtered = (profiles ?? []).filter((p) =>
    p.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 8);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart ?? val.length;
    onChange(val);

    // Check if we're in a mention context
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf("@");

    if (lastAt >= 0) {
      const charBefore = lastAt > 0 ? textBeforeCursor[lastAt - 1] : " ";
      if (charBefore === " " || charBefore === "\n" || lastAt === 0) {
        const query = textBeforeCursor.slice(lastAt + 1);
        if (!query.includes(" ") || query.length <= 30) {
          setMentionQuery(query);
          setMentionStart(lastAt);
          setShowDropdown(true);
          setSelectedIdx(0);
          return;
        }
      }
    }
    setShowDropdown(false);
  }, [onChange]);

  const insertMention = useCallback((profile: Profile) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    const mention = `@${profile.full_name.replace(/\s+/g, "_")}`;
    const newVal = before + mention + " " + after;
    onChange(newVal);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [value, mentionStart, mentionQuery, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showDropdown && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filtered[selectedIdx]);
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    onKeyDown?.(e);
  }, [showDropdown, filtered, selectedIdx, insertMention, onKeyDown]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex-1">
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {showDropdown && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {filtered.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                i === selectedIdx ? "bg-accent" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(p);
              }}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
