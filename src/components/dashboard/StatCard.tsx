import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stat } from "@/types";

interface StatCardProps {
  stat: Stat;
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <stat.icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{stat.value}</div>
        {stat.trend && (
          <p className="text-xs text-muted-foreground pt-1">{stat.trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
