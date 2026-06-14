import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = getServiceClient();
    const [docs, chunks, gen, clients] = await Promise.all([
      sb.from('proposal_documents').select('id', { count: 'exact', head: true }),
      sb.from('proposal_chunks').select('id', { count: 'exact', head: true }),
      sb.from('generated_proposals').select('id', { count: 'exact', head: true }),
      sb.from('proposal_documents').select('client_name'),
    ]);

    const uniqueClients = new Set(
      (clients.data ?? []).map((r: { client_name: string }) => r.client_name).filter(Boolean)
    ).size;

    return NextResponse.json({
      documents: docs.count ?? 0,
      chunks: chunks.count ?? 0,
      generated: gen.count ?? 0,
      clients: uniqueClients,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
