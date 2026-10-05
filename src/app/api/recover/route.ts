import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  const oldUrl = process.env.POSTGRES_URL;
  if (!oldUrl) {
    return NextResponse.json({ error: 'POSTGRES_URL not found' });
  }
  try {
    const sql = neon(oldUrl);
    const rows = await sql`SELECT name, data FROM crm_collections WHERE name = 'users'`;
    return NextResponse.json({ success: true, rows });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      detail: err?.sourceError?.message || String(err),
      maskedUrl: oldUrl.replace(/:[^:@]+@/, ':***@'),
    });
  }
}
