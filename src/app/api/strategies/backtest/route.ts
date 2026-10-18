import { createClient } from '../../../../lib/supabase/server';
import { parseUniverseBacktestRequest } from '../../../../lib/strategies/server/parse-universe-backtest-request';
import { runSimpleBacktestForSymbol } from '../../../../lib/strategies/server/run-simple-backtest-for-symbol';
import { runSimpleUniverseBacktest } from '../../../../lib/strategies/server/run-simple-universe-backtest';
import { MAX_STRATEGY_REQUEST_BYTES } from '../../../../lib/strategies/strategy-program';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = MAX_STRATEGY_REQUEST_BYTES;
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

async function readBoundedJson(request: Request): Promise<
  | { readonly status: 'ok'; readonly value: unknown }
  | { readonly status: 'invalid' | 'too-large'; readonly error: string }
> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { status: 'too-large', error: 'Backtest request is too large.' };
  }
  if (!request.body) return { status: 'invalid', error: 'A JSON request body is required.' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY_BYTES) {
      await reader.cancel();
      return { status: 'too-large', error: 'Backtest request is too large.' };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { status: 'ok', value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { status: 'invalid', error: 'Request body must be valid JSON.' };
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ status: 'unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const body = await readBoundedJson(request);
    if (body.status !== 'ok') {
      return Response.json({ status: 'invalid', error: body.error }, {
        status: body.status === 'too-large' ? 413 : 400, headers: NO_STORE_HEADERS,
      });
    }
    const parsed = parseUniverseBacktestRequest(body.value);
    if (!parsed.success) {
      return Response.json({ status: 'invalid', error: parsed.error }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const result = await runSimpleUniverseBacktest(parsed.value, runSimpleBacktestForSymbol);
    return Response.json({ status: 'ok', ...result }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('[strategies/backtest] Backtest request failed.', error);
    return Response.json({ status: 'unavailable', error: 'Backtest service is temporarily unavailable.' }, {
      status: 503, headers: NO_STORE_HEADERS,
    });
  }
}
