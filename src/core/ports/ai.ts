// A chat completion from a language model, optionally held to a JSON schema. Returns the reply as text.
export interface AiMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface AiPort {
  complete(input: { maxTokens: number; messages: AiMessage[]; jsonSchema?: object }): Promise<string>
}
