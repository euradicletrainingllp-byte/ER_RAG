import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const client = searchParams.get('client') ?? '';
    const programType = searchParams.get('program_type') ?? '';
    const audienceLevel = searchParams.get('audience_level') ?? '';

    const sb = getServiceClient();
    let query = sb
      .from('proposal_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (client) query = query.ilike('client_name', `%${client}%`);
    if (programType) query = query.eq('program_type', programType);
    if (audienceLevel) query = query.eq('audience_level', audienceLevel);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ documents: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
