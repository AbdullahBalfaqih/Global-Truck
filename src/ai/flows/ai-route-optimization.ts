// This is an AI-powered route optimization flow.
// It suggests the optimal route for a parcel based on its destination and other parcels in the delivery queue.
// It also suggests appropriate delivery windows using a tool to predict when recipients are available to receive the package.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeParcelRouteInputSchema = z.object({
  destination: z.string().describe('The destination address of the parcel.'),
  deliveryQueue: z.array(z.string()).describe('An array of destination addresses for other parcels in the delivery queue.'),
  parcelId: z.string().describe('The ID of the parcel to optimize the route for.'),
});
export type OptimizeParcelRouteInput = z.infer<typeof OptimizeParcelRouteInputSchema>;

const RouteSuggestionSchema = z.object({
  optimizedRoute: z.array(z.string()).describe('An array of destination addresses representing the optimized delivery route.'),
  suggestedDeliveryWindow: z.string().describe('A suggested delivery window for the parcel.'),
});

const OptimizeParcelRouteOutputSchema = z.object({
  routeSuggestion: RouteSuggestionSchema.describe('The route suggestion based on the destination and delivery queue.'),
});
export type OptimizeParcelRouteOutput = z.infer<typeof OptimizeParcelRouteOutputSchema>;

export async function optimizeParcelRoute(input: OptimizeParcelRouteInput): Promise<OptimizeParcelRouteOutput> {
  return optimizeParcelRouteFlow(input);
}

const predictRecipientAvailability = ai.defineTool({
  name: 'predictRecipientAvailability',
  description: 'Predicts when a recipient is available to receive a package at a given address.',
  inputSchema: z.object({
    address: z.string().describe('The delivery address.'),
  }),
  outputSchema: z.string().describe('A time window when the recipient is likely to be available.'),
},
async (input) => {
    // This is a placeholder implementation.
    // In a real application, this would call an API or use a machine learning model to predict recipient availability.
    // For demonstration purposes, we simply return a fixed time window.
    return 'Between 2PM and 5PM';
  }
);

const prompt = ai.definePrompt({
  name: 'optimizeParcelRoutePrompt',
  input: {schema: OptimizeParcelRouteInputSchema},
  output: {schema: OptimizeParcelRouteOutputSchema},
  tools: [predictRecipientAvailability],
  prompt: `You are an AI assistant specialized in route optimization for parcel delivery services.

  Given the destination of a parcel and the current delivery queue, you will suggest the optimal route to minimize transit times and improve delivery efficiency.
  You will also use the predictRecipientAvailability tool to suggest an appropriate delivery window for the parcel.

  Parcel Destination: {{{destination}}}
  Delivery Queue: {{{deliveryQueue}}}

  Instructions:
  1. Analyze the delivery queue and the destination of the parcel.
  2. Determine the optimal route that minimizes the total travel distance and time.
  3. Use the predictRecipientAvailability tool to predict when the recipient is available to receive the package at the destination.
  4. Provide the optimized route as an array of destination addresses in the suggested order.
  5. Provide a suggested delivery window for the parcel.

  Output the optimized route and suggested delivery window in JSON format.
  `, 
});

const optimizeParcelRouteFlow = ai.defineFlow(
  {
    name: 'optimizeParcelRouteFlow',
    inputSchema: OptimizeParcelRouteInputSchema,
    outputSchema: OptimizeParcelRouteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

