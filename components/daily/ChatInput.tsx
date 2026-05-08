"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";

const BORDER = "rgba(245,240,232,0.08)";
const TEXT = "#F5F0E8";
const BG = "#0A0B14";
const ACCENT = "rgba(191,168,130,1)";
const MUTED = "rgba(245,240,232,0.35)";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Share what's on your mind…",
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        borderTop: `1px solid ${BORDER}`,
        padding: "12px 20px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        backgroundColor: BG,
        position: "sticky",
        bottom: 0,
      }}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        className="rounded-none border-0 border-b h-9 bg-transparent focus-visible:ring-0 focus-visible:border-b focus-visible:border-b-[rgba(191,168,130,0.5)] text-sm"
        style={{
          color: TEXT,
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          fontSize: 15,
          flex: 1,
          borderBottom: `1px solid ${BORDER}`,
          outline: "none",
          paddingLeft: 0,
          paddingRight: 0,
        }}
      />
      <button
        onClick={onSend}
        disabled={!canSend}
        style={{
          flexShrink: 0,
          padding: "7px 16px",
          background: canSend ? ACCENT : "rgba(191,168,130,0.15)",
          color: canSend ? "#0A0B14" : MUTED,
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "var(--font-geist-mono), monospace",
          fontWeight: 600,
          border: "none",
          cursor: canSend ? "pointer" : "not-allowed",
          transition: "background 0.15s, color 0.15s",
        }}
      >
        Send
      </button>
    </div>
  );
}
