import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  progress?: number;
}

export default function KPICard({ title, value, icon: Icon, description, progress }: KPICardProps) {
  return (
    <Card className="kpi-card animate-fade-in">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {progress !== undefined && (
          <Progress value={progress} className="mt-3 h-1.5" />
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
