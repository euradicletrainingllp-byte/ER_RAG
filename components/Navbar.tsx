'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: '🎯 Home' },
  { href: '/knowledge-base', label: '📥 Knowledge Base' },
  { href: '/generate', label: '💡 Generate Proposal' },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="bg-navy shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <span className="text-white font-bold text-lg tracking-tight">
          <span className="text-orange">Euradicle</span> RAG
        </span>
        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-orange text-white'
                  : 'text-gray-300 hover:bg-navy-light hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
