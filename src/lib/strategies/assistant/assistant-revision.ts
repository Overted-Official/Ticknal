export interface AssistantRevisionToken {
  readonly strategyId: string;
  readonly revision: number;
}

export function canApplyAssistantResponse(requested: AssistantRevisionToken, current: AssistantRevisionToken): boolean {
  return requested.strategyId === current.strategyId && requested.revision === current.revision;
}
