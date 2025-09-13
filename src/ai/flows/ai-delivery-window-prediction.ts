// This is an AI-powered delivery window prediction flow.
//
// The flow takes recipient information and suggests optimal delivery windows based on recipient availability.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictDeliveryWindowInputSchema = z.object({
  receiverName: z.string().describe('The name of the recipient.'),
  receiverPhone: z.string().describe('The phone number of the recipient.'),
  receiverAddress: z.string().describe('The address of the recipient.'),
  parcelDescription: z.string().describe('A description of the parcel.'),
});

export type PredictDeliveryWindowInput = z.infer<
  typeof PredictDeliveryWindowInputSchema
>;

const PredictDeliveryWindowOutputSchema = z.object({
  suggestedDeliveryWindow: z
    .string()
    .describe(
      'A suggested delivery window, including date and time, when the recipient is most likely to be available.'
    ),
  confidenceScore: z
    .number()
    .describe(
      'A confidence score between 0 and 1 indicating the likelihood of the recipient being available during the suggested delivery window.'
    ),
  reasoning: z
    .string()
    .describe(
      'Explanation of the reasoning of choosing suggested delivery window.'
    ),
});

export type PredictDeliveryWindowOutput = z.infer<
  typeof PredictDeliveryWindowOutputSchema
>;

export async function predictDeliveryWindow(
  input: PredictDeliveryWindowInput
): Promise<PredictDeliveryWindowOutput> {
  return predictDeliveryWindowFlow(input);
}

const predictDeliveryWindowPrompt = ai.definePrompt({
  name: 'predictDeliveryWindowPrompt',
  input: {schema: PredictDeliveryWindowInputSchema},
  output: {schema: PredictDeliveryWindowOutputSchema},
  prompt: `You are an AI assistant that predicts the best delivery window for a parcel based on recipient information.

  Given the following recipient details, suggest a delivery window when the recipient is most likely to be available to receive the parcel.

  Recipient Name: {{{receiverName}}}
  Recipient Phone: {{{receiverPhone}}}
  Recipient Address: {{{receiverAddress}}}
  Parcel Description: {{{parcelDescription}}}

  Consider factors such as typical working hours, weekends, and public holidays in the recipient's location.
  Also explain your reasoning for the choice of the delivery window and rate your confidence in the chosen window on a scale of 0 to 1.
  Ensure that the suggestedDeliveryWindow output is a concise string.`,
});

const predictDeliveryWindowFlow = ai.defineFlow(
  {
    name: 'predictDeliveryWindowFlow',
    inputSchema: PredictDeliveryWindowInputSchema,
    outputSchema: PredictDeliveryWindowOutputSchema,
  },
  async input => {
    const {output} = await predictDeliveryWindowPrompt(input);
    return output!;
  }
);
