import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

export const anthropic = apiKey && apiKey !== 'coloque_depois'
  ? new Anthropic({ apiKey })
  : null

export function isAIEnabled() {
  return anthropic !== null
}
