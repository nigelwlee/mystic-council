"use client";

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-geist-sans)",
        fontWeight: 400,
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: disabled ? "rgba(245,240,232,0.3)" : "rgba(245,240,232,0.9)",
        background: "transparent",
        border: `1px solid ${disabled ? "rgba(245,240,232,0.12)" : "rgba(245,240,232,0.35)"}`,
        borderRadius: 0,
        padding: "12px 28px",
        cursor: disabled ? "not-allowed" : "pointer",
        lineHeight: 1,
        transition: "border-color 0.2s ease, color 0.2s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,240,232,0.7)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,240,232,0.35)";
        }
      }}
    >
      {children}
    </button>
  );
}
