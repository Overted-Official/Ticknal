import { createClient } from '../../../../lib/supabase/server';
import { parseSavedStrategy, parseSelectedSymbols } from '../../../../lib/strategies/server/parse-saved-strategy';
import { listUserStrategies, saveUserStrategy, updateUserStrategySelection } from '../../../../lib/strategies/server/strategy-store';
import { compileSavedStrategy } from '../../../../lib/strategies/server/compile-saved-strategy';
import { MAX_STRATEGY_REQUEST_BYTES } from '../../../../lib/strategies/strategy-program';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' } as const;
const MAX_BODY_BYTES = MAX_STRATEGY_REQUEST_BYTES;

async function userId(): Promise<string | null> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user?.id ?? null;
}

async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES || !request.body) throw new RangeError('Request is too large or empty.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError('Request is too large.'); }
    chunks.push(value);
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
}

const unauthorized = () => Response.json({ status: 'unauthorized' }, { status: 401, headers });
const unavailable = () => Response.json({ status: 'unavailable', error: 'Strategy storage is temporarily unavailable.' }, { status: 503, headers });

export async function GET(): Promise<Response> {
  try {
    const owner = await userId();
    if (!owner) return unauthorized();
    return Response.json({ status: 'ok', strategies: await listUserStrategies(owner) }, { headers });
  } catch (error) { console.error('[strategies/saved] Load failed.', error); return unavailable(); }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const owner = await userId();
    if (!owner) return unauthorized();
    const body = await readJson(request);
    const parsed = parseSavedStrategy(body && typeof body === 'object' && 'strategy' in body ? body.strategy : null);
    if (!parsed.success) return Response.json({ status: 'invalid', error: parsed.error }, { status: 400, headers });
    if (parsed.value.notificationsEnabled) {
      const compiled = compileSavedStrategy(parsed.value);
      if (compiled.status !== 'ready') return Response.json({ status: 'invalid', error: `Alerts require an executable strategy: ${compiled.message}` }, { status: 400, headers });
    }
    return Response.json({ status: 'ok', strategy: await saveUserStrategy(owner, parsed.value) }, { headers });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) return Response.json({ status: 'invalid', error: error.message }, { status: error instanceof RangeError ? 413 : 400, headers });
    console.error('[strategies/saved] Save failed.', error); return unavailable();
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const owner = await userId();
    if (!owner) return unauthorized();
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || !('id' in body) || !('selectedSymbols' in body)
      || typeof body.id !== 'string' || !/^custom-[A-Za-z0-9-]{1,80}$/.test(body.id)) return Response.json({ status: 'invalid' }, { status: 400, headers });
    const symbols = parseSelectedSymbols(body.selectedSymbols);
    if (!symbols) return Response.json({ status: 'invalid' }, { status: 400, headers });
    const updated = await updateUserStrategySelection(owner, body.id, symbols);
    return Response.json({ status: updated ? 'ok' : 'not-found' }, { status: updated ? 200 : 404, headers });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) return Response.json({ status: 'invalid', error: error.message }, { status: error instanceof RangeError ? 413 : 400, headers });
    console.error('[strategies/saved] Selection update failed.', error); return unavailable();
  }
}
