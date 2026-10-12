import type { GenerateContentParameters } from '@google/genai';
import { groundedResearch, researchPrompt, type CompetitorResearchInput } from '../shared/competitorResearch';
export async function researchCompetitor(input: CompetitorResearchInput, businessId: string, generate: (params: GenerateContentParameters) => Promise<any>) {
  const response = await generate({ model: 'gemini-3.8-flash', contents: researchPrompt(input),
    config: { tools: [{ googleSearch: {} }], temperature: 0.2, maxOutputTokens: 3000, httpOptions: { timeout: 60000 } } });
  const result = groundedResearch(response, input, businessId);
  return { result, tokens: Number(response?.usageMetadata?.totalTokenCount || 0) };
}
