import type { AiMessage, AiPort } from '../../core/ports/ai'

export interface WorkersAiBinding { run(model: string, input: unknown): Promise<{ response?: unknown }> }

/**
 * Workers AI (the worker's AI binding). Models get retired (the plain 3.1 8B went on 2026-05-30): if calls start
 * failing, check the catalog. The 70B model files notes well and can be held to a JSON schema, about 7 neurons a call.
 */
export class WorkersAiClient implements AiPort {
  static readonly MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  private readonly ai: WorkersAiBinding

  constructor(ai: WorkersAiBinding) {
    this.ai = ai
  }

  async complete(input: { maxTokens: number; messages: AiMessage[]; jsonSchema?: object }) {
    const { response } = await this.ai.run(WorkersAiClient.MODEL, {
      max_tokens: input.maxTokens,
      messages: input.messages,
      ...(input.jsonSchema && { response_format: { type: 'json_schema', json_schema: input.jsonSchema } }),
    })
    // Some models hand back JSON replies already parsed, so normalise to text.
    return typeof response === 'string' ? response : response == null ? '' : JSON.stringify(response)
  }
}
