import { getServiceClient } from './supabase';
import { generateContent } from './gemini';

export interface ClientBrief {
  clientName: string;
  industry: string;
  audienceLevel: string;
  programType: string;
  deliveryFormat: string;
  duration: string;
  numParticipants: number;
  numModules: number;
  capabilityGaps: string;
  additionalNotes: string;
}

interface RetrievedChunk {
  id: string;
  slide_type: string;
  title: string;
  body: string;
  text_content: string;
  similarity: number;
}

interface RetrievedContext {
  modules: RetrievedChunk[];
  objectives: RetrievedChunk[];
  journeys: RetrievedChunk[];
  contexts: RetrievedChunk[];
}

export async function retrieveContext(
  queryEmbedding: number[],
  brief: ClientBrief
): Promise<RetrievedContext> {
  const sb = getServiceClient();

  async function query(matchCount: number, slideType?: string): Promise<RetrievedChunk[]> {
    const { data, error } = await sb.rpc('match_proposal_chunks', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter_program_type: brief.programType ?? '',
      filter_audience_level: brief.audienceLevel ?? '',
      filter_industry: brief.industry ?? '',
    });
    if (error) {
      console.error('RPC error:', error);
      return [];
    }
    const rows = (data as RetrievedChunk[]) ?? [];
    return slideType ? rows.filter((r) => r.slide_type === slideType) : rows;
  }

  const [allChunks] = await Promise.all([query(30)]);

  return {
    modules: allChunks.filter((c) => c.slide_type === 'module_outline').slice(0, 8),
    objectives: allChunks.filter((c) => c.slide_type === 'objectives').slice(0, 5),
    journeys: allChunks.filter((c) => c.slide_type === 'journey').slice(0, 3),
    contexts: allChunks.filter((c) => c.slide_type === 'context').slice(0, 3),
  };
}

function buildPrompt(brief: ClientBrief, ctx: RetrievedContext): string {
  const fmt = (chunks: RetrievedChunk[]) =>
    chunks.map((c, i) => `[${i + 1}] ${c.title}\n${c.text_content}`).join('\n\n');

  return `You are a senior learning & development consultant at Euradicle Training LLP.
Create a detailed, tailored training proposal as a JSON object.

## CLIENT BRIEF
- Client: ${brief.clientName}
- Industry: ${brief.industry}
- Audience Level: ${brief.audienceLevel}
- Program Type: ${brief.programType}
- Delivery Format: ${brief.deliveryFormat}
- Duration: ${brief.duration}
- Participants: ${brief.numParticipants}
- Desired Modules: ${brief.numModules}
- Capability Gaps: ${brief.capabilityGaps}
- Additional Notes: ${brief.additionalNotes || 'None'}

## RETRIEVED CONTEXT FROM PAST PROPOSALS
### Module Examples
${fmt(ctx.modules) || 'None retrieved'}

### Objective Examples
${fmt(ctx.objectives) || 'None retrieved'}

### Journey Examples
${fmt(ctx.journeys) || 'None retrieved'}

### Context Examples
${fmt(ctx.contexts) || 'None retrieved'}

## OUTPUT — Return ONLY this JSON (no markdown fences):
{
  "program_name": "string — catchy, specific to client",
  "program_tagline": "string — one-line brand statement",
  "client_context": {
    "organisation": "string",
    "challenge": "string — 2-3 sentences on the business challenge",
    "opportunity": "string — what this program unlocks"
  },
  "learning_themes": [
    { "theme": "string", "description": "string — one sentence" }
  ],
  "learning_journey": {
    "phase_1_awareness": "string — what participants explore",
    "phase_2_practice": "string — how they apply it",
    "phase_3_integration": "string — how they embed it"
  },
  "program_objectives": ["string", "string", "string", "string", "string"],
  "modules": [
    {
      "title": "string",
      "duration": "string — e.g. 4 hours",
      "objectives": ["string", "string"],
      "topics": ["string", "string", "string"],
      "methodology": "string — e.g. Case study + role play + reflection"
    }
  ],
  "commercial_notes": {
    "investment": "string — indicative fee range",
    "inclusions": "string — what's included",
    "next_steps": "string — proposed action"
  }
}

Generate exactly ${brief.numModules} modules. Tailor everything specifically to ${brief.clientName} in the ${brief.industry} industry.`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runRagPipeline(brief: ClientBrief, queryEmbedding: number[]): Promise<any> {
  const ctx = await retrieveContext(queryEmbedding, brief);
  const prompt = buildPrompt(brief, ctx);
  const rawJson = await generateContent(prompt);

  // Strip markdown fences if present
  const cleaned = rawJson
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  const proposal = JSON.parse(cleaned);

  // Attach meta
  proposal._meta = {
    sourceChunkIds: ctx.modules.map((c) => c.id),
    clientBrief: brief,
  };

  return proposal;
}
