import { ReactNode } from "react";

export function UbsCard({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[#162b1c] border border-[#2a4a32] rounded-lg p-4 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-[#c8e6c9] mb-3 font-['Syne',sans-serif]">{title}</h3>}
      {children}
    </div>
  );
}

export function UbsKPI({ label, value, sub, color = "#5CDB6E" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#162b1c] border border-[#2a4a32] rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-wider text-[#8aac8f] mb-1 font-['DM_Mono',monospace]">{label}</p>
      <p className="text-2xl font-bold font-['DM_Mono',monospace]" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#6b8e6f] mt-1">{sub}</p>}
    </div>
  );
}
