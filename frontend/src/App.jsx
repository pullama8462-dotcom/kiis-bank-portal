import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Subcomponents imports
import Header from './components/Header'
import BankTourScene from './components/BankTourScene'
import OnboardingModal from './components/OnboardingModal'
import Footer from './components/Footer'
import StaffPortalModal from './components/StaffPortalModal'
import CustomerLoginModal from './components/CustomerLoginModal'
import SecurityLabSection from './components/SecurityLabSection'

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isStaffPortalOpen, setIsStaffPortalOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/staff/login' || window.location.hash === '#staff') {
        setIsStaffPortalOpen(true)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Check initial hash
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  useEffect(() => {
    // Bind ScrollTrigger to drive camera position and section displays
    const trigger = ScrollTrigger.create({
      trigger: scrollContainerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5, // Smooth lag effect
      onUpdate: (self) => {
        // self.progress ranges from 0.0 to 1.0 based on scroll
        setScrollProgress(self.progress)
      }
    })

    return () => {
      trigger.kill()
    }
  }, [])

  return (
    <div className="relative min-h-screen bg-cyber-dark text-slate-100 font-sans select-none overflow-x-hidden">
      
      {/* Ambient Cyber Glow portals */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none select-none z-10">
        <div className="cyber-background-grid absolute inset-0 opacity-40"></div>
        {/* Cyan Ambient Light */}
        <div className="absolute top-1/4 left-1/4 w-[35vw] h-[35vw] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none"></div>
        {/* Emerald Ambient Light */}
        <div className="absolute bottom-1/4 right-1/4 w-[35vw] h-[35vw] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none"></div>
      </div>

      {/* Core Futuristic Header Navigation */}
      <Header onOpenOnboarding={() => setIsOnboardingOpen(true)} onOpenLogin={() => setIsLoginOpen(true)} />

      {/* FIXED 3D CANVAS WORLD */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
        <BankTourScene progress={scrollProgress} />
      </div>

      {/* SCROLLABLE CONTENT SECTIONS (SCROLL OVERLAY CONTAINER) */}
      <div ref={scrollContainerRef} className="relative z-20 min-h-[500vh] pointer-events-none">
        
        {/* SECTION 1: ENTRANCE (0% - 25% Scroll) */}
        <section id="entrance" className="h-screen flex items-center justify-start px-12 md:px-24">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: scrollProgress < 0.25 ? 1 : 0, x: scrollProgress < 0.25 ? 0 : -50 }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-8 max-w-xl rounded-2xl border-cyber-cyan/30 text-left pointer-events-auto"
          >
            <span className="font-mono text-xs text-cyber-cyan tracking-[4px] uppercase font-bold">CLEARANCE LEVEL 1</span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-2 leading-tight bg-gradient-to-r from-white via-slate-100 to-cyber-cyan bg-clip-text text-transparent">
              KIIS Bank <br/>Mainframe Portal
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-4 leading-relaxed font-light">
              Enter the world's most advanced Web3 biometric digital gateway. Experience high-velocity global transactions secured directly inside our sovereign ledgers.
            </p>
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => setIsOnboardingOpen(true)}
                className="pulse-glow-cyan bg-cyber-cyan hover:bg-cyan-400 text-cyber-dark font-bold font-mono text-xs px-6 py-3 rounded-lg tracking-[2px] transition-all duration-300"
              >
                OPEN ACCOUNT
              </button>
              <button 
                onClick={() => {
                  document.getElementById('lobby')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border border-cyber-cyan/40 hover:border-cyber-cyan bg-cyan-950/20 text-cyber-cyan font-mono text-xs px-6 py-3 rounded-lg tracking-[2px] transition-all duration-300"
              >
                SCROLL TO TOUR &darr;
              </button>
            </div>
          </motion.div>
        </section>

        {/* SECTION 2: LOBBY & ZERO BALANCE (25% - 50% Scroll) */}
        <section id="lobby" className="h-screen flex items-center justify-end px-12 md:px-24">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: scrollProgress >= 0.25 && scrollProgress < 0.5 ? 1 : 0, x: scrollProgress >= 0.25 && scrollProgress < 0.5 ? 0 : 50 }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-8 max-w-xl rounded-2xl border-cyber-cyan/30 text-left pointer-events-auto"
          >
            <span className="font-mono text-xs text-cyber-cyan tracking-[4px] uppercase font-bold">CLEARANCE LEVEL 2</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-white">
              Zero-Balance <br/>BSBDA Mainframe
            </h2>
            <p className="text-sm md:text-base text-slate-400 mt-4 leading-relaxed font-light">
              NPCI compliant digital bank nodes. Initiate an instant zero-maintenance account (₹0 AMC) fully aligned with Indian Banking regulations. No hidden penalties.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="border border-white/5 bg-white/[0.02] p-4 rounded-xl">
                <span className="block font-mono text-lg font-bold text-cyber-emerald">₹0 AMC</span>
                <span className="text-xs text-slate-400">Zero Maintenance</span>
              </div>
              <div className="border border-white/5 bg-white/[0.02] p-4 rounded-xl">
                <span className="block font-mono text-lg font-bold text-cyber-cyan">3 Mins</span>
                <span className="text-xs text-slate-400">Digilocker Verification</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOnboardingOpen(true)}
              className="mt-6 w-full pulse-glow-emerald bg-cyber-emerald hover:bg-emerald-400 text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all duration-300"
            >
              INITIALIZE ONBOARDING
            </button>
          </motion.div>
        </section>

        {/* SECTION 3: AI COUNTER (50% - 75% Scroll) */}
        <section id="desks" className="h-screen flex items-center justify-start px-12 md:px-24">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: scrollProgress >= 0.5 && scrollProgress < 0.75 ? 1 : 0, x: scrollProgress >= 0.5 && scrollProgress < 0.75 ? 0 : -50 }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-8 max-w-xl rounded-2xl border-cyber-cyan/30 text-left pointer-events-auto"
          >
            <span className="font-mono text-xs text-cyber-cyan tracking-[4px] uppercase font-bold">CLEARANCE LEVEL 3</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-white">
              AI-Driven Audit & Support
            </h2>
            <p className="text-sm md:text-base text-slate-400 mt-4 leading-relaxed font-light">
              Clearinghouse override algorithms. Our automated customer desks are active 24/7. Execute ledger syncs, reset security pager codes, or resolve discrepancies instantly.
            </p>
            <div className="flex gap-4 mt-6">
              <div className="border border-cyber-cyan/20 p-4 rounded-xl flex-1 flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <span className="block font-mono text-xs font-bold text-cyber-cyan">Core Smart Agent</span>
                  <span className="text-[10px] text-slate-400">Response Time: 0.01s</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* SECTION 4: THE VAULT (75% - 100% Scroll) */}
        <section id="vault" className="h-screen flex items-center justify-end px-12 md:px-24">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: scrollProgress >= 0.75 ? 1 : 0, y: scrollProgress >= 0.75 ? 0 : 50 }}
            transition={{ duration: 0.5 }}
            className="glass-panel p-8 max-w-xl rounded-2xl border-cyber-cyan/30 text-left pointer-events-auto"
          >
            <span className="font-mono text-xs text-cyber-cyan tracking-[4px] uppercase font-bold">CLEARANCE LEVEL 4</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-white">
              Underground Vault Relays
            </h2>
            <p className="text-sm md:text-base text-slate-400 mt-4 leading-relaxed font-light">
              Security locked lockers and digital asset keys protected inside physical obsidian vaults. Unlock interest yields up to 8.42% APY compounded in real time.
            </p>
            <div className="border border-cyber-cyan/30 bg-cyan-950/20 p-4 rounded-xl mt-6">
              <span className="block font-mono text-sm font-bold text-cyber-cyan">SOVEREIGN CORE VAULT</span>
              <span className="text-xs text-slate-400">Lockers and safe deposit slots unlocked by biometric hash validations.</span>
            </div>
            <button 
              onClick={() => setIsOnboardingOpen(true)}
              className="mt-6 w-full pulse-glow-cyan bg-cyber-cyan hover:bg-cyan-400 text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all duration-300"
            >
              SECURE YOUR VAULT
            </button>
          </motion.div>
        </section>

        {/* SECURITY LAB (presentation — API gated server-side) */}
        <SecurityLabSection />

        {/* FOOTER */}
        <Footer onOpenStaffPortal={() => setIsStaffPortalOpen(true)} className="pointer-events-auto relative z-30" />

      </div>

      {/* FULL STEP-BY-STEP BSBDA MODAL WIZARD */}
      <AnimatePresence>
        {isOnboardingOpen && (
          <OnboardingModal onClose={() => setIsOnboardingOpen(false)} />
        )}
      </AnimatePresence>

      {/* STAFF PORTAL MODAL */}
      <AnimatePresence>
        {isStaffPortalOpen && (
          <StaffPortalModal onClose={() => {
            setIsStaffPortalOpen(false)
            if (window.location.hash === '#/staff/login' || window.location.hash === '#staff') {
              window.history.pushState("", document.title, window.location.pathname + window.location.search)
            }
          }} />
        )}
      </AnimatePresence>

      {/* CUSTOMER LOGIN MODAL */}
      <AnimatePresence>
        {isLoginOpen && (
          <CustomerLoginModal onClose={() => setIsLoginOpen(false)} onOpenOnboarding={() => { setIsLoginOpen(false); setIsOnboardingOpen(true); }} />
        )}
      </AnimatePresence>

    </div>
  )
}
