import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { extractFile } from '@/lib/extractor';
import { classifyChunk, inferProgramType, inferAudienceLevel } from '@/lib/classifier';
import { getEmbedding } from '@/lib/gemini';

export const maxDuration = 300; // 5 min — needs Vercel Pro; fine for local dev

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const clientName = (formData.get('client_name') as string) ?? '';
    const programType = (formData.get('program_type') as string) ?? '';
    const audienceLevel = (formData.get('audience_level') as string) ?? '';
    const industry = (formData.get('industry') as string) ?? '';
    const deliveryFormat = (formData.get('delivery_format') as string) ?? '';
    const forceReingest = formData.get('force') === 'true';

    if (!clientName) return NextResponse.json({ error: 'client_name required' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;

    // Extract text chunks
    const chunks = await extractFile(buffer, filename);
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No content could be extracted from this file' }, { status: 422 });
    }

    const allText = chunks.map((c) => c.text).join(' ');
    const sb = getServiceClient();

    // Check if already ingested
    const { data: existing } = await sb
      .from('proposal_documents')
      .select('id')
      .eq('file_name', filename)
      .single();

    let docId: string;

    if (existing?.id) {
      if (!forceReingest) {
        return NextResponse.json({
          skipped: true,
          message: `'${filename}' already exists. Send force=true to re-ingest.`,
        });
      }
      // Delete old chunks
      await sb.from('proposal_chunks').delete().eq('document_id', existing.id);
      docId = existing.id;
    } else {
      const docMeta = {
        file_name: filename,
        client_name: clientName,
        program_type: programType || inferProgramType(filename, allText),
        audience_level: audienceLevel || inferAudienceLevel(filename, allText),
        industry: industry,
        delivery_format: deliveryFormat,
        file_type: filename.split('.').pop()?.toLowerCase() ?? '',
        total_slides: chunks.length,
      };
      const { data: newDoc, error: docErr } = await sb
        .from('proposal_documents')
        .insert(docMeta)
        .select('id')
        .single();
      if (docErr) throw docErr;
      docId = newDoc.id;
    }

    // Resolve metadata (use supplied or inferred)
    const resolvedProgramType = programType || inferProgramType(filename, allText);
    const resolvedAudienceLevel = audienceLevel || inferAudienceLevel(filename, allText);

    // Embed and insert chunks
    let successCount = 0;
    for (const chunk of chunks) {
      if (!chunk.text.trim()) continue;
      const slideType = classifyChunk(chunk.title, chunk.body);
      const embedding = await getEmbedding(chunk.text);
      if (!embedding) continue;

      const { error: chunkErr } = await sb.from('proposal_chunks').insert({
        document_id: docId,
        slide_number: chunk.slideNumber,
        slide_type: slideType,
        title: chunk.title,
        body: chunk.body,
        text_content: chunk.text,
        embedding,
        client_name: clientName,
        program_type: resolvedProgramType,
        audience_level: resolvedAudienceLevel,
        industry,
        delivery_format: deliveryFormat,
      });
      if (!chunkErr) successCount++;
    }

    // Update doc chunk count
    await sb
      .from('proposal_documents')
      .update({ total_slides: successCount })
      .eq('id', docId);

    return NextResponse.json({
      success: true,
      filename,
      totalChunks: chunks.length,
      storedChunks: successCount,
      docId,
    });
  } catch (e: unknown) {
    console.error('Ingest error:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
