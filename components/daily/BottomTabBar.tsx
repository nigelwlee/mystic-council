"use client";

import { BookOpen, MessageCircle, Layers } from "lucide-react";

export type TabId = "read" | "chat" | "tapestry";

const TABS: Array<{ id: TabId; label: string; Icon: React.FC<{ size?: number }> }> = [
  { id: "read",     label: "Read",     Icon: BookOpen       },
  { id: "chat",     label: "Chat",     Icon: MessageCircle  },
  { id: "tapestry", label: "Tapestry", Icon: Layers         },
];

const ACCENT = "#BFA882";
const TEXT_ACTIVE = "rgba(245,240,232,0.9)";
const TEXT_INACTIVE = "rgba(245,240,232,0.3)";

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        paddingBottom: "env(safe-area-inset-bottom)",
        backgroundColor: "#0A0B14",
        borderTop: "1px solid rgba(245,240,232,0.08)",
        display: "flex",
        zIndex: 100,
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const active = id === activeTab;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              background: "none",
              border: "none",
              borderTop: active ? `2px solid ${ACCENT}` : "2px solid transparent",
              cursor: "pointer",
              padding: 0,
              color: active ? TEXT_ACTIVE : TEXT_INACTIVE,
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={16} />
            <span
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 9,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
