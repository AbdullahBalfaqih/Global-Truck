import { RouteOptimizationClient } from "@/components/route-optimization/RouteOptimizationClient";

export default function RouteOptimizationPage() {
  return (
     <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">AI Route Optimization</h1>
      <RouteOptimizationClient />
    </div>
  );
}
