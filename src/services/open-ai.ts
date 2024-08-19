import OpenAI from "openai";
import { elfinAiAssistant } from "../prompts/assistant";

const openai = new OpenAI({
  organization: process.env.ORGANIZATION,
  project: process.env.PROJECT,
  apiKey: process.env.AI_API_KEY
});

export type ElementModel = {
  name: string
  type: string
  cssSelector: string
  xpathSelector: string
  shadowDom: boolean
  verification: {
    status: boolean
    messages?: string[]
  }
}

export type PageObjectModel = {
  url: string
  elements: ElementModel[]
  error?: {
    message: string
  },
  passRate: number
  success: boolean
}

type AiResponseJSON = {
  elements: ElementModel[]
}

type DataForAnalysis = {
  url: string
  data: string
}

export async function generatePageObjectModel ({ data, url }: DataForAnalysis): Promise<PageObjectModel> {
  const passRate = 0
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: elfinAiAssistant.prompts[0].system
      },
      {
        role: "user", content: [
          { type: "text", text: elfinAiAssistant.prompts[0].user },
          { type: "text", text: `JSON Example: ${JSON.stringify(elfinAiAssistant.prompts[0].example)}` },
          { type: "text", text: data },
        ]
      }],
    response_format: { type: "json_object" }
  });

  if (!completion.choices[0].message.content) {
    return {
      url,
      elements: [],
      error: {
        message: 'Something went wrong. Please try again.'
      },
      passRate: 0,
      success: false
    }
  }
  const { elements }: AiResponseJSON = JSON.parse(completion.choices[0].message.content)
  elements.forEach(element => {
    element['verification'] = { status: false }
  })

  return { url, elements, passRate, success: true }
}

