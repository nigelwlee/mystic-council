"use client";

import { BottomTabBar, type TabId } from "./BottomTabBar";

interface DailyShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

export function DailyShell({ activeTab, onTabChange, children }: DailyShellProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0A0B14",
        display: "flex",
        flexDirection: "column",
        // Reserve space for the fixed bottom tab bar (56px + safe area)
        paddingBottom: "calc(56px + env(safe-area-inset-bottom))",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
      <BottomTabBar activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
