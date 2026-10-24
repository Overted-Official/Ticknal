import { createClient } from '../../../../lib/supabase/server';
import { getStrategyIndicatorCatalog } from '../../../../components/platform/strategies/strategy-indicator-catalog';
import { localizeIndicatorCatalog } from '../../../../components/platform/strategies/builder/strategy-builder-model';
import { canEditStrategySnapshot, type StrategyWorkspaceSnapshot } from '../../../../lib/strategies/assistant/strategy-actions';
import { runStrategyAssistantTurn } from '../../../../lib/strategies/assistant/assistant-turn';
import { generateStrategyProposal } from '../../../../lib/strategies/assistant/strategy-model';
import { isValidOpenRouterApiKey } from '../../../../lib/strategies/assistant/assistant-provider-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 150_000;
const HEADERS = { 'Cache-Control': 'private, no-store' } as const;

async function readBoundedJson(request: Request): Promise<unknown | null> {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(body)) as unknown; }
  catch { return null; }
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.STRATEGY_ASSISTANT_ENABLED !== 'true') return Response.json({ status: 'unavailable' }, { status: 404, headers: HEADERS });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ status: 'forbidden' }, { status: 403, headers: HEADERS });
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return Response.json({ status: 'unauthorized' }, { status: 401, headers: HEADERS });
    const body = await readBoundedJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ status: 'invalid', error: 'Invalid request body.' }, { status: 400, headers: HEADERS });
    const input = body as Record<string, unknown>;
    if (typeof input.message !== 'string' || input.message.length > 2000 || !canEditStrategySnapshot(input.snapshot as StrategyWorkspaceSnapshot)) {
      return Response.json({ status: 'invalid', error: 'Provide a valid user-owned draft and request.' }, { status: 400, headers: HEADERS });
    }
    if (input.providerKey !== undefined && !isValidOpenRouterApiKey(input.providerKey)) {
      return Response.json({ status: 'invalid', error: 'Provide a valid OpenRouter API key.' }, { status: 400, headers: HEADERS });
    }
    const budget = await supabase.rpc('consume_strategy_assistant_quota');
    if (budget.error) {
      console.error('[strategies/assistant] Quota check failed.', budget.error);
      return Response.json({ status: 'unavailable', error: 'Assistant quota service is unavailable.' }, { status: 503, headers: HEADERS });
    }
    if (budget.data !== true) return Response.json({ status: 'limited', error: 'Assistant request limit reached. Try again later.' }, { status: 429, headers: HEADERS });
    const catalog = localizeIndicatorCatalog(getStrategyIndicatorCatalog(), 'en');
    const providerKey = input.providerKey as string | undefined;
    const result = await runStrategyAssistantTurn(
      { snapshot: input.snapshot as StrategyWorkspaceSnapshot, message: input.message, catalog },
      (turnInput) => generateStrategyProposal(turnInput, providerKey ? { apiKey: providerKey } : undefined),
    );
    return Response.json(result, { status: result.status === 'ok' ? 200 : result.status === 'invalid' ? 422 : 503, headers: HEADERS });
  } catch (error) {
    console.error('[strategies/assistant] Request failed.', error);
    return Response.json({ status: 'unavailable', error: 'The assistant is temporarily unavailable.' }, { status: 503, headers: HEADERS });
  }
}
