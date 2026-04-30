import type { ReactNode } from "react";

export const metadata = { title: "Mystic Council" };

export default function ProtoLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0A0B14",
        color: "#F5F0E8",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
