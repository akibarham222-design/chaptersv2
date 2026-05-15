import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 pt-28 pb-16 page-enter">
      <section className="max-w-xl w-full text-center glass-amber p-10 rounded-sm">
        <div className="font-mono-custom text-xs text-amber-500 tracking-widest uppercase mb-4">◆ Wrong Platform ◆</div>
        <h1 className="font-display text-5xl text-smoke-100 font-bold">404</h1>
        <p className="font-body text-smoke-400 text-sm leading-relaxed mt-4">This platform does not exist on tonight's route.</p>
        <Link to="/" className="btn-board inline-flex mt-8 text-xs">Return to Station</Link>
      </section>
    </main>
  );
}
