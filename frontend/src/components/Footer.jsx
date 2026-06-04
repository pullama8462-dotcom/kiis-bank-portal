import React from 'react'

export default function Footer({ onOpenStaffPortal, className = '' }) {
  return (
    <footer className={`w-full py-6 px-6 md:px-12 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5 bg-cyber-dark/40 backdrop-blur-md font-mono text-[10px] text-slate-500 tracking-[2px] ${className}`}>
      <span>&copy; 2026 KIIS Bank. Sovereign Mainframe Core.</span>
      <div className="flex flex-wrap items-center justify-center gap-6">
        <a
          href="#security-lab"
          className="hover:text-amber-400 transition-colors duration-300 font-bold uppercase text-amber-500/70"
        >
          Security Lab &rarr;
        </a>
        <button
          type="button"
          onClick={onOpenStaffPortal}
          className="hover:text-cyber-cyan transition-colors duration-300 font-bold uppercase cursor-pointer"
        >
          Internal Access &rarr;
        </button>
      </div>
    </footer>
  )
}
