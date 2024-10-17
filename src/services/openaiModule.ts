import { PuppeteerElement } from './types';
import NodeCache from 'node-cache';
import PQueue from 'p-queue';
import OpenAI from "openai";

// Instantiate OpenAIApi
export const openai = new OpenAI({
  organization: process.env.ORGANIZATION,
  project: process.env.PROJECT,
  apiKey: process.env.AI_API_KEY
});

const nameCache = new NodeCache({ stdTTL: 86400 }); // 1 day TTL
const queue = new PQueue({ concurrency: 5 });

export async function generateElementName(element: PuppeteerElement): Promise<string | void> {
  return queue.add(async () => {
    const result = await actualGenerateElementName(element);
    return typeof result === 'string' ? result : 'unknown-element';
  });
}

async function actualGenerateElementName(element: PuppeteerElement): Promise<string> {
  const cacheKey = JSON.stringify({
    elementType: element.elementType,
    attributes: element.attributes,
    recognizedText: element.recognizedText,
  });

  const cachedName = nameCache.get<string>(cacheKey);
  if (cachedName) {
    return cachedName;
  }

  const promptParts: string[] = [];
  promptParts.push(`Element type: ${element.elementType}`);

  if (Object.keys(element.attributes).length > 0) {
    const attrs = Object.entries(element.attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    promptParts.push(`Attributes: ${attrs}`);
  }

  if (element.recognizedText) {
    promptParts.push(`Recognized text: "${element.recognizedText}"`);
  }

  const prompt = `Based on the following information, provide a meaningful and descriptive name for a webpage interactive element: 
  ${promptParts.join('\n')}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'text-davinci-003', // Choose appropriate model
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10, // Short and concise name
      temperature: 0.5, // Balance between creativity and accuracy
    });

    const name = response.choices[0].message.content || 'Unnamed Element';
    nameCache.set(cacheKey, name);
    return name;
    
  } catch (error) {
    console.error('Error generating name with OpenAI:', error);
    return 'Unnamed Element'; // Ensure a string is always returned
  }
}
