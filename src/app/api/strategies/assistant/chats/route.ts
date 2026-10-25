import { createClient } from '../../../../../lib/supabase/server';
import { parseChatCreate, parseChatId, parseChatRename, parseChatUpdate } from '../../../../../lib/strategies/assistant/chat-history';
import { createAssistantChat, deleteAssistantChat, getAssistantChat, listAssistantChats, renameAssistantChat, updateAssistantChat } from '../../../../../lib/strategies/server/assistant-chat-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const HEADERS = { 'Cache-Control': 'private, no-store' } as const;
const MAX_BODY_BYTES = 600_000;

async function actor(): Promise<string | null> {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user?.id ?? null;
}

function allowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function body(request: Request): Promise<unknown> {
  if (!request.body || Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new RangeError('Chat request is too large or empty.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError('Chat request is too large.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

const unavailable = () => Response.json({ status: 'unavailable', error: 'Chat history is temporarily unavailable.' }, { status: 503, headers: HEADERS });
const invalid = () => Response.json({ status: 'invalid', error: 'Invalid chat request.' }, { status: 400, headers: HEADERS });
const tooLarge = () => Response.json({ status: 'invalid', error: 'Chat request is too large.' }, { status: 413, headers: HEADERS });
const unauthorized = () => Response.json({ status: 'unauthorized' }, { status: 401, headers: HEADERS });

export async function GET(request: Request): Promise<Response> {
  if (process.env.STRATEGY_ASSISTANT_ENABLED !== 'true') return Response.json({ status: 'unavailable' }, { status: 404, headers: HEADERS });
  try {
    const userId = await actor();
    if (!userId) return unauthorized();
    const id = new URL(request.url).searchParams.get('id');
    if (id !== null) {
      const parsed = parseChatId(id);
      if (!parsed) return invalid();
      const chat = await getAssistantChat(userId, parsed);
      return Response.json({ status: chat ? 'ok' : 'not-found', chat }, { status: chat ? 200 : 404, headers: HEADERS });
    }
    return Response.json({ status: 'ok', chats: await listAssistantChats(userId) }, { headers: HEADERS });
  } catch (error) { console.error('[strategies/assistant/chats] Load failed.', error); return unavailable(); }
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.STRATEGY_ASSISTANT_ENABLED !== 'true') return Response.json({ status: 'unavailable' }, { status: 404, headers: HEADERS });
  if (!allowed(request)) return Response.json({ status: 'forbidden' }, { status: 403, headers: HEADERS });
  try {
    const userId = await actor();
    if (!userId) return unauthorized();
    const parsed = parseChatCreate(await body(request));
    if (!parsed) return invalid();
    const chat = await createAssistantChat(userId, parsed.title, parsed.snapshot);
    return chat ? Response.json({ status: 'ok', chat }, { status: 201, headers: HEADERS })
      : Response.json({ status: 'limited', error: 'The 100-chat limit is reached. Delete an old chat to continue.' }, { status: 409, headers: HEADERS });
  } catch (error) {
    if (error instanceof RangeError) return tooLarge();
    if (error instanceof SyntaxError) return invalid();
    console.error('[strategies/assistant/chats] Create failed.', error); return unavailable();
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (process.env.STRATEGY_ASSISTANT_ENABLED !== 'true') return Response.json({ status: 'unavailable' }, { status: 404, headers: HEADERS });
  if (!allowed(request)) return Response.json({ status: 'forbidden' }, { status: 403, headers: HEADERS });
  try {
    const userId = await actor();
    if (!userId) return unauthorized();
    const parsed = parseChatUpdate(await body(request));
    if (!parsed) return invalid();
    const chat = await updateAssistantChat(userId, parsed.id, parsed.expectedRevision, parsed.snapshot, parsed.messages);
    return chat ? Response.json({ status: 'ok', chat }, { headers: HEADERS })
      : Response.json({ status: 'conflict', error: 'This chat changed in another tab. Reopen it before continuing.' }, { status: 409, headers: HEADERS });
  } catch (error) {
    if (error instanceof RangeError) return tooLarge();
    if (error instanceof SyntaxError) return invalid();
    console.error('[strategies/assistant/chats] Update failed.', error); return unavailable();
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (process.env.STRATEGY_ASSISTANT_ENABLED !== 'true') return Response.json({ status: 'unavailable' }, { status: 404, headers: HEADERS });
  if (!allowed(request)) return Response.json({ status: 'forbidden' }, { status: 403, headers: HEADERS });
  try {
    const userId = await actor();
    if (!userId) return unauthorized();
    const parsed = parseChatRename(await body(request));
    if (!parsed) return invalid();
    const chat = await renameAssistantChat(userId, parsed.id, parsed.title);
    return Response.json({ status: chat ? 'ok' : 'not-found', chat }, { status: chat ? 200 : 404, headers: HEADERS });
  } catch (error) {
    if (error instanceof RangeError) return tooLarge();
    if (error instanceof SyntaxError) return invalid();
    console.error('[strategies/assistant/chats] Rename failed.', error); return unavailable();
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (process.env.STRATEGY_ASSISTANT_ENABLED !== 'true') return Response.json({ status: 'unavailable' }, { status: 404, headers: HEADERS });
  if (!allowed(request)) return Response.json({ status: 'forbidden' }, { status: 403, headers: HEADERS });
  try {
    const userId = await actor();
    if (!userId) return unauthorized();
    const id = parseChatId(new URL(request.url).searchParams.get('id'));
    if (!id) return invalid();
    const deleted = await deleteAssistantChat(userId, id);
    return Response.json({ status: deleted ? 'ok' : 'not-found' }, { status: deleted ? 200 : 404, headers: HEADERS });
  } catch (error) { console.error('[strategies/assistant/chats] Delete failed.', error); return unavailable(); }
}
