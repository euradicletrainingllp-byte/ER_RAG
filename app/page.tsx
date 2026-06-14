'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats { documents: number; chunks: number; clients: number; generated: number; }

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { setStats(d); setDbOk(!d.error); })
      .catch(() => setDbOk(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="bg-navy rounded-2xl p-10 mb-10 flex items-center gap-6">
        <span className="text-6xl">🎯</span>
        <div>
          <h1 className="text-4xl font-bold text-white mb-1">Euradicle RAG Solutioning</h1>
          <p className="text-gray-400 text-lg">
            AI-powered proposal generation — grounded in your past work
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Documents', value: stats?.documents, icon: '📁' },
          { label: 'Vector Chunks', value: stats?.chunks, icon: '🧩' },
          { label: 'Clients in KB', value: stats?.clients, icon: '🏢' },
          { label: 'Proposals Generated', value: stats?.generated, icon: '💡' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="stat-card">
            <div className="text-3xl mb-1">{icon}</div>
            <div className="text-3xl font-bold text-orange">
              {value === undefined ? '—' : value}
            </div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <h2 className="text-xl font-bold text-navy mb-4">Get Started</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="card border-l-4 border-orange">
          <div className="text-3xl mb-3">📥</div>
          <h3 className="text-lg font-semibold text-navy mb-2">Knowledge Base</h3>
          <p className="text-gray-600 text-sm mb-4">
            Upload PDF, PPTX, DOCX, or XLSX files. Each document is parsed, classified,
            and embedded into the vector store — ready for retrieval.
          </p>
          <Link href="/knowledge-base" className="btn-primary inline-block text-sm">
            Open Knowledge Base →
          </Link>
        </div>
        <div className="card border-l-4 border-navy">
          <div className="text-3xl mb-3">💡</div>
          <h3 className="text-lg font-semibold text-navy mb-2">Generate Proposal</h3>
          <p className="text-gray-600 text-sm mb-4">
            Describe your client&apos;s needs. The RAG system retrieves the most relevant
            past content and crafts a tailored proposal in Euradicle&apos;s format.
          </p>
          <Link href="/generate" className="btn-secondary inline-block text-sm">
            Generate Proposal →
          </Link>
        </div>
      </div>

      {/* How it works */}
      <h2 className="text-xl font-bold text-navy mb-4">How It Works</h2>
      <div className="grid grid-cols-5 gap-3 mb-10">
        {[
          ['1️⃣', 'Upload', 'Drop in past proposals, frameworks, materials'],
          ['2️⃣', 'Parse & Classify', 'Content split into typed chunks (cover, objectives, modules…)'],
          ['3️⃣', 'Embed', 'Gemini converts each chunk into a 768-dim vector'],
          ['4️⃣', 'Retrieve', 'Client brief is embedded → top-k similar chunks via pgvector'],
          ['5️⃣', 'Generate', 'Gemini drafts a proposal; PPTX built in Euradicle\'s theme'],
        ].map(([icon, title, desc]) => (
          <div key={title} className="card text-center">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="font-semibold text-navy text-sm mb-1">{title}</div>
            <div className="text-xs text-gray-500">{desc}</div>
          </div>
        ))}
      </div>

      {/* System status */}
      <div className="card">
        <h2 className="section-title">System Status</h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            <span className="font-medium">Supabase:</span>{' '}
            {dbOk === null ? '⏳ Checking…' : dbOk ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span>
            <span className="font-medium">Gemini API:</span>{' '}
            {process.env.NEXT_PUBLIC_SUPABASE_URL ? '🟢 Configured' : '🔴 Check .env.local'}
          </span>
          <span>
            <span className="font-medium">Embedding Model:</span>{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">gemini-embedding-001</code> (768-dim)
          </span>
          <span>
            <span className="font-medium">Generation Model:</span>{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">gemini-2.5-flash</code>
          </span>
        </div>
      </div>
    </div>
  );
}
