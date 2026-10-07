import { NextResponse } from 'next/server';

import { parseContextualEvaluationRequest } from '@/lib/indicators/server/contextual-request';
import {
  ContextualAuthorizationError,
  ContextualPrimaryFrameError,
  evaluateContextualIndicators,
} from '@/lib/indicators/server/evaluate-contextual-indicators';
import { contextualIndicatorLoaders } from '@/lib/indicators/server/load-contextual-indicator-inputs';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' } as const;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: 'invalid', error: 'Request body must be valid JSON.' },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  const parsed = parseContextualEvaluationRequest(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: 'invalid', error: parsed.error },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const results = await evaluateContextualIndicators(parsed.value, contextualIndicatorLoaders, {
      calculatedAt: new Date().toISOString(), userId: user?.id ?? null,
    });
    return NextResponse.json({ status: 'ok', results }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof ContextualAuthorizationError) {
      return NextResponse.json(
        { status: 'unauthorized', error: error.message },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }
    if (error instanceof ContextualPrimaryFrameError) {
      return NextResponse.json(
        { status: 'unavailable', diagnostics: error.result.diagnostics },
        { status: 422, headers: NO_STORE_HEADERS },
      );
    }
    console.error('[indicators/evaluate] Contextual evaluation failed.', error);
    return NextResponse.json(
      { status: 'unavailable', error: 'Indicator evaluation is temporarily unavailable.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
