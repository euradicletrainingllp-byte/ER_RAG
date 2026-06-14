'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface DocRecord {
  id: string;
  file_name: string;
  client_name: string;
  program_type: string;
  audience_level: string;
  industry: string;
  file_type: string;
  total_slides: number;
  created_at: string;
}

interface UploadStatus {
  file: string;
  status: 'pending' | 'extracting' | 'embedding' | 'done' | 'skipped' | 'error';
  message: string;
  chunks?: number;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', pptx: '📊', ppt: '📊', docx: '📝', doc: '📝', xlsx: '📈', xls: '📈',
};

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState<'upload' | 'browse'>('upload');

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [clientName, setClientName] = useState('');
  const [programType, setProgramType] = useState('');
  const [audienceLevel, setAudienceLevel] = useState('');
  const [industry, setIndustry] = useState('');
  const [deliveryFormat, setDeliveryFormat] = useState('');
  const [forceReingest, setForceReingest] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statuses, setStatuses] = useState<UploadStatus[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Browse state
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [filterClient, setFilterClient] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    const params = new URLSearchParams();
    if (filterClient) params.set('client', filterClient);
    if (filterType) params.set('program_type', filterType);
    if (filterLevel) params.set('audience_level', filterLevel);
    const res = await fetch(`/api/documents?${params}`);
    const data = await res.json();
    setDocs(data.documents ?? []);
    setLoadingDocs(false);
  }, [filterClient, filterType, filterLevel]);

  useEffect(() => {
    if (tab === 'browse') loadDocs();
  }, [tab, loadDocs]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(pdf|pptx|ppt|docx|doc|xlsx|xls)$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...dropped]);
  }

  async function handleIngest() {
    if (!files.length || !clientName.trim()) return;
    setUploading(true);
    const initial: UploadStatus[] = files.map((f) => ({
      file: f.name, status: 'pending', message: 'Waiting…',
    }));
    setStatuses(initial);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatuses((prev) => {
        const updated = [...prev];
        updated[i] = { ...updated[i], status: 'extracting', message: 'Parsing & embedding…' };
        return updated;
      });

      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('client_name', clientName.trim());
        fd.append('program_type', programType);
        fd.append('audience_level', audienceLevel);
        fd.append('industry', industry.trim());
        fd.append('delivery_format', deliveryFormat);
        fd.append('force', String(forceReingest));

        const res = await fetch('/api/ingest', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.skipped) {
          setStatuses((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'skipped', message: data.message };
            return updated;
          });
        } else if (data.error) {
          setStatuses((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'error', message: data.error };
            return updated;
          });
        } else {
          setStatuses((prev) => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: 'done',
              message: `✅ ${data.storedChunks}/${data.totalChunks} chunks stored`,
              chunks: data.storedChunks,
            };
            return updated;
          });
        }
      } catch (e) {
        setStatuses((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error', message: String(e) };
          return updated;
        });
      }
    }
    setUploading(false);
  }

  const statusColor: Record<string, string> = {
    pending: 'text-gray-500', extracting: 'text-blue-600',
    embedding: 'text-purple-600', done: 'text-green-600',
    skipped: 'text-yellow-600', error: 'text-red-600',
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="bg-navy rounded-2xl px-8 py-6 mb-8 flex items-center gap-4">
        <span className="text-4xl">📥</span>
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-gray-400">Upload and manage documents in the RAG vector store</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-8">
        {(['upload', 'browse'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {t === 'upload' ? '⬆️ Upload & Ingest' : '📚 Browse'}
          </button>
        ))}
      </div>

      {/* ── UPLOAD TAB ── */}
      {tab === 'upload' && (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Upload + Metadata */}
          <div className="md:col-span-2 space-y-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? 'border-orange bg-orange/5' : 'border-gray-300 hover:border-orange'
              }`}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="font-medium text-gray-700">Drag & drop files here, or click to browse</p>
              <p className="text-sm text-gray-400 mt-1">PDF · PPTX · DOCX · XLSX</p>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls"
                className="hidden"
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="card">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-navy">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
                  <button onClick={() => { setFiles([]); setStatuses([]); }} className="text-xs text-red-500 hover:underline">
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {files.map((f, i) => {
                    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
                    const st = statuses[i];
                    return (
                      <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span>{FILE_ICONS[ext] ?? '📁'} {f.name}</span>
                        {st && (
                          <span className={`text-xs font-medium ${statusColor[st.status]}`}>
                            {st.status === 'extracting' || st.status === 'embedding'
                              ? '⏳ ' + st.message
                              : st.message}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="card">
              <h3 className="section-title">Document Metadata</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Client Name *</label>
                  <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Aditya Birla" />
                </div>
                <div>
                  <label className="label">Industry</label>
                  <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. Manufacturing, Aviation" />
                </div>
                <div>
                  <label className="label">Program Type</label>
                  <select className="select" value={programType} onChange={(e) => setProgramType(e.target.value)}>
                    <option value="">— Auto-detect —</option>
                    {['leadership','communication','client_skills','culture','domain','career','assessment']
                      .map((v) => <option key={v} value={v}>{v.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Audience Level</label>
                  <select className="select" value={audienceLevel} onChange={(e) => setAudienceLevel(e.target.value)}>
                    <option value="">— Auto-detect —</option>
                    {['L1-L2','L3-L4','L5-L6','Senior Leaders','All Levels']
                      .map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Delivery Format</label>
                  <select className="select" value={deliveryFormat} onChange={(e) => setDeliveryFormat(e.target.value)}>
                    <option value="">— Optional —</option>
                    {['ILT','VILT','Blended','E-Learning','Workshop']
                      .map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" id="force" checked={forceReingest}
                    onChange={(e) => setForceReingest(e.target.checked)}
                    className="w-4 h-4 accent-orange" />
                  <label htmlFor="force" className="text-sm text-gray-700">
                    Force re-ingest (overwrite existing)
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleIngest}
              disabled={uploading || !files.length || !clientName.trim()}
              className="btn-primary w-full text-center"
            >
              {uploading ? '⏳ Ingesting…' : '🚀 Start Ingestion'}
            </button>

            {/* Summary */}
            {statuses.length > 0 && !uploading && (
              <div className="card">
                <h3 className="section-title">Ingestion Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    ['✅ Done', statuses.filter((s) => s.status === 'done').length, 'text-green-600'],
                    ['⏭️ Skipped', statuses.filter((s) => s.status === 'skipped').length, 'text-yellow-600'],
                    ['❌ Failed', statuses.filter((s) => s.status === 'error').length, 'text-red-600'],
                  ].map(([label, count, color]) => (
                    <div key={String(label)}>
                      <div className={`text-2xl font-bold ${color}`}>{count}</div>
                      <div className="text-sm text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Info panel */}
          <div className="space-y-4">
            <div className="card bg-blue-50 border-none">
              <h4 className="font-semibold text-navy mb-3">Supported Formats</h4>
              <div className="space-y-2 text-sm text-gray-700">
                {[['📄 PDF', 'Scanned or native'],['📊 PPTX/PPT','PowerPoint decks'],
                  ['📝 DOCX/DOC','Word documents'],['📈 XLSX/XLS','Excel spreadsheets']]
                  .map(([f, d]) => <div key={f}><b>{f}</b> — {d}</div>)}
              </div>
            </div>
            <div className="card bg-orange/5 border-none">
              <h4 className="font-semibold text-navy mb-3">What Happens on Ingest?</h4>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>File parsed into text chunks</li>
                <li>Each chunk classified (cover, objectives, module outline…)</li>
                <li>Metadata inferred from filename + content</li>
                <li>Gemini embeds each chunk (768-dim)</li>
                <li>Vectors stored in Supabase pgvector</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ── BROWSE TAB ── */}
      {tab === 'browse' && (
        <div>
          {/* Filters */}
          <div className="card mb-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="label">Filter by Client</label>
                <input className="input" value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)} placeholder="e.g. Air India" />
              </div>
              <div>
                <label className="label">Program Type</label>
                <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="">All types</option>
                  {['leadership','communication','client_skills','culture','domain','career','assessment']
                    .map((v) => <option key={v} value={v}>{v.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Audience Level</label>
                <select className="select" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                  <option value="">All levels</option>
                  {['L1-L2','L3-L4','L5-L6','Senior Leaders','All Levels']
                    .map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={loadDocs} className="btn-primary w-full text-sm">
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {loadingDocs ? (
            <div className="text-center py-20 text-gray-400">Loading documents…</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              No documents found. Upload files in the Upload tab first.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{docs.length} document{docs.length !== 1 ? 's' : ''} found</p>
              <div className="space-y-2">
                {docs.map((doc) => {
                  const ext = (doc.file_type ?? '').toLowerCase();
                  return (
                    <div key={doc.id} className="doc-card flex items-center justify-between">
                      <div>
                        <span className="font-medium text-navy">
                          {FILE_ICONS[ext] ?? '📁'} {doc.file_name}
                        </span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          🏢 {doc.client_name || '—'} &nbsp;·&nbsp;
                          🏷️ {(doc.program_type || '—').replace('_', ' ')} &nbsp;·&nbsp;
                          👥 {doc.audience_level || '—'} &nbsp;·&nbsp;
                          🧩 {doc.total_slides ?? 0} chunks &nbsp;·&nbsp;
                          📅 {doc.created_at?.slice(0, 10)}
                        </div>
                      </div>
                      <span className="text-xs uppercase text-gray-400 font-mono">{ext}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
