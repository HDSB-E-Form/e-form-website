import type { LucideIcon } from "lucide-react";

type StatTone = "blue" | "amber" | "indigo" | "emerald" | "rose";

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: StatTone;
}

const toneStyles: Record<StatTone, { border: string; text: string; icon: string }> = {
  blue: {
    border: "border-l-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    icon: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  amber: {
    border: "border-l-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  indigo: {
    border: "border-l-indigo-500",
    text: "text-indigo-700 dark:text-indigo-400",
    icon: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  },
  emerald: {
    border: "border-l-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  rose: {
    border: "border-l-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    icon: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  },
};

const DashboardStatCard = ({ label, value, icon: Icon, tone }: DashboardStatCardProps) => {
  const styles = toneStyles[tone];

  return (
    <div className={`card-elevated border-l-4 p-4 ${styles.border}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>{label}</p>
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
    </div>
  );
};

export default DashboardStatCard;
