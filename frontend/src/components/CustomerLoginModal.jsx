import React, { useState, useEffect, useRef, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthContext } from '../context/AuthContext'

export default function CustomerLoginModal({ onClose, onOpenOnboarding }) {
  const { login } = useContext(AuthContext)
  const [stage, setStage] = useState(1) // 1: Password, 2: Biometrics, 3: TwoFA, 4: Transition
  const [username, setUsername] = useState('Jane Doe')
  const [password, setPassword] = useState('customer123')
  const [showCreate, setShowCreate] = useState(false)
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Biometrics simulation
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatus, setScanStatus] = useState('SENSOR PAD STANDBY')
  const [scanSubtext, setScanSubtext] = useState('Press and hold sensor pad to run sweep diagnostic.')
  const [isScanning, setIsScanning] = useState(false)
  const scanIntervalRef = useRef(null)

  // 2FA simulation
  const [twofaCode, setTwofaCode] = useState('')
  const [twofaAlert, setTwofaAlert] = useState('')
  const [tempUser, setTempUser] = useState(null)

  const BACKEND_URL = window.location.origin

  const handleClose = () => {
    clearInterval(scanIntervalRef.current)
    onClose()
  }

  // Stage 1: Validate Password
  const handleSubmitPassword = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMsg('ACCESS ERROR - ALL FIELDS REQUIRED')
      return
    }

    setErrorMsg('CONNECTING TO KIIS MAINFRAME...')
    setIsLoading(true)

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (res.ok) {
        const data = await res.json()
        
        if (data.role.toLowerCase() !== 'customer') {
          setErrorMsg(`ACCESS DENIED - ROLE MISMATCH (AUTHORIZED AS ${data.role.toUpperCase()})`)
          setIsLoading(false)
          return
        }

        const initials = username.split(' ').map(n => n[0]).join('').toUpperCase()
        setTempUser({
          username,
          role: 'Customer',
          otp: '111222',
          initials,
          title: 'Retail Client',
          token: data.access_token
        })

        setErrorMsg('')
        setIsLoading(false)
        setStage(2)
      } else {
        const err = await res.json()
        setErrorMsg(`ACCESS DENIED - ${err.detail || 'SECURITY CREDENTIAL MISMATCH'}`)
        setIsLoading(false)
      }
    } catch (err) {
      console.warn("Backend down. Falling back to local offline simulation mode.", err)
      // Offline simulation fallback
      const credsKey = 'kiis_db_credentials'
      let existingCreds = []
      try {
        existingCreds = JSON.parse(localStorage.getItem(credsKey)) || []
      } catch (e) {
        existingCreds = []
      }

      // Default credentials
      if (existingCreds.length === 0) {
        existingCreds = [
          { username: 'Sam Kovac', role: 'Employee', password: 'employee123', otp: '555666', initials: 'SK', title: 'Clearing Operator', active: true },
          { username: 'Jane Doe', role: 'Customer', password: 'customer123', otp: '111222', initials: 'JD', title: 'Retail Client', active: true }
        ]
      }

      const matchedCred = existingCreds.find(c => 
        c.username.toLowerCase() === username.toLowerCase() && 
        c.role.toLowerCase() === 'customer'
      )

      if (matchedCred && password === matchedCred.password) {
        setTempUser({
          username: matchedCred.username,
          role: 'Customer',
          otp: matchedCred.otp,
          initials: matchedCred.initials || 'JD',
          title: matchedCred.title || 'Retail Client',
          token: null
        })
        setErrorMsg('')
        setIsLoading(false)
        setStage(2)
      } else {
        setErrorMsg('ACCESS DENIED - SECURITY CREDENTIAL MISMATCH (OFFLINE)')
        setIsLoading(false)
      }
    }
  }

  // Stage 2: Biometric Fingerprint Sweep
  const startFingerprintSweep = (e) => {
    if (e) e.preventDefault()
    setIsScanning(true)
    setScanStatus('SENSING SURFACE CONTACT...')
    setScanSubtext('Maintain pressure on high-frequency sensor matrix.')

    const scanPhrases = [
      { threshold: 25, phrase: 'SENSING SURFACE CONTACT...' },
      { threshold: 55, phrase: 'ACQUIRING CRYPTOGRAPHIC VECTOR...' },
      { threshold: 85, phrase: 'ANALYZING GENOMIC SIGNATURES...' },
      { threshold: 99, phrase: 'DNA INTEGRITY STABLE - VERIFYING HASH...' }
    ]

    clearInterval(scanIntervalRef.current)
    let currentProgress = scanProgress

    scanIntervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 8 + 4
      if (currentProgress >= 100) {
        currentProgress = 100
        setScanProgress(100)
        setScanStatus('BIOMETRIC SIGNATURE RESOLVED')
        setScanSubtext('Authenticating clearance token...')
        setIsScanning(false)
        clearInterval(scanIntervalRef.current)

        setTimeout(() => {
          setStage(3)
        }, 1000)
      } else {
        setScanProgress(currentProgress)
        const currentPhrase = scanPhrases.find(p => currentProgress <= p.threshold)
        if (currentPhrase) {
          setScanStatus(currentPhrase.phrase)
        }
      }
    }, 100)
  }

  const endFingerprintSweep = () => {
    setIsScanning(false)
    clearInterval(scanIntervalRef.current)
    if (scanProgress < 100) {
      setScanProgress(0)
      setScanStatus('SCAN INTERRUPTED - HOLD PRESSURE REQUIRED')
      setScanSubtext('Sweep diagnostic requires continuous contact.')
    }
  }

  // Stage 3: Submit 2FA Neural Token
  const handleSubmitTwofa = (e) => {
    e.preventDefault()
    const cleanCode = twofaCode.replace(/\s+/g, '')
    if (!tempUser) return

    if (cleanCode === tempUser.otp) {
      setTwofaAlert('AUTHORIZATION GRANTED. DECRYPTING VAULT KEY...')
      
      // Save session
      localStorage.setItem('kiis_portal_session', JSON.stringify({
        role: tempUser.role,
        name: tempUser.username,
        initials: tempUser.initials,
        title: tempUser.title
      }))

      // Save token
      if (tempUser.token) {
        localStorage.setItem('kiis_portal_token', tempUser.token)
      } else {
        localStorage.removeItem('kiis_portal_token')
      }

      // Update global context AuthContext
      login(tempUser.token || 'mock-customer-token', tempUser.role, tempUser.username)

      setStage(4)

      setTimeout(() => {
        if (window.location.protocol === 'file:') {
          const currentPath = window.location.pathname;
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/frontend/'));
          window.location.href = `file://${parentPath}/dashboard.html`;
        } else {
          if (window.location.port === '5173') {
            window.location.href = 'http://localhost:3001/dashboard.html';
          } else {
            window.location.href = '/dashboard.html';
          }
        }
      }, 1200)
    } else {
      setTwofaAlert('SECURITY TOKEN INVALID - HASH VECTOR DRIFT')
    }
  }

  return (
    <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      
      {/* Backdrop Close Click */}
      <div className="absolute inset-0 w-full h-full" onClick={handleClose}></div>

      {/* Main Glass Modal Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-md glass-panel border-cyber-cyan/20 rounded-2xl p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.1)] bg-slate-950/80 border"
      >
        {/* Modal Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-5 text-slate-400 hover:text-cyber-cyan text-2xl transition-colors duration-300 font-light"
        >
          &times;
        </button>

        {/* STAGE 1: PASSWORD GATEWAY */}
        {stage === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="font-extrabold font-mono text-lg text-cyber-cyan tracking-[3px] uppercase">CUSTOMER GATEWAY</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-1 uppercase">Universal Biometric Security Key</p>
            </div>

            {/* Login inputs form */}
            <form onSubmit={handleSubmitPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">Customer Identity / Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ENTER CUSTOMER USERNAME"
                  disabled={isLoading}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] font-mono transition-all duration-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">Portal Security Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ENTER PORTAL SECURITY KEY"
                  disabled={isLoading}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] font-mono transition-all duration-300"
                />
              </div>

              {errorMsg && (
                <div className={`text-[10px] font-mono text-center p-3 rounded-lg border ${
                  errorMsg.includes('CONNECTING')
                    ? 'border-cyan-500/20 bg-cyan-950/10 text-cyan-400'
                    : 'border-red-500/20 bg-red-950/10 text-red-400'
                }`}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 font-mono text-xs font-bold tracking-[2px] py-3.5 rounded-lg border border-cyber-cyan/40 hover:border-cyber-cyan bg-cyan-950/10 hover:bg-cyber-cyan text-cyber-cyan hover:text-cyber-dark transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.08)] hover:shadow-[0_0_15px_rgba(0,255,255,0.25)] cursor-pointer"
              >
                VALIDATE SECURE HASH
              </button>

              <button
                type="button"
                onClick={() => {
                  // Close login modal and open onboarding/create-account
                  onClose()
                  if (onOpenOnboarding) onOpenOnboarding()
                }}
                className="w-full mt-2 font-mono text-xs font-semibold tracking-[1px] py-2.5 rounded-lg border border-white/10 hover:border-cyber-cyan bg-transparent text-slate-300 hover:text-cyber-cyan transition-all duration-300"
              >
                CREATE ACCOUNT / OPEN ONBOARDING
              </button>
            </form>

                    {/* Inline Create Account Form Toggle */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowCreate(!showCreate)}
                        className="w-full font-mono text-xs font-medium tracking-[1px] py-2.5 rounded-lg border border-white/10 hover:border-cyber-cyan bg-transparent text-slate-300 hover:text-cyber-cyan transition-all duration-300"
                      >
                        {showCreate ? 'Hide create form' : 'Create account here'}
                      </button>
                    </div>

                    {showCreate && (
                      <div className="mt-4 p-4 border border-white/5 rounded-lg bg-black/30">
                        <div className="flex flex-col gap-2 mb-2">
                          <label className="font-mono text-[10px] text-slate-400">Create Username</label>
                          <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="choose a username" className="bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-slate-200" />
                        </div>
                        <div className="flex flex-col gap-2 mb-2">
                          <label className="font-mono text-[10px] text-slate-400">Create Password</label>
                          <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="choose a password" className="bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-slate-200" />
                        </div>
                        <div className="flex flex-col gap-2 mb-2">
                          <label className="font-mono text-[10px] text-slate-400">Email (optional)</label>
                          <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com" className="bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-slate-200" />
                        </div>
                        <div className="flex flex-col gap-2 mb-2">
                          <label className="font-mono text-[10px] text-slate-400">Phone (optional)</label>
                          <input type="text" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+91 9xxxxxxxxx" className="bg-black/40 border border-white/10 p-2 rounded-lg text-sm text-slate-200" />
                        </div>
                        <button
                          onClick={async () => {
                            // Register then login
                            const regBody = {
                              username: (regUsername && regUsername.trim()) ? regUsername.trim() : username.trim(),
                              email: regEmail || `${((regUsername && regUsername.trim()) ? regUsername.trim() : username.trim()).replace(/\s+/g,'').toLowerCase()}@example.com`,
                              password: regPassword || password,
                              phone: regPhone || '+91 99999 88888',
                              role: 'customer'
                            }
                            try {
                              const r = await fetch(`${BACKEND_URL}/api/auth/register`, {
                                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(regBody)
                              })
                              if (!r.ok) {
                                const err = await r.json().catch(() => ({}))
                                setErrorMsg(err.detail || err.error || 'Registration failed')
                                return
                              }

                              // Now login
                              const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
                                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username: (regUsername && regUsername.trim()) ? regUsername.trim() : username.trim(), password: regPassword || password })
                              })

                              if (loginRes.ok) {
                                const data = await loginRes.json()
                                if (data.role.toLowerCase() !== 'customer') {
                                  setErrorMsg(`ACCESS DENIED - ROLE MISMATCH (AUTHORIZED AS ${data.role.toUpperCase()})`)
                                  return
                                }
                                const initials = ((regUsername && regUsername.trim()) ? regUsername.trim() : username).split(' ').map(n => n[0]).join('').toUpperCase()
                                const finalUsername = (regUsername && regUsername.trim()) ? regUsername.trim() : username
                                setTempUser({ username: finalUsername, role: 'Customer', otp: '111222', initials, title: 'Retail Client', token: data.access_token })
                                setErrorMsg('')
                                setStage(2)
                              } else {
                                const err = await loginRes.json().catch(() => ({}))
                                setErrorMsg(err.detail || 'Login after registration failed')
                              }
                            } catch (e) {
                              setErrorMsg('Network error during registration')
                            }
                          }}
                          className="w-full mt-2 font-mono text-xs font-bold tracking-[1px] py-3 rounded-lg border border-emerald-500/30 bg-emerald-900/5 text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        >
                          REGISTER & LOGIN
                        </button>
                      </div>
                    )}
          </motion.div>
        )}

        {/* STAGE 2: BIOMETRIC SCAN PAD */}
        {stage === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-center items-center">
            <div>
              <h2 className="font-extrabold font-mono text-lg text-cyber-cyan tracking-[3px] uppercase">BIOMETRIC VALIDATION</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-1 uppercase">Hold Fingerprint Matrix for Core Decryption</p>
            </div>

            {/* Scanner HUD */}
            <div className="relative w-48 h-48 rounded-full border-2 border-dashed border-cyber-cyan/30 flex items-center justify-center bg-cyber-cyan/[0.02] overflow-hidden">
              {/* Sweeping laser overlay */}
              {isScanning && (
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="absolute left-0 w-full h-[2px] bg-cyber-cyan shadow-[0_0_10px_#00ffff] z-10 pointer-events-none"
                />
              )}

              {/* Touchpad */}
              <div 
                onMouseDown={startFingerprintSweep}
                onMouseUp={endFingerprintSweep}
                onMouseLeave={endFingerprintSweep}
                onTouchStart={startFingerprintSweep}
                onTouchEnd={endFingerprintSweep}
                className={`w-36 h-36 rounded-full border border-cyber-cyan/30 flex items-center justify-center cursor-pointer transition-all duration-500 relative select-none ${
                  isScanning 
                    ? 'bg-cyber-cyan/20 border-cyber-cyan shadow-[0_0_20px_rgba(0,255,255,0.3)] scale-[0.97]'
                    : 'bg-cyber-cyan/5 hover:bg-cyber-cyan/10'
                }`}
              >
                <svg 
                  width="56" 
                  height="56" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`text-cyber-cyan transition-transform duration-300 ${isScanning ? 'scale-110' : ''}`}
                >
                  <path d="M12 2a10 10 0 0 0-8 8.1M20 10.1A10 10 0 0 0 12 2"/>
                  <path d="M12 6a6 6 0 0 0-4.8 5M16.8 11A6 6 0 0 0 12 6"/>
                  <path d="M12 10a2 2 0 0 0-1.6 2M13.6 12A2 2 0 0 0 12 10"/>
                  <path d="M12 14v4M9 15v2M15 15v2M12 22v-2"/>
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full max-w-xs">
              <div className="font-mono text-xs font-bold text-cyber-cyan tracking-[1px]">{scanStatus}</div>
              <div className="font-mono text-[9px] text-slate-500">{scanSubtext}</div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-emerald transition-all duration-100 shadow-[0_0_8px_#00ffff]" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>

            <button
              onClick={handleClose}
              className="font-mono text-[9px] tracking-[1.5px] border border-cyber-cyan/20 hover:border-cyber-cyan/50 bg-cyan-950/5 text-cyber-cyan/80 px-4 py-2 rounded transition-all duration-300 cursor-pointer"
            >
              ABORT ACCESS
            </button>
          </motion.div>
        )}

        {/* STAGE 3: neural PAGER 2FA CHALLENGE */}
        {stage === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="font-extrabold font-mono text-lg text-cyber-cyan tracking-[3px] uppercase">MOCK NEURAL PAGER</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-1 uppercase">Live feed communication link active</p>
            </div>

            {/* Simulated Holographic Pager Notification Box */}
            <div className="bg-cyan-500/[0.02] border border-cyber-cyan/20 p-4 rounded-xl flex flex-col gap-2 shadow-[inset_0_0_15px_rgba(0,255,255,0.05)]">
              <div className="flex justify-between items-center font-mono text-[8px] text-cyber-cyan/80 border-b border-cyber-cyan/10 pb-1.5">
                <span className="font-bold">📟 SECURE COMM MATRIX</span>
                <span className="animate-pulse">● LIVE_FEED</span>
              </div>
              <p className="font-mono text-[10px] text-slate-400 leading-relaxed mt-1">
                ALERT: Secure authentication token dispatched: <strong className="text-cyber-cyan text-xs px-1 bg-cyber-cyan/10 rounded tracking-[1px] border border-cyber-cyan/20 font-sans font-bold">{tempUser?.otp}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitTwofa} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase text-center">Enter 6-Digit Transit Code</label>
                <input
                  type="text"
                  value={twofaCode}
                  onChange={(e) => setTwofaCode(e.target.value)}
                  placeholder="000 000"
                  maxLength={7}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-lg text-center tracking-[4px] text-slate-200 outline-none focus:border-cyber-cyan focus:shadow-[0_0_8px_rgba(0,255,255,0.15)] font-mono transition-all duration-300"
                />
              </div>

              {twofaAlert && (
                <div className={`text-[10px] font-mono text-center p-3 rounded-lg border ${
                  twofaAlert.includes('GRANTED')
                    ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400'
                    : 'border-red-500/20 bg-red-950/10 text-red-400'
                }`}>
                  {twofaAlert}
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 font-mono text-xs font-bold tracking-[2px] py-3.5 rounded-lg border border-cyber-cyan/40 hover:border-cyber-cyan bg-cyan-950/10 hover:bg-cyber-cyan text-cyber-cyan hover:text-cyber-dark transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.08)] hover:shadow-[0_0_15px_rgba(0,255,255,0.25)] cursor-pointer"
              >
                AUTHORIZE TRANSIT PROTOCOLS
              </button>
            </form>
          </motion.div>
        )}

        {/* STAGE 4: TRANSITION PROTOCOL */}
        {stage === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-center items-center py-8">
            <div className="w-16 h-16 rounded-full border border-emerald-500 bg-emerald-950/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
              <span className="text-3xl">✓</span>
            </div>
            <div>
              <h2 className="font-extrabold font-mono text-lg text-emerald-400 tracking-[3px] uppercase">DECRYPTING VAULT KEY</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-2 uppercase">CLEARANCE LEVEL NOMINAL. LOADING SECTOR ACCESS...</p>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
