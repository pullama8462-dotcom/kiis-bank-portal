import React from 'react'

export default function Header({ onOpenOnboarding, onOpenLogin }) {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-cyber-dark/80 backdrop-blur-md border-b border-white/5 px-6 md:px-12 py-4 flex items-center justify-between">
      
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/30 flex items-center justify-center text-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.2)]">
          <span className="font-extrabold font-mono text-sm tracking-tighter">KIIS</span>
        </div>
        <div>
          <span className="block font-bold text-sm tracking-[2px] text-white">KIIS BANK</span>
          <span className="block font-mono text-[8px] tracking-[4px] text-cyber-cyan uppercase font-bold">Mainframe Core</span>
        </div>
      </div>

      {/* Navigation links (Desktop Mockup) */}
      <nav className="hidden md:flex items-center gap-8 font-mono text-xs tracking-[2px] text-slate-400">
        <a href="#entrance" className="hover:text-cyber-cyan transition-colors duration-300">ENTRANCE</a>
        <a href="#lobby" className="hover:text-cyber-cyan transition-colors duration-300">LOBBY</a>
        <a href="#desks" className="hover:text-cyber-cyan transition-colors duration-300">AI DESKS</a>
        <a href="#vault" className="hover:text-cyber-cyan transition-colors duration-300">SECURE VAULT</a>
      </nav>

      {/* Global Call to Action */}
      <div className="flex gap-4">
        <button 
          onClick={onOpenLogin}
          className="px-5 py-2.5 rounded-lg border border-cyber-emerald/40 hover:border-cyber-emerald text-cyber-emerald hover:text-white bg-emerald-950/20 font-mono text-xs tracking-[2px] transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,230,118,0.3)] cursor-pointer"
        >
          SECURE LOGIN
        </button>
        <button 
          onClick={onOpenOnboarding}
          className="relative px-5 py-2.5 rounded-lg border border-cyber-cyan/40 hover:border-cyber-cyan text-cyber-cyan hover:text-white bg-cyan-950/20 font-mono text-xs tracking-[2px] transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]"
        >
          INITIALIZE BSBDA
        </button>
      </div>

    </header>
  )
}
