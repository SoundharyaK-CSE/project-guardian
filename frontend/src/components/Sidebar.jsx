import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Overview", end: true },
  { to: "/requirements", label: "Requirements" },
  { to: "/traceability", label: "Traceability" },
  { to: "/drift", label: "Drift" },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-line bg-panel h-screen sticky top-0 flex flex-col">
      <div className="px-5 py-6 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(139,124,246,0.6)]" />
          <span className="font-display font-semibold tracking-tight text-lg">Guardian</span>
        </div>
        <p className="text-xs text-ash mt-1 font-mono">requirement ↔ code watch</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive ? "bg-panel2 text-white" : "text-ash hover:text-white hover:bg-panel2/60"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-line text-[11px] text-ash font-mono leading-relaxed">
        "Every requirement change<br/>has consequences."
      </div>
    </aside>
  );
}
