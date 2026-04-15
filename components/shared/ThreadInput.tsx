"use client";

export function ThreadInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  if (onChange) {
    // Controlled interactive input
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        <span
          style={{
            fontFamily: "var(--font-geist-sans)",
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(245,240,232,0.3)",
          }}
        >
          {label}
        </span>
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 20,
            color: value ? "rgba(245,240,232,0.9)" : "rgba(245,240,232,0.2)",
            fontStyle: value ? "normal" : "italic",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(245,240,232,0.2)",
            outline: "none",
            padding: "4px 0 8px",
            width: "100%",
            colorScheme: "dark",
          }}
        />
      </div>
    );
  }

  // Display-only
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <span
        style={{
          fontFamily: "var(--font-geist-sans)",
          fontSize: 9,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "rgba(245,240,232,0.3)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          borderBottom: "1px solid rgba(245,240,232,0.2)",
          paddingBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: 20,
            color: value ? "rgba(245,240,232,0.9)" : "rgba(245,240,232,0.2)",
            fontStyle: value ? "normal" : "italic",
          }}
        >
          {value || placeholder || "—"}
        </span>
      </div>
    </div>
  );
}
