import { NextRequest, NextResponse } from 'next/server';
import { getEmbedding } from '@/lib/gemini';
import { runRagPipeline, type ClientBrief } from '@/lib/rag';
import { buildProposalPptx } from '@/lib/pptx-output';
import { getServiceClient } from '@/lib/supabase';

export const maxDuration = 300; // needs Vercel Pro; fine locally

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const brief: ClientBrief = {
      clientName: body.clientName ?? '',
      industry: body.industry ?? '',
      audienceLevel: body.audienceLevel ?? 'All Levels',
      programType: body.programType ?? 'leadership',
      deliveryFormat: body.deliveryFormat ?? 'ILT',
      duration: body.duration ?? '2 days',
      numParticipants: Number(body.numParticipants ?? 30),
      numModules: Number(body.numModules ?? 5),
      capabilityGaps: body.capabilityGaps ?? '',
      additionalNotes: body.additionalNotes ?? '',
    };

    if (!brief.clientName || !brief.capabilityGaps) {
      return NextResponse.json(
        { error: 'clientName and capabilityGaps are required' },
        { status: 400 }
      );
    }

    // 1. Embed the query
    const queryText = `${brief.capabilityGaps}\n${brief.programType}\n${brief.industry}\nAudience: ${brief.audienceLevel}`;
    const embedding = await getEmbedding(queryText);
    if (!embedding) throw new Error('Failed to generate embedding — check GEMINI_API_KEY');

    // 2. RAG pipeline → proposal JSON
    const proposal = await runRagPipeline(brief, embedding);

    // 3. Build PPTX
    const pptxBuffer = await buildProposalPptx(proposal, brief);
    const pptxBase64 = pptxBuffer.toString('base64');

    // 4. Save to generated_proposals table
    try {
      const sb = getServiceClient();
      const meta = proposal._meta ?? {};
      await sb.from('generated_proposals').insert({
        client_name: brief.clientName,
        industry: brief.industry,
        audience_level: brief.audienceLevel,
        delivery_format: brief.deliveryFormat,
        duration: brief.duration,
        capability_gaps: brief.capabilityGaps,
        program_type: brief.programType,
        generated_content: Object.fromEntries(
          Object.entries(proposal).filter(([k]) => k !== '_meta')
        ),
        source_chunk_ids: meta.sourceChunkIds ?? [],
      });
    } catch (saveErr) {
      console.warn('Could not save to generated_proposals:', saveErr);
    }

    // Strip internal meta before returning
    const { _meta, ...cleanProposal } = proposal;
    void _meta;

    return NextResponse.json({ proposal: cleanProposal, pptxBase64 });
  } catch (e: unknown) {
    console.error('Generate error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
