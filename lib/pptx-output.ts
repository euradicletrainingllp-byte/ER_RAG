/* eslint-disable @typescript-eslint/no-explicit-any */
import PptxGenJS from 'pptxgenjs';
import type { ClientBrief } from './rag';

const NAVY = '0D1B3E';
const ORANGE = 'E8541A';
const WHITE = 'FFFFFF';
const LIGHT_GRAY = 'F5F6FA';

function addNavySlide(pptx: PptxGenJS, title: string, subtitle?: string) {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY };
  slide.addText(title, {
    x: 0.8, y: 2.8, w: 11.5, h: 1.2,
    fontSize: 34, bold: true, color: WHITE, align: 'left',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.8, y: 4.2, w: 11.5, h: 0.6,
      fontSize: 16, color: 'BBBBBB', align: 'left',
    });
  }
  // Orange accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.5, w: 1.5, h: 0.08, fill: { color: ORANGE },
  });
  return slide;
}

function addContentSlide(pptx: PptxGenJS, heading: string) {
  const slide = pptx.addSlide();
  slide.background = { color: LIGHT_GRAY };
  // Heading bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: NAVY },
  });
  slide.addText(heading, {
    x: 0.5, y: 0.15, w: 12.5, h: 0.8,
    fontSize: 20, bold: true, color: WHITE,
  });
  // Orange accent bottom-left
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.3, w: 2, h: 0.1, fill: { color: ORANGE },
  });
  return slide;
}

export async function buildProposalPptx(
  proposal: any,
  brief: ClientBrief
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';

  const today = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // 1. COVER
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  cover.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.8, w: 13.33, h: 1.7, fill: { color: ORANGE },
  });
  cover.addText('EURADICLE TRAINING LLP', {
    x: 0.8, y: 0.5, w: 11, h: 0.5,
    fontSize: 11, color: 'AAAAAA', bold: true, charSpacing: 3,
  });
  cover.addText(proposal.program_name ?? 'Training Proposal', {
    x: 0.8, y: 1.4, w: 11, h: 2.2,
    fontSize: 36, bold: true, color: WHITE,
  });
  cover.addText(proposal.program_tagline ?? '', {
    x: 0.8, y: 3.7, w: 11, h: 0.6,
    fontSize: 15, color: 'CCCCCC', italic: true,
  });
  cover.addText(`Prepared for: ${brief.clientName}`, {
    x: 0.8, y: 6.0, w: 8, h: 0.4,
    fontSize: 12, bold: true, color: WHITE,
  });
  cover.addText(today, {
    x: 0.8, y: 6.5, w: 8, h: 0.4,
    fontSize: 11, color: 'EEEEEE',
  });

  // 2. CLIENT CONTEXT
  const ctx = proposal.client_context ?? {};
  const ctxSlide = addContentSlide(pptx, '📋 Client Context');
  ctxSlide.addText('Organisation', {
    x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 12, bold: true, color: NAVY,
  });
  ctxSlide.addText(ctx.organisation ?? brief.clientName, {
    x: 0.6, y: 1.7, w: 12, h: 0.4, fontSize: 12, color: '333333',
  });
  ctxSlide.addText('Business Challenge', {
    x: 0.6, y: 2.3, w: 12, h: 0.4, fontSize: 12, bold: true, color: NAVY,
  });
  ctxSlide.addText(ctx.challenge ?? '', {
    x: 0.6, y: 2.7, w: 12, h: 1.0, fontSize: 12, color: '333333',
  });
  ctxSlide.addText('Opportunity', {
    x: 0.6, y: 3.9, w: 12, h: 0.4, fontSize: 12, bold: true, color: NAVY,
  });
  ctxSlide.addText(ctx.opportunity ?? '', {
    x: 0.6, y: 4.3, w: 12, h: 1.0, fontSize: 12, color: '333333',
  });

  // 3. LEARNING THEMES
  const themes: any[] = proposal.learning_themes ?? [];
  const themesSlide = addContentSlide(pptx, '🎨 Learning Themes');
  themes.slice(0, 4).forEach((theme: any, i: number) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 0.6 : 7.0;
    const y = 1.3 + row * 2.5;
    themesSlide.addShape(pptx.ShapeType.rect, {
      x, y, w: 5.8, h: 2.0,
      fill: { color: i % 2 === 0 ? NAVY : ORANGE },
      line: { color: i % 2 === 0 ? NAVY : ORANGE },
    });
    themesSlide.addText(theme.theme ?? '', {
      x: x + 0.2, y: y + 0.2, w: 5.4, h: 0.5,
      fontSize: 13, bold: true, color: WHITE,
    });
    themesSlide.addText(theme.description ?? '', {
      x: x + 0.2, y: y + 0.75, w: 5.4, h: 1.1,
      fontSize: 11, color: 'EEEEEE',
    });
  });

  // 4. LEARNING JOURNEY
  const journey = proposal.learning_journey ?? {};
  const jSlide = addContentSlide(pptx, '🗺️ Learning Journey');
  const phases = [
    { key: 'phase_1_awareness', label: 'Phase 1: Awareness', color: NAVY },
    { key: 'phase_2_practice', label: 'Phase 2: Practice', color: ORANGE },
    { key: 'phase_3_integration', label: 'Phase 3: Integration', color: '2E7D32' },
  ];
  phases.forEach(({ key, label, color }, i) => {
    const x = 0.6 + i * 4.2;
    jSlide.addShape(pptx.ShapeType.rect, {
      x, y: 1.3, w: 3.9, h: 0.5, fill: { color },
    });
    jSlide.addText(label, {
      x: x + 0.1, y: 1.35, w: 3.7, h: 0.4,
      fontSize: 11, bold: true, color: WHITE,
    });
    jSlide.addText(journey[key] ?? '', {
      x: x + 0.1, y: 2.0, w: 3.7, h: 4.5,
      fontSize: 11, color: '333333', valign: 'top',
    });
  });

  // 5. PROGRAM OBJECTIVES
  const objectives: string[] = proposal.program_objectives ?? [];
  const objSlide = addContentSlide(pptx, '🎯 Program Objectives');
  objectives.slice(0, 6).forEach((obj: string, i: number) => {
    objSlide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: 1.3 + i * 0.9, w: 0.35, h: 0.35,
      fill: { color: ORANGE },
    });
    objSlide.addText(obj, {
      x: 1.1, y: 1.25 + i * 0.9, w: 11.5, h: 0.5,
      fontSize: 12, color: '333333',
    });
  });

  // 6. MODULE OVERVIEW TABLE
  const modules: any[] = proposal.modules ?? [];
  const modOverview = addContentSlide(pptx, '📦 Module Overview');
  const tableData = [
    [
      { text: '#', options: { bold: true, color: WHITE, fill: { color: NAVY } } },
      { text: 'Module', options: { bold: true, color: WHITE, fill: { color: NAVY } } },
      { text: 'Duration', options: { bold: true, color: WHITE, fill: { color: NAVY } } },
      { text: 'Methodology', options: { bold: true, color: WHITE, fill: { color: NAVY } } },
    ],
    ...modules.map((m: any, i: number) => [
      { text: String(i + 1) },
      { text: m.title ?? '' },
      { text: m.duration ?? '' },
      { text: m.methodology ?? '' },
    ]),
  ];
  modOverview.addTable(tableData, {
    x: 0.5, y: 1.3, w: 12.3, h: 5.5,
    fontSize: 11,
    border: { type: 'solid', color: 'DDDDDD', pt: 0.5 },
    colW: [0.5, 4.5, 1.8, 5.5],
  });

  // 7. INDIVIDUAL MODULE SLIDES
  modules.forEach((mod: any, i: number) => {
    const mSlide = addContentSlide(pptx, `Module ${i + 1}: ${mod.title ?? ''}`);
    if (mod.duration) {
      mSlide.addText(`⏱ Duration: ${mod.duration}`, {
        x: 0.6, y: 1.3, w: 12, h: 0.4, fontSize: 11, color: ORANGE, bold: true,
      });
    }
    if (mod.objectives?.length) {
      mSlide.addText('Objectives', {
        x: 0.6, y: 1.9, w: 5.5, h: 0.4, fontSize: 12, bold: true, color: NAVY,
      });
      mod.objectives.forEach((o: string, j: number) => {
        mSlide.addText(`• ${o}`, {
          x: 0.6, y: 2.4 + j * 0.5, w: 5.5, h: 0.45, fontSize: 11, color: '333333',
        });
      });
    }
    if (mod.topics?.length) {
      mSlide.addText('Topics', {
        x: 7.0, y: 1.9, w: 5.7, h: 0.4, fontSize: 12, bold: true, color: NAVY,
      });
      mod.topics.forEach((t: string, j: number) => {
        mSlide.addText(`• ${t}`, {
          x: 7.0, y: 2.4 + j * 0.5, w: 5.7, h: 0.45, fontSize: 11, color: '333333',
        });
      });
    }
    if (mod.methodology) {
      mSlide.addText(`Methodology: ${mod.methodology}`, {
        x: 0.6, y: 6.5, w: 12, h: 0.4, fontSize: 11, color: ORANGE, italic: true,
      });
    }
  });

  // 8. COMMERCIALS
  const comm = proposal.commercial_notes ?? {};
  const commSlide = addContentSlide(pptx, '💰 Investment & Next Steps');
  const commItems = [
    ['Investment', comm.investment ?? ''],
    ['Inclusions', comm.inclusions ?? ''],
    ['Next Steps', comm.next_steps ?? ''],
  ];
  commItems.forEach(([label, value], i) => {
    commSlide.addShape(pptx.ShapeType.rect, {
      x: 0.6, y: 1.3 + i * 1.8, w: 12.1, h: 1.5,
      fill: { color: i % 2 === 0 ? NAVY : LIGHT_GRAY },
      line: { color: i % 2 === 0 ? NAVY : 'DDDDDD' },
    });
    commSlide.addText(label, {
      x: 0.9, y: 1.4 + i * 1.8, w: 3.5, h: 0.5,
      fontSize: 13, bold: true, color: i % 2 === 0 ? ORANGE : NAVY,
    });
    commSlide.addText(value, {
      x: 4.5, y: 1.4 + i * 1.8, w: 8.0, h: 1.0,
      fontSize: 12, color: i % 2 === 0 ? WHITE : '333333',
    });
  });

  // 9. THANK YOU
  addNavySlide(
    pptx,
    'Thank You',
    'Euradicle Training LLP  ·  euradicletrainingllp@gmail.com'
  );

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as unknown as Buffer;
}
