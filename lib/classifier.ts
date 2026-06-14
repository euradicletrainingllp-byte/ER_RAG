export type SlideType =
  | 'cover'
  | 'context'
  | 'competencies'
  | 'journey'
  | 'objectives'
  | 'module_overview'
  | 'module_outline'
  | 'commercials'
  | 'other';

export function classifyChunk(title: string, body: string): SlideType {
  const t = (title + ' ' + body).toLowerCase();

  if (/\b(cover|title page|proposal for|hello|good morning|dear)\b/.test(t)) return 'cover';
  if (/\b(commerc|investment|fee|cost|pricing|budget|payment)\b/.test(t)) return 'commercials';
  if (/\b(module\s+\d|session\s+\d|day\s+\d|unit\s+\d|workshop\s+\d)\b/.test(t)) return 'module_outline';
  if (/\b(module overview|program overview|summary of module|course overview)\b/.test(t)) return 'module_overview';
  if (/\b(objective|goal|outcome|by the end|participant will|you will)\b/.test(t)) return 'objectives';
  if (/\b(journey|pathway|timeline|phase|stage|roadmap|learning arc)\b/.test(t)) return 'journey';
  if (/\b(competenc|capabilit|framework|behavior|behaviour|mindset)\b/.test(t)) return 'competencies';
  if (/\b(context|background|about|overview of|landscape|situation|challenge)\b/.test(t)) return 'context';

  return 'other';
}

export function inferProgramType(filename: string, text: string): string {
  const s = (filename + ' ' + text).toLowerCase();
  if (/leadership|manag|leader/.test(s)) return 'leadership';
  if (/communicat|present|storytell/.test(s)) return 'communication';
  if (/client|customer|account|sales/.test(s)) return 'client_skills';
  if (/culture|value|transform|inclusion/.test(s)) return 'culture';
  if (/domain|technical|functional/.test(s)) return 'domain';
  if (/career|coach|mentor|develop/.test(s)) return 'career';
  if (/assess|evaluat|center|AC\/DC/.test(s)) return 'assessment';
  return 'leadership';
}

export function inferAudienceLevel(filename: string, text: string): string {
  const s = (filename + ' ' + text).toLowerCase();
  if (/senior leader|c-suite|cxo|vp|vice president|director/.test(s)) return 'Senior Leaders';
  if (/l5|l6|l7|band 5|band 6|band 7|manager|mid.senior/.test(s)) return 'L5-L6';
  if (/l3|l4|band 3|band 4|officer|executive/.test(s)) return 'L3-L4';
  if (/l1|l2|band 1|band 2|junior|entry/.test(s)) return 'L1-L2';
  return 'All Levels';
}
