import React, { useState } from 'react'
import { motion } from 'framer-motion'
import RuPayCard3D from './RuPayCard3D'

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(1)
  const [aadhaar, setAadhaar] = useState('')
  const [pan, setPan] = useState('')
  const [hasNoPan, setHasNoPan] = useState(false)
  const [fullName, setFullName] = useState('Bob Miller')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  
  // DigiLocker simulation states
  const [isFetchingDigi, setIsFetchingDigi] = useState(false)
  const [digiLogs, setDigiLogs] = useState([])
  const [isFetched, setIsFetched] = useState(false)

  // vKYC simulation states
  const [vkycProgress, setVkycProgress] = useState('STANDBY')
  const [vkycPercent, setVkycPercent] = useState(0)

  // Function: Simulated DigiLocker Handshake
  const triggerDigiLockerFetch = () => {
    setIsFetchingDigi(true)
    setDigiLogs([])
    
    const logs = [
      "Establishing cryptographic handshake with DigiLocker secure nodes...",
      "Resolving Aadhaar decentralized vector hash...",
      "DigiLocker authorization granted. Securing records...",
      "Retrieved: BOB MILLER | PAN: BMLP****4D | Aadhaar Verified"
    ]

    logs.forEach((log, index) => {
      setTimeout(() => {
        setDigiLogs(prev => [...prev, `[LOG]: ${log}`])
        if (index === logs.length - 1) {
          setIsFetchingDigi(false)
          setIsFetched(true)
          setAadhaar("5520 8840 9432")
          setPan("BMLP4094D")
          setFullName("Bob Miller")
        }
      }, (index + 1) * 800)
    })
  }

  // Function: Simulated Video KYC Verification
  const startVideoKycSim = () => {
    setVkycProgress('INITIALIZING SECURE VIDEO LINK...')
    setVkycPercent(0)
    
    const intervals = [
      { p: 20, t: 'ESTABLISHING COMPLIANT RBI P2P TUNNEL...' },
      { p: 50, t: 'ANALYZING LIVE WEBCAM FACIAL GEOMETRIES...' },
      { p: 85, t: 'NPCI CARD MATCHING & e-SIGN GENERATION...' },
      { p: 100, t: 'RBI VIDEO KYC COMPLIANT. ONBOARDING COMPLETE.' }
    ]

    intervals.forEach((stepItem, index) => {
      setTimeout(() => {
        setVkycPercent(stepItem.p)
        setVkycProgress(stepItem.t)
        if (stepItem.p === 100) {
          setTimeout(() => {
            setStep(3) // Advance to Debit Card
          }, 1200)
        }
      }, (index + 1) * 1000)
    })
  }

  const handleFinalize = async () => {
    const uName = fullName.trim() || 'Bob Miller';
    const chosenUsername = username.trim() || uName.replace(/\s+/g, '').toLowerCase();
    const chosenPassword = password || 'customer123';
    const initials = uName.split(' ').map(n => n[0]).join('').toUpperCase();
    const BACKEND_URL = window.location.origin;

    try {
      const regEmail = `${chosenUsername}@example.com`;
      await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: chosenUsername,
          email: regEmail,
          password: chosenPassword,
          phone: '+91 99999 88888',
          role: 'customer'
        })
      });

      const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: chosenUsername,
          password: chosenPassword
        })
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        localStorage.setItem('kiis_portal_token', token);

        await fetch(`${BACKEND_URL}/api/customer/vkyc/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            identity_proof_type: 'national_id',
            document_url: 'https://digilocker.gov.in/credentials/vector_hash'
          })
        });
      }
    } catch (e) {
      console.warn("Backend down. Performing offline local fallback onboarding.", e);
    }

    const credsKey = 'kiis_db_credentials';
    let existingCreds = [];
    try {
      existingCreds = JSON.parse(localStorage.getItem(credsKey)) || [];
    } catch (e) {
      existingCreds = [];
    }

    const exists = existingCreds.some(c => c.username.toLowerCase() === chosenUsername.toLowerCase());
    if (!exists) {
      existingCreds.push({
        username: chosenUsername,
        role: 'Customer',
        password: chosenPassword,
        otp: '111222',
        initials: initials,
        title: 'Retail Client',
        active: true
      });
      localStorage.setItem(credsKey, JSON.stringify(existingCreds));
    }

    const balancesKey = 'kiis_db_balances';
    let existingBalances = {};
    try {
      existingBalances = JSON.parse(localStorage.getItem(balancesKey)) || {};
    } catch (e) {
      existingBalances = {};
    }

    if (existingBalances[chosenUsername] === undefined) {
      existingBalances[chosenUsername] = 1248500.00;
      localStorage.setItem(balancesKey, JSON.stringify(existingBalances));
    }

    localStorage.setItem('kiis_portal_session', JSON.stringify({
      role: 'Customer',
      name: chosenUsername,
      initials: initials,
      title: 'Retail Client'
    }));

    if (window.location.protocol === 'file:') {
      const currentPath = window.location.pathname;
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/frontend/'));
      window.location.href = `file://${parentPath}/index.html`;
    } else {
      if (window.location.port === '5173') {
        window.location.href = 'http://localhost:3001/index.html';
      } else {
        window.location.href = '/index.html';
      }
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      
      {/* Backdrop close */}
      <div className="absolute inset-0 w-full h-full" onClick={onClose}></div>

      {/* MAIN GLASS MODAL FRAME */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-2xl glass-panel border-cyber-cyan/30 rounded-2xl p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)]"
      >
        {/* Modal close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-5 text-slate-400 hover:text-cyber-cyan text-2xl transition-colors duration-300 font-light"
        >
          &times;
        </button>

        {/* Progress step indicators */}
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <div>
            <h3 className="font-bold text-lg text-white">Open BSBDA Clearance Node</h3>
            <span className="font-mono text-[9px] text-cyber-cyan tracking-[2px] uppercase">Indian Banking Onboarding Wizard</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`px-2 py-1 rounded ${step === 1 ? 'bg-cyber-cyan text-cyber-dark font-bold' : 'text-slate-400 border border-white/10'}`}>1: Identity</span>
            <span className="text-slate-600">&rarr;</span>
            <span className={`px-2 py-1 rounded ${step === 2 ? 'bg-cyber-cyan text-cyber-dark font-bold' : 'text-slate-400 border border-white/10'}`}>2: vKYC</span>
            <span className="text-slate-600">&rarr;</span>
            <span className={`px-2 py-1 rounded ${step === 3 ? 'bg-cyber-cyan text-cyber-dark font-bold' : 'text-slate-400 border border-white/10'}`}>3: RuPay Card</span>
            <span className="text-slate-600">&rarr;</span>
            <span className={`px-2 py-1 rounded ${step === 4 ? 'bg-cyber-cyan text-cyber-dark font-bold' : 'text-slate-400 border border-white/10'}`}>4: Limits</span>
          </div>
        </div>

        {/* STEP 1: IDENTITY & KYC SCREEN */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Submit your unique Aadhaar e-KYC and PAN cards to fetch biometric records via DigiLocker.
            </p>

            <button 
              type="button"
              onClick={triggerDigiLockerFetch}
              disabled={isFetchingDigi}
              className="w-full flex items-center justify-center gap-3 py-3 border border-dashed border-cyber-cyan/40 hover:border-cyber-cyan bg-cyan-950/10 text-cyber-cyan rounded-xl transition-all duration-300 font-mono text-xs tracking-[2px]"
            >
              <span>📟</span>
              {isFetchingDigi ? "FETCHING RECORD SECURE NODES..." : "AUTO-FETCH WITH SECURE DIGILOCKER"}
            </button>

            {/* Handshake Log terminal */}
            {(isFetchingDigi || isFetched) && (
              <div className="bg-black/60 border border-white/5 p-4 rounded-xl font-mono text-[10px] text-cyber-cyan flex flex-col gap-2 h-28 overflow-y-auto">
                {digiLogs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            )}

            <div className="flex gap-4 md:flex-row flex-col">
              <div className="flex-1 flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 tracking-[1px]">12-DIGIT AADHAAR CARD</label>
                <input 
                  type="text" 
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="0000 0000 0000" 
                  className="bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.2)] font-mono transition-all duration-300"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 tracking-[1px]">10-DIGIT PAN CARD</label>
                <input 
                  type="text" 
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  placeholder="ABCDE1234F" 
                  disabled={hasNoPan}
                  className={`bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.2)] font-mono transition-all duration-300 ${hasNoPan ? 'opacity-40' : ''}`}
                />
              </div>
            </div>

            {/* Username & Password fields for account creation */}
            <div className="flex gap-4 md:flex-row flex-col mt-3">
              <div className="flex-1 flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 tracking-[1px]">Choose Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="preferred.username"
                  className="bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.2)] font-mono transition-all duration-300"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="font-mono text-[10px] text-slate-400 tracking-[1px]">Choose Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className="bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.2)] font-mono transition-all duration-300"
                />
              </div>
            </div>

            {/* Form 60 Toggle */}
            <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-400 select-none">
              <input 
                type="checkbox" 
                checked={hasNoPan}
                onChange={() => setHasNoPan(!hasNoPan)}
                className="accent-cyber-cyan w-4 h-4"
              />
              <span>No active PAN card? File BSBDA compliant Form 60 declaration.</span>
            </label>

            {hasNoPan && (
              <div className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl text-[10px] text-amber-400/80 leading-relaxed font-mono">
                FORM 60 MANDATE: "I hereby declare that I do not hold an active Permanent Account Number (PAN) under the Income Tax Act of 1961. Vault allocations remains strictly BSBDA cleared."
              </div>
            )}

            <button 
              onClick={() => setStep(2)}
              disabled={!aadhaar || (!pan && !hasNoPan)}
              className="mt-4 w-full pulse-glow-cyan bg-cyber-cyan hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all duration-300"
            >
              PROCEED TO VIDEO KYC
            </button>
          </motion.div>
        )}

        {/* STEP 2: VIDEO KYC SCREEN */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-center">
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Connect with an RBI-compliant virtual agent scanner. Keep your identity documents ready.
            </p>

            {/* Video Camera Box Simulator */}
            <div className="relative w-full max-w-sm h-60 mx-auto bg-black border border-cyber-cyan/30 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
              
              {/* Scanning Laser overlay */}
              <div className="laser-scan-line absolute left-0 w-full h-[2px] z-20 pointer-events-none"></div>

              {/* Secure encryption badge */}
              <div className="absolute top-3 left-4 z-20 font-mono text-[9px] text-cyber-emerald flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-cyber-emerald/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-ping"></span>
                <span>SECURE E2E ENCRYPTED</span>
              </div>

              {/* Camera placeholder frame */}
              <div className="absolute inset-4 border border-dashed border-white/10 rounded flex flex-col items-center justify-center">
                
                {vkycPercent === 0 ? (
                  <div className="text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyber-cyan/30 flex items-center justify-center text-cyber-cyan">📷</div>
                    <span className="font-mono text-[10px] text-slate-400">CAMERA STANDBY ACTIVE</span>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Agent visualizer */}
                    <div className="w-20 h-20 rounded-full border border-cyber-cyan bg-cyan-950/20 flex items-center justify-center text-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.3)] animate-pulse">
                      <span className="text-3xl">🤖</span>
                    </div>
                    <div className="absolute bottom-4 left-4 font-mono text-[8px] text-cyber-cyan bg-black/80 p-1.5 rounded border border-white/5 text-left">
                      <div>AGENT: AI VERIFIER v4</div>
                      <div>RESOLUTION: FACE ENGAGED</div>
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* Terminal status details */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs text-cyber-cyan font-bold tracking-[1px]">{vkycProgress}</span>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-emerald transition-all duration-300" style={{ width: `${vkycPercent}%` }}></div>
              </div>
            </div>

            {vkycPercent === 0 ? (
              <button 
                onClick={startVideoKycSim}
                className="pulse-glow-cyan bg-cyber-cyan hover:bg-cyan-400 text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all duration-300"
              >
                INITIALIZE SECURE AGENT LINK
              </button>
            ) : (
              <button 
                disabled
                className="opacity-60 bg-cyan-950 text-cyber-cyan font-bold font-mono text-xs py-3 rounded-lg tracking-[2px]"
              >
                SECURE HANDSHAKE PENDING ({vkycPercent}%)
              </button>
            )}
          </motion.div>
        )}

        {/* STEP 3: SPINNING 3D CARD SCREEN */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-center items-center">
            <div>
              <span className="font-mono text-xs text-cyber-emerald font-bold tracking-[2px] uppercase">AUTHENTICATION SUCCESS</span>
              <h2 className="text-2xl font-bold text-white mt-1">Your Virtual RuPay Card</h2>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Hover or touch the 3D RuPay Card to rotate it and inspect the secure holographic BSBDA microchip allocations.
              </p>
            </div>

            {/* 3D spinning Rupay Card R3F component */}
            <div className="w-full max-w-sm h-52 relative border border-white/5 rounded-2xl bg-black/40 overflow-hidden shadow-2xl">
              <RuPayCard3D name={fullName} />
            </div>

            <button 
              onClick={() => setStep(4)}
              className="w-full pulse-glow-emerald bg-cyber-emerald hover:bg-emerald-400 text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all duration-300"
            >
              PROCEED TO ACCREDITED LIMITS
            </button>
          </motion.div>
        )}

        {/* STEP 4: LIMITS DASHBOARD SHEET */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-bold text-white text-center">BSBDA Compliance Dashboard</h2>
              <p className="text-xs text-slate-400 mt-1 text-center max-w-sm mx-auto leading-relaxed">
                Basic Savings Bank Deposit Account rules registered under RBI regulations.
              </p>
            </div>

            {/* Clearance Limits dynamic cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-xl border-white/5 flex flex-col gap-1">
                <span className="font-mono text-[9px] text-slate-400 tracking-[1px] uppercase">Daily ATM Cap</span>
                <span className="font-mono text-lg font-bold text-cyber-cyan">₹50,000</span>
                <span className="text-[10px] text-slate-500">Max cash withdrawals</span>
              </div>
              <div className="glass-panel p-4 rounded-xl border-white/5 flex flex-col gap-1">
                <span className="font-mono text-[9px] text-slate-400 tracking-[1px] uppercase">Maintenance Fees</span>
                <span className="font-mono text-lg font-bold text-cyber-emerald">₹0 AMC</span>
                <span className="text-[10px] text-slate-500">No hidden ledger charges</span>
              </div>
              <div className="glass-panel p-4 rounded-xl border-white/5 flex flex-col gap-1 col-span-2">
                <span className="font-mono text-[9px] text-slate-400 tracking-[1px] uppercase">Cleared Settlement Desks</span>
                <div className="flex justify-between items-center mt-2 font-mono text-xs text-cyber-cyan">
                  <span>UPI Integration</span>
                  <span className="text-cyber-emerald">✓ ACTIVE</span>
                </div>
                <div className="flex justify-between items-center mt-1 font-mono text-xs text-cyber-cyan">
                  <span>NEFT / RTGS / IMPS</span>
                  <span className="text-cyber-emerald">✓ ACTIVE</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleFinalize}
              className="w-full pulse-glow-cyan bg-cyber-cyan hover:bg-cyan-400 text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all duration-300"
            >
              FINALIZE SECURITY CLEARANCE
            </button>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
