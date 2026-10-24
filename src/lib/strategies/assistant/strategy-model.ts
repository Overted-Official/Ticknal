import type { AssistantTurnInput } from './assistant-turn';
import { ADVANCED_BLOCK_TEMPLATES } from '../../../components/platform/strategies/builder/advanced-strategy-model';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const SYSTEM = `You are Ticknal's Strategy Studio editing assistant. Return one JSON object with keys "message" (a concise explanation) and "actions" (an ordered array). Edit only the supplied user-owned draft. Never invent metrics, ticker prices, backtest results, proprietary strategy details, or unsupported cards. You cannot save, enable alerts, select companies, or change access. If the request is ambiguous or unsupported, explain what is missing and return an empty actions array.
Allowed action shapes:
{"type":"rename_strategy","name":"..."};
{"type":"add_simple_rule","side":"buy|sell","indicatorId":"catalog id"};
{"type":"update_simple_rule","side":"buy|sell","ruleId":"existing rule id","changes":{"period":14,"operator":"crossesAbove","value":30,"connector":"and"}};
{"type":"remove_simple_rule","side":"buy|sell","ruleId":"existing rule id"};
{"type":"set_mode","mode":"advanced"} (only on an empty simple workflow);
{"type":"add_indicator","id":"unique-card-id","indicatorId":"catalog id"};
{"type":"add_node","id":"unique-card-id","templateId":"public template id"};
{"type":"add_market_bundle","id":"unique-card-id","fields":["open","high","low","close","volume"]};
{"type":"connect","sourceId":"upstream id","targetId":"downstream id"};
{"type":"set_parameter","nodeId":"card id","key":"editable setting","value":"string"};
{"type":"rename_node","nodeId":"card id","name":"..."};
{"type":"set_output_name","nodeId":"card id","name":"..."};
{"type":"group_nodes","moduleId":"unique-group-id","name":"...","nodeIds":["id1","id2"]};
{"type":"remove_node","nodeId":"card id"}.
Use only known IDs. For advanced workflows, create cards before connecting or setting parameters. Prefer a small, valid edit over guessing. The server validates every action and compiles the result.`;

export async function generateStrategyProposal(input: AssistantTurnInput): Promise<unknown> {
  const apiKey = process.env.STRATEGY_ASSISTANT_API_KEY;
  if (!apiKey) throw new Error('Strategy assistant is not configured.');
  const model = process.env.STRATEGY_ASSISTANT_MODEL || 'openai/gpt-5.1';
  const publicCatalog = input.catalog.filter((item) => item.available).map((item) => ({
    id: item.id, name: item.name, description: item.description, category: item.category,
    parameters: item.defaultParameters, outputs: item.outputs,
  }));
  const publicTemplates = ADVANCED_BLOCK_TEMPLATES.filter((item) => item.id !== 'indicator').map((item) => ({
    id: item.id, stage: item.stage, name: item.title.en, description: item.description.en,
  }));
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(45_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 12_000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: JSON.stringify({ request: input.message, snapshot: input.snapshot, catalog: publicCatalog, templates: publicTemplates }) },
      ],
    }),
  });
  if (!response.ok) throw new Error('Strategy assistant provider is unavailable.');
  const result: unknown = await response.json();
  if (typeof result !== 'object' || !result || !('choices' in result) || !Array.isArray(result.choices)) {
    throw new Error('Strategy assistant returned an invalid response.');
  }
  const content: unknown = result.choices[0]?.message?.content;
  if (typeof content !== 'string' || content.length > 150_000) throw new Error('Strategy assistant returned an invalid response.');
  return JSON.parse(content) as unknown;
}
