'use client';
import { useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Module { title: string; duration: string; objectives: string[]; topics: string[]; methodology: string; }
interface Proposal {
  program_name: string; program_tagline: string;
  client_context: { organisation: string; challenge: string; opportunity: string };
  learning_themes: { theme: string; description: string }[];
  learning_journey: Record<string, string>;
  program_objectives: string[];
  modules: Module[];
  commercial_notes: { investment: string; inclusions: string; next_steps: string };
}

const AUDIENCE_LEVELS = ['L1-L2','L3-L4','L5-L6','Senior Leaders','All Levels'];
const PROGRAM_TYPES = ['leadership','communication','client_skills','culture','domain','career','assessment'];
const DELIVERY_FORMATS = ['ILT','VILT','Blended','E-Learning','Workshop'];

function b64toBlob(b64: string, type = 'application/octet-stream') {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

export default function GeneratePage() {
  // Form fields
  const [clientName, setClientName] = useState('');
  const [industry, setIndustry] = useState('');
  const [audienceLevel, setAudienceLevel] = useState('L3-L4');
  const [programType, setProgramType] = useState('leadership');
  const [deliveryFormat, setDeliveryFormat] = useState('ILT');
  const [duration, setDuration] = useState('2 days');
  const [numParticipants, setNumParticipants] = useState(30);
  const [numModules, setNumModules] = useState(5);
  const [capabilityGaps, setCapabilityGaps] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // State
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [pptxB64, setPptxB64] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  async function handleGenerate() {
    if (!clientName.trim() || !capabilityGaps.trim()) return;
    setLoading(true); setError(''); setProposal(null); setPptxB64(null);

    const steps = [
      'Embedding client brief…',
      'Searching knowledge base…',
      'Generating proposal with Gemini…',
      'Building PPTX…',
    ];
    let stepIdx = 0;
    setStatusMsg(steps[0]);
    const timer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setStatusMsg(steps[stepIdx]);
    }, 5000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName, industry, audienceLevel, programType, deliveryFormat,
          duration, numParticipants, numModules, capabilityGaps, additionalNotes,
        }),
      });
      clearInterval(timer);
      const data = await res.json();
      if (data.error) { setError(data.error); } else {
        setProposal(data.proposal);
        setPptxB64(data.pptxBase64 ?? null);
        setStatusMsg('');
      }
    } catch (e: any) {
      clearInterval(timer);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function downloadPptx() {
    if (!pptxB64 || !proposal) return;
    const blob = b64toBlob(pptxB64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Euradicle_Proposal_${clientName.replace(/\s+/g, '_')}.pptx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const outputTabs = ['overview','modules','objectives','journey','commercials','raw'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="bg-navy rounded-2xl px-8 py-6 mb-8 flex items-center gap-4">
        <span className="text-4xl">💡</span>
        <div>
          <h1 className="text-2xl font-bold text-white">Generate Proposal</h1>
          <p className="text-gray-400">Describe the client's needs — Euradicle's RAG crafts a tailored proposal</p>
        </div>
      </div>

      {/* Form */}
      {!proposal && (
        <div className="card mb-8">
          <h2 className="section-title">Client Brief</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="label">Client / Organisation *</label>
              <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. TechCorp India Ltd." />
            </div>
            <div>
              <label className="label">Industry *</label>
              <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Banking, FMCG, Aviation" />
            </div>
            <div>
              <label className="label">Audience Level</label>
              <select className="select" value={audienceLevel} onChange={(e) => setAudienceLevel(e.target.value)}>
                {AUDIENCE_LEVELS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Program Type</label>
              <select className="select" value={programType} onChange={(e) => setProgramType(e.target.value)}>
                {PROGRAM_TYPES.map((v) => <option key={v} value={v}>{v.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Delivery Format</label>
              <select className="select" value={deliveryFormat} onChange={(e) => setDeliveryFormat(e.target.value)}>
                {DELIVERY_FORMATS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration</label>
              <input className="input" value={duration} onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2 days, 16 hours" />
            </div>
            <div>
              <label className="label">Participants</label>
              <input type="number" className="input" value={numParticipants}
                onChange={(e) => setNumParticipants(Number(e.target.value))} min={1} max={5000} />
            </div>
            <div>
              <label className="label">Number of Modules</label>
              <input type="number" className="input" value={numModules}
                onChange={(e) => setNumModules(Number(e.target.value))} min={2} max={10} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Capability Gaps / Development Needs *</label>
              <textarea className="input h-32 resize-none" value={capabilityGaps}
                onChange={(e) => setCapabilityGaps(e.target.value)}
                placeholder="Describe what the organisation wants participants to improve. e.g. 'Managers struggle with giving feedback, lack strategic thinking, and need to build cross-functional collaboration skills.'" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Additional Context (optional)</label>
              <textarea className="input h-20 resize-none" value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Budget constraints, cultural nuances, past programs, key stakeholders…" />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !clientName.trim() || !capabilityGaps.trim()}
            className="btn-primary w-full mt-6 text-base"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {statusMsg || 'Generating…'}
              </span>
            ) : '✨ Generate Proposal'}
          </button>
        </div>
      )}

      {/* Result */}
      {proposal && (
        <div>
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-navy">{proposal.program_name}</h2>
              {proposal.program_tagline && (
                <p className="text-gray-500 italic">{proposal.program_tagline}</p>
              )}
            </div>
            <div className="flex gap-3">
              {pptxB64 && (
                <button onClick={downloadPptx} className="btn-primary text-sm">
                  ⬇️ Download PPTX
                </button>
              )}
              <button
                onClick={() => { setProposal(null); setPptxB64(null); setError(''); }}
                className="btn-secondary text-sm"
              >
                🔄 New Proposal
              </button>
            </div>
          </div>

          {/* Output tabs */}
          <div className="flex gap-5 border-b border-gray-200 mb-6">
            {outputTabs.map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`pb-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === t ? 'tab-active' : 'tab-inactive'
                }`}>
                {t === 'overview' ? '📌 Overview' : t === 'modules' ? '📦 Modules' :
                 t === 'objectives' ? '🎯 Objectives' : t === 'journey' ? '🗺️ Journey' :
                 t === 'commercials' ? '💰 Commercials' : '🔧 Raw JSON'}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="section-title">🏢 Client Context</h3>
                {Object.entries(proposal.client_context ?? {}).map(([k, v]) => (
                  <div key={k} className="mb-3">
                    <div className="text-xs font-semibold text-orange uppercase tracking-wide mb-1">
                      {k.replace(/_/g,' ')}
                    </div>
                    <p className="text-sm text-gray-700">{String(v)}</p>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 className="section-title">🎨 Learning Themes</h3>
                <div className="space-y-3">
                  {(proposal.learning_themes ?? []).map((t: any, i: number) => (
                    <div key={i} className="flex gap-3">
                      <span className="w-2 h-2 rounded-full bg-orange mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-sm text-navy">{t.theme}</div>
                        <div className="text-xs text-gray-500">{t.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Modules ── */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">{proposal.modules?.length ?? 0} modules</p>
              {(proposal.modules ?? []).map((mod: Module, i: number) => (
                <details key={i} className="card group">
                  <summary className="cursor-pointer flex items-center justify-between font-semibold text-navy list-none">
                    <span>Module {i + 1}: {mod.title}</span>
                    <span className="text-xs text-orange font-normal">{mod.duration}</span>
                  </summary>
                  <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-navy mb-2">Objectives</div>
                      <ul className="space-y-1">{(mod.objectives ?? []).map((o, j) => <li key={j} className="flex gap-2"><span className="text-orange">•</span>{o}</li>)}</ul>
                    </div>
                    <div>
                      <div className="font-medium text-navy mb-2">Topics</div>
                      <ul className="space-y-1">{(mod.topics ?? []).map((t, j) => <li key={j} className="flex gap-2"><span className="text-orange">•</span>{t}</li>)}</ul>
                    </div>
                    {mod.methodology && (
                      <div className="md:col-span-2 text-orange italic text-xs">
                        Methodology: {mod.methodology}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* ── Objectives ── */}
          {activeTab === 'objectives' && (
            <div className="card space-y-3">
              <h3 className="section-title">Program Objectives</h3>
              {(proposal.program_objectives ?? []).map((obj: string, i: number) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="bg-orange text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <p className="text-sm text-gray-700">{obj}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Journey ── */}
          {activeTab === 'journey' && (
            <div className="grid md:grid-cols-3 gap-5">
              {Object.entries(proposal.learning_journey ?? {}).map(([k, v], i) => (
                <div key={k} className={`card border-t-4 ${i===0?'border-navy':i===1?'border-orange':'border-green-600'}`}>
                  <div className="font-semibold text-navy mb-2 capitalize">
                    {k.replace(/_/g,' ')}
                  </div>
                  <p className="text-sm text-gray-600">{String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Commercials ── */}
          {activeTab === 'commercials' && (
            <div className="card space-y-4">
              <h3 className="section-title">Investment & Next Steps</h3>
              {Object.entries(proposal.commercial_notes ?? {}).map(([k, v]) => (
                <div key={k} className="border-l-4 border-orange pl-4">
                  <div className="text-xs font-semibold text-orange uppercase tracking-wide mb-1">
                    {k.replace(/_/g,' ')}
                  </div>
                  <p className="text-sm text-gray-700">{String(v)}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Raw JSON ── */}
          {activeTab === 'raw' && (
            <div className="card">
              <pre className="text-xs overflow-auto bg-gray-900 text-green-400 p-4 rounded-lg max-h-[600px]">
                {JSON.stringify(proposal, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
