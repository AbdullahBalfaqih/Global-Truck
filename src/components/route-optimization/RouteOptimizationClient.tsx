"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, ListOrdered, CalendarClock } from "lucide-react";
import { optimizeParcelRoute } from "@/ai/flows/ai-route-optimization";
import type { OptimizeParcelRouteInput, OptimizeParcelRouteOutput } from "@/ai/flows/ai-route-optimization";

export function RouteOptimizationClient() {
  const [formData, setFormData] = useState<OptimizeParcelRouteInput>({
    destination: "",
    deliveryQueue: [],
    parcelId: "",
  });
  const [deliveryQueueInput, setDeliveryQueueInput] = useState("");
  const [result, setResult] = useState<OptimizeParcelRouteOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "deliveryQueueInput") {
      setDeliveryQueueInput(value);
      setFormData((prev) => ({
        ...prev,
        deliveryQueue: value.split(",").map(item => item.trim()).filter(item => item),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await optimizeParcelRoute(formData);
      setResult(response);
    } catch (err) {
      console.error("Route optimization error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>AI Route Optimization</CardTitle>
          <CardDescription>
            Enter parcel details to get an AI-powered optimized route and delivery window suggestion.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parcelId">Parcel ID</Label>
                <Input
                  id="parcelId"
                  name="parcelId"
                  value={formData.parcelId}
                  onChange={handleChange}
                  placeholder="e.g., P00123"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Parcel Destination Address</Label>
                <Input
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="e.g., 123 Main St, Anytown, USA"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryQueueInput">Current Delivery Queue (comma-separated addresses)</Label>
              <Textarea
                id="deliveryQueueInput"
                name="deliveryQueueInput"
                value={deliveryQueueInput}
                onChange={handleChange}
                placeholder="e.g., 456 Oak Ave, Sometown, USA, 789 Pine Ln, Otherville, USA"
                rows={3}
              />
               <p className="text-xs text-muted-foreground">
                Provide a list of other destinations currently in the delivery queue.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ListOrdered className="mr-2 h-4 w-4" />
              )}
              Optimize Route
            </Button>
          </CardFooter>
        </form>
      </Card>

      {error && (
        <Alert variant="destructive" className="shadow-md rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && result.routeSuggestion && (
        <Card className="shadow-lg rounded-lg bg-green-50 border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-700">Optimization Successful</CardTitle>
            </div>
            <CardDescription className="text-green-600">
              Here is the suggested optimized route and delivery window:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="optimizedRoute" className="font-semibold text-green-700">Optimized Route:</Label>
              <ul className="list-decimal list-inside mt-1 space-y-1 pl-2 text-sm text-green-800">
                {result.routeSuggestion.optimizedRoute.map((stop, index) => (
                  <li key={index}>{stop}</li>
                ))}
              </ul>
            </div>
            <div>
              <Label htmlFor="suggestedDeliveryWindow" className="font-semibold text-green-700">Suggested Delivery Window:</Label>
              <p id="suggestedDeliveryWindow" className="mt-1 text-sm text-green-800 flex items-center gap-2">
                <CalendarClock className="h-4 w-4"/>
                {result.routeSuggestion.suggestedDeliveryWindow}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
