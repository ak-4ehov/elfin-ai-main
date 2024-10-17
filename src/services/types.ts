// Define the structure for different content types within a message
interface TextContent {
  type: 'text';
  text: string;
}

// curretly image attached to the prompt will be ignore by ChatGPT,
// so this interface was saved for potential future use
interface ImageContent {
  type: 'image_url';
  image_url: { url: string };
}

// Union type for the possible content types
export type UserMessageContent = TextContent | ImageContent;

// Define types for message roles and the structure of each message
export type MessageRole = 'system' | 'user' | 'assistant';

// Message interface to handle user, assistant, and system messages
export interface Message {
  role: MessageRole;
  content: string | UserMessageContent[]; // user messages can have an array of content
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionElement {
  name: string;
  boundingBox: BoundingBox;
  recognizedText?: string;
}

export interface PuppeteerElement {
  cssSelector: string;
  elementType: string;
  boundingBox: BoundingBox;
  recognizedText?: string;
  attributes: Record<string, string>;
}

export interface FinalElement extends PuppeteerElement {
  name: string;
}
