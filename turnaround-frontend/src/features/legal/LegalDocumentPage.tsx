import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

type LegalDocumentPageProps = {
  title: string;
  icon: 'privacy' | 'terms';
  children: React.ReactNode;
};

export const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ title, icon, children }) => (
  <div className="min-h-screen bg-bg-page px-6 py-10 text-text-primary">
    <main className="mx-auto max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back
      </Link>
      <div className="mt-10 flex items-center gap-3 border-b border-border-default pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#250C77] text-[#ED642B]">
          {icon === 'privacy' ? <ShieldCheck size={19} /> : <FileText size={19} />}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Turnaround</p>
          <h1 className="text-2xl font-black">{title}</h1>
        </div>
      </div>
      <article className="mt-8 text-sm leading-7 text-text-secondary">{children}</article>
    </main>
  </div>
);
