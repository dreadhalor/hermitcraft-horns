import { NextResponse } from 'next/server';
import { getClips } from '@/../drizzle/db';

export async function GET(request: Request) {
  try {
    const result = await getClips();
    console.log('reeeeesult', result);
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
