import { NextResponse } from 'next/server';
import { generateTheTicknalTakePosts } from '@/lib/news/ticknal-take-generator';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds

export async function POST(req: Request) {
  try {
    const result = await generateTheTicknalTakePosts();

    try {
      revalidatePath('/news');
      revalidatePath('/home');
      revalidatePath('/markets');
    } catch {}

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/news/ticknal-take:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
