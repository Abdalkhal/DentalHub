import React from "react";

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 shadow-soft space-y-2">
      {children}
    </div>
  );
}
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display font-bold text-sm mb-2">{children}</h3>;
}
