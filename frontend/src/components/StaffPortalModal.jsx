import React, { useState, useEffect, useRef, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthContext } from '../context/AuthContext'
import { loginRequest } from '../lib/api'

export default function StaffPortalModal({ onClose }) {
  const { login } = useContext(AuthContext)
  const [stage, setStage] = useState(1) // 1: Password, 2: Biometrics, 3: TwoFA, 4: Transition
  const [role, setRole] = useState('Employee') // Employee, Admin
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      const { res, data } = await loginRequest(username, password)

      if (res.ok) {
        
        if (data.role.toLowerCase() !== role.toLowerCase()) {
          setErrorMsg(`ACCESS DENIED - ROLE MISMATCH (AUTHORIZED AS ${data.role.toUpperCase()})`)
          setIsLoading(false)
          return
        }

        const initials = username.split(' ').map(n => n[0]).join('').toUpperCase()
        let title = role === 'Admin' ? 'Systems Admin' : 'Clearing Operator'
        let otp = role === 'Admin' ? '888999' : '555666'

        setTempUser({
          username,
          role,
          otp,
          initials,
          title,
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
      console.warn("Backend down. Falling back to local offline simulation mode for staff.", err)
      // Offline simulation fallback
      const credsKey = 'kiis_db_credentials'
      let existingCreds = []
      try {
        existingCreds = JSON.parse(localStorage.getItem(credsKey)) || []
      } catch (e) {
        existingCreds = []
      }

      // Default credentials if not in local storage yet
      if (existingCreds.length === 0) {
        existingCreds = [
          { username: 'Alex Mercer', role: 'Admin', password: 'admin123', otp: '888999', initials: 'AM', title: 'Super Admin', active: true },
          { username: 'Marcus Lee', role: 'Manager', password: 'manager123', otp: '777888', initials: 'ML', title: 'Vault Manager', active: true },
          { username: 'Sam Kovac', role: 'Employee', password: 'employee123', otp: '555666', initials: 'SK', title: 'Clearing Operator', active: true }
        ]
      }

      const matchedCred = existingCreds.find(c => 
        c.username.toLowerCase() === username.toLowerCase() && 
        c.role.toLowerCase() === role.toLowerCase()
      )

      if (matchedCred && password === matchedCred.password) {
        setTempUser({
          username: matchedCred.username,
          role: matchedCred.role,
          otp: matchedCred.otp,
          initials: matchedCred.initials || username.split(' ').map(n => n[0]).join('').toUpperCase(),
          title: matchedCred.title || (role === 'Admin' ? 'Systems Admin' : 'Clearing Operator'),
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

      login(tempUser.token || 'offline-token', tempUser.role, tempUser.username)

      setStage(4)

      setTimeout(() => {
        // Find index path
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
        className="relative z-10 w-full max-w-md glass-panel border-red-500/20 rounded-2xl p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)] bg-slate-950/80 border"
      >
        {/* Modal Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-5 text-slate-400 hover:text-red-400 text-2xl transition-colors duration-300 font-light"
        >
          &times;
        </button>

        {/* STAGE 1: PASSWORD GATEWAY */}
        {stage === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="font-extrabold font-mono text-lg text-red-500 tracking-[3px] uppercase">STAFF ACCESS PORTAL</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-1 uppercase">Sovereign Mainframe Core Clearance</p>
            </div>

            {/* Staff Role Toggle Tab Selection */}
            <div className="flex w-full bg-black/40 border border-white/5 p-1 rounded-xl font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setRole('Employee');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2.5 rounded-lg text-center tracking-[1px] transition-all duration-300 font-bold ${
                  role === 'Employee'
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Employee Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('Admin');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2.5 rounded-lg text-center tracking-[1px] transition-all duration-300 font-bold ${
                  role === 'Admin'
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Admin Login
              </button>
            </div>

            {/* Login inputs form */}
            <form onSubmit={handleSubmitPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">Staff Identity</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ENTER STAFF USERNAME"
                    disabled={isLoading}
                    className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] font-mono transition-all duration-300"
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border border-red-500/0 focus-within:border-red-500/30 transition-all duration-300"></div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">Security Portal Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ENTER SECURITY MAIN KEY"
                  disabled={isLoading}
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-sm text-slate-200 outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] font-mono transition-all duration-300"
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
                className="w-full mt-2 font-mono text-xs font-bold tracking-[2px] py-3.5 rounded-lg border border-red-500/40 hover:border-red-500 bg-red-950/10 hover:bg-red-500 text-red-400 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.08)] hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
              >
                VALIDATE STAFF KEY
              </button>
            </form>
          </motion.div>
        )}

        {/* STAGE 2: BIOMETRIC SCAN PAD */}
        {stage === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-center items-center">
            <div>
              <h2 className="font-extrabold font-mono text-lg text-red-500 tracking-[3px] uppercase">BIOMETRIC SWEEP</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-1 uppercase">Hold Fingerprint Matrix for Core Decryption</p>
            </div>

            {/* Scanner HUD */}
            <div className="relative w-48 h-48 rounded-full border-2 border-dashed border-red-500/30 flex items-center justify-center bg-red-500/[0.02] overflow-hidden">
              {/* Sweeping laser overlay */}
              {isScanning && (
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="absolute left-0 w-full h-[2px] bg-red-500 shadow-[0_0_10px_#ef4444] z-10 pointer-events-none"
                />
              )}

              {/* Touchpad */}
              <div 
                onMouseDown={startFingerprintSweep}
                onMouseUp={endFingerprintSweep}
                onMouseLeave={endFingerprintSweep}
                onTouchStart={startFingerprintSweep}
                onTouchEnd={endFingerprintSweep}
                className={`w-36 h-36 rounded-full border border-red-500/30 flex items-center justify-center cursor-pointer transition-all duration-500 relative select-none ${
                  isScanning 
                    ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] scale-[0.97]'
                    : 'bg-red-500/5 hover:bg-red-500/10'
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
                  className={`text-red-400 transition-transform duration-300 ${isScanning ? 'scale-110' : ''}`}
                >
                  <path d="M12 2a10 10 0 0 0-8 8.1M20 10.1A10 10 0 0 0 12 2"/>
                  <path d="M12 6a6 6 0 0 0-4.8 5M16.8 11A6 6 0 0 0 12 6"/>
                  <path d="M12 10a2 2 0 0 0-1.6 2M13.6 12A2 2 0 0 0 12 10"/>
                  <path d="M12 14v4M9 15v2M15 15v2M12 22v-2"/>
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full max-w-xs">
              <div className="font-mono text-xs font-bold text-red-400 tracking-[1px]">{scanStatus}</div>
              <div className="font-mono text-[9px] text-slate-500">{scanSubtext}</div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-100 shadow-[0_0_8px_#ef4444]" 
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>

            <button
              onClick={handleClose}
              className="font-mono text-[9px] tracking-[1.5px] border border-red-500/20 hover:border-red-500/50 bg-red-950/5 text-red-500/80 px-4 py-2 rounded transition-all duration-300 cursor-pointer"
            >
              ABORT ACCESS
            </button>
          </motion.div>
        )}

        {/* STAGE 3: neural PAGER 2FA CHALLENGE */}
        {stage === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="font-extrabold font-mono text-lg text-red-500 tracking-[3px] uppercase">MOCK NEURAL PAGER</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-1 uppercase">Live feed communication link active</p>
            </div>

            {/* Simulated Holographic Pager Notification Box */}
            <div className="bg-red-500/[0.02] border border-red-500/20 p-4 rounded-xl flex flex-col gap-2 shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]">
              <div className="flex justify-between items-center font-mono text-[8px] text-red-400/80 border-b border-red-500/10 pb-1.5">
                <span className="font-bold">📟 SECURE COMM MATRIX</span>
                <span className="animate-pulse">● LIVE_FEED</span>
              </div>
              <p className="font-mono text-[10px] text-slate-400 leading-relaxed mt-1">
                ALERT: Secure authentication token dispatched: <strong className="text-red-400 text-xs px-1 bg-red-500/10 rounded tracking-[1px] border border-red-500/20 font-sans font-bold">{tempUser?.otp}</strong>
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
                  className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-lg text-center tracking-[4px] text-slate-200 outline-none focus:border-red-500 focus:shadow-[0_0_8px_rgba(239,68,68,0.15)] font-mono transition-all duration-300"
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
                className="w-full mt-2 font-mono text-xs font-bold tracking-[2px] py-3.5 rounded-lg border border-red-500/40 hover:border-red-500 bg-red-950/10 hover:bg-red-500 text-red-400 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.08)] hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] cursor-pointer"
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
              <h2 className="font-extrabold font-mono text-lg text-emerald-400 tracking-[3px] uppercase">DECRYPTING CORES</h2>
              <p className="font-mono text-[9px] text-slate-400 tracking-[2px] mt-2 uppercase">CLEARANCE LEVEL NOMINAL. LOADING SECTOR ACCESS...</p>
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
