import { NextResponse } from 'next/server';
import { Clip, saveClip } from '@/../drizzle/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Clip;
    const { id, video, start, end, user, createdAt } = body;
    const result = await saveClip({ video, start, end, user });
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
