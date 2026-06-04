import React, { useState, useEffect, useCallback } from 'react'
import {
  apiFetch,
  getBackendUrl,
  getStoredToken,
  loginRequest,
  setStoredToken,
  formatBurpRepeaterRequest,
} from '../lib/api'

const SEED_USERNAMES = [
  'Jane Doe',
  'John Smith',
  'Alex Mercer',
  'Marcus Lee',
  'Sam Kovac',
]

const ROLES = ['admin', 'manager', 'employee', 'customer']

const LAB_LOGIN_USER = 'Jane Doe'
const LAB_LOGIN_PASSWORD = 'customer123'

export default function SecurityLabSection({ className = '' }) {
  const [labOn, setLabOn] = useState(null) // null = loading, false = off, true = on
  const [labStatus, setLabStatus] = useState(null)
  const [username, setUsername] = useState('Jane Doe')
  const [role, setRole] = useState('admin')
  const [forgedToken, setForgedToken] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [lastAttack, setLastAttack] = useState('')
  const [forgeLoading, setForgeLoading] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [burpSnippet, setBurpSnippet] = useState('')

  const syncSessionToken = useCallback(() => {
    setSessionToken(getStoredToken() || '')
  }, [])

  const checkLabStatus = useCallback(async () => {
    setLabOn(null)
    setErrorMsg('')
    try {
      const res = await apiFetch('/api/lab/status', { headers: {} })
      if (res.ok) {
        const data = await res.json()
        setLabOn(true)
        setLabStatus(data)
      } else {
        setLabOn(false)
        setLabStatus(null)
      }
    } catch {
      setLabOn(false)
      setLabStatus(null)
    }
  }, [])

  useEffect(() => {
    checkLabStatus()
    syncSessionToken()
  }, [checkLabStatus, syncSessionToken])

  const labLoginForBurp = async () => {
    setLoginLoading(true)
    setErrorMsg('')
    setTestResult(null)
    try {
      const { res, data } = await loginRequest(LAB_LOGIN_USER, LAB_LOGIN_PASSWORD)
      if (!res.ok) {
        throw new Error(data.detail || `Login failed (${res.status})`)
      }
      if (!data.access_token) {
        throw new Error('No access_token in login response — check proxy and backend')
      }
      setStoredToken(data.access_token)
      setSessionToken(data.access_token)
      localStorage.setItem(
        'kiis_portal_session',
        JSON.stringify({
          role: 'Customer',
          name: LAB_LOGIN_USER,
          initials: 'JD',
          title: 'Retail Client',
        })
      )
      setBurpSnippet(
        formatBurpRepeaterRequest('GET', '/api/admin/users', data.access_token)
      )
    } catch (e) {
      setErrorMsg(e.message || 'Lab login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const forgeToken = async (kind) => {
    setForgeLoading(kind)
    setErrorMsg('')
    setTestResult(null)
    try {
      const params = new URLSearchParams({ username, role })
      const res = await apiFetch(`/api/lab/forge-token/${kind}?${params.toString()}`, {
        headers: {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Forge failed (${res.status})`)
      }
      const data = await res.json()
      const token = data.token || ''
      setForgedToken(token)
      setLastAttack(data.attack || kind)
      setBurpSnippet(formatBurpRepeaterRequest('GET', '/api/admin/users', token))
    } catch (e) {
      setErrorMsg(e.message || 'Failed to forge token')
      setForgedToken('')
    } finally {
      setForgeLoading('')
    }
  }

  const runAdminUsersTest = async (token, label) => {
    setTestLoading(true)
    setErrorMsg('')
    setTestResult(null)
    try {
      const res = await apiFetch('/api/admin/users', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const body = await res.json().catch(() => ({ raw: '(non-JSON response)' }))
      setTestResult({
        label,
        status: res.status,
        ok: res.ok,
        body,
      })
    } catch (e) {
      setTestResult({
        label,
        status: 0,
        ok: false,
        body: { error: e.message || 'Request failed' },
      })
    } finally {
      setTestLoading(false)
    }
  }

  const testWithSessionToken = async () => {
    const token = sessionToken || getStoredToken()
    if (!token || token === 'mock-customer-token' || token === 'offline-token') {
      setErrorMsg('Run “Login as Jane Doe (Burp)” first to obtain a real JWT')
      return
    }
    await runAdminUsersTest(token, 'Session JWT (expect 403)')
  }

  const testAdminApi = async () => {
    if (!forgedToken) {
      setErrorMsg('Forge a token first')
      return
    }
    await runAdminUsersTest(forgedToken, 'Forged JWT (expect 200 in lab mode)')
  }

  const copyBurpSnippet = () => {
    if (!burpSnippet) return
    navigator.clipboard?.writeText(burpSnippet)
  }

  return (
    <section
      id="security-lab"
      className={`min-h-screen flex items-center justify-center px-6 md:px-24 py-24 ${className}`}
    >
      <div className="glass-panel p-8 max-w-2xl w-full rounded-2xl border-amber-500/30 text-left pointer-events-auto">
        <span className="font-mono text-xs text-amber-400 tracking-[4px] uppercase font-bold">
          Presentation Module
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 text-white">
          Vulnerability Demo — JWT Bypass
        </h2>
        <p className="text-sm text-slate-400 mt-2 font-light">
          Classroom-only JWT weaknesses. UI is always visible; forging and bypass work only when{' '}
          <code className="text-amber-300/90 text-xs">SECURITY_LAB_MODE=true</code> on the server.
        </p>
        <p className="text-[10px] text-slate-500 mt-2 font-mono">
          Burp: intercept this host ({getBackendUrl() || 'same origin'}) — login returns{' '}
          <span className="text-slate-300">access_token</span>; API calls send{' '}
          <span className="text-slate-300">Authorization: Bearer</span>. See BURP_SUITE.md.
        </p>

        {labOn === null && (
          <p className="mt-6 font-mono text-xs text-slate-500 animate-pulse">
            Checking lab status…
          </p>
        )}

        {labOn === false && (
          <div className="mt-6 border border-slate-600/40 bg-slate-900/40 p-4 rounded-xl">
            <p className="font-mono text-xs text-slate-400">
              Lab API is off (404). Enable{' '}
              <span className="text-amber-400">SECURITY_LAB_MODE</span> on the server and redeploy,
              then refresh.
            </p>
            <button
              type="button"
              onClick={checkLabStatus}
              className="mt-3 font-mono text-[10px] text-cyber-cyan hover:underline tracking-[1px]"
            >
              Recheck status
            </button>
          </div>
        )}

        {labOn === true && (
          <>
            <div className="mt-4 border border-amber-500/50 bg-amber-950/30 p-4 rounded-xl">
              <p className="font-mono text-xs font-bold text-amber-300 tracking-[1px] uppercase">
                Warning — intentional vulnerabilities active
              </p>
              <p className="text-xs text-amber-200/80 mt-1">
                {labStatus?.warning || 'Demo / classroom only. Disable after presentation.'}
              </p>
              {labStatus?.bypasses_enabled?.length > 0 && (
                <ul className="mt-2 text-[10px] text-slate-400 list-disc list-inside space-y-0.5">
                  {labStatus.bypasses_enabled.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 border border-cyan-500/30 bg-cyan-950/20 p-4 rounded-xl">
              <p className="font-mono text-[9px] text-cyan-400 tracking-[1.5px] uppercase font-bold">
                Burp capture — step 1
              </p>
              <button
                type="button"
                disabled={loginLoading}
                onClick={labLoginForBurp}
                className="mt-2 w-full border border-cyber-cyan/50 hover:border-cyber-cyan text-cyber-cyan font-mono text-[10px] px-4 py-3 rounded-lg tracking-[1px] transition-all disabled:opacity-50"
              >
                {loginLoading
                  ? 'Logging in…'
                  : `Login as ${LAB_LOGIN_USER} (Burp) — POST /api/auth/login`}
              </button>
              {sessionToken && (
                <div className="mt-3">
                  <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">
                    Session JWT (from login — use in Repeater)
                  </label>
                  <textarea
                    readOnly
                    value={sessionToken}
                    rows={3}
                    className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-cyan-200/90 font-mono break-all focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">
                  Target username (seed)
                </label>
                <select
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full bg-cyber-dark/80 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:border-cyber-cyan/50 outline-none"
                >
                  {SEED_USERNAMES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">
                  Forged role claim
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full bg-cyber-dark/80 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:border-cyber-cyan/50 outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-5">
              <button
                type="button"
                disabled={!!forgeLoading}
                onClick={() => forgeToken('none')}
                className="flex-1 min-w-[140px] border border-amber-500/40 hover:border-amber-400 bg-amber-950/30 text-amber-200 font-mono text-[10px] px-4 py-3 rounded-lg tracking-[1px] transition-all disabled:opacity-50"
              >
                {forgeLoading === 'none' ? 'Forging…' : 'Forge alg=none token'}
              </button>
              <button
                type="button"
                disabled={!!forgeLoading}
                onClick={() => forgeToken('weak-secret')}
                className="flex-1 min-w-[140px] border border-cyber-cyan/40 hover:border-cyber-cyan bg-cyan-950/20 text-cyber-cyan font-mono text-[10px] px-4 py-3 rounded-lg tracking-[1px] transition-all disabled:opacity-50"
              >
                {forgeLoading === 'weak-secret' ? 'Forging…' : 'Forge weak-secret token'}
              </button>
            </div>

            {lastAttack && (
              <p className="mt-3 font-mono text-[10px] text-slate-500">
                Last attack: <span className="text-slate-300">{lastAttack}</span>
              </p>
            )}

            {forgedToken && (
              <div className="mt-4">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">
                  Forged JWT (paste into Authorization: Bearer)
                </label>
                <textarea
                  readOnly
                  value={forgedToken}
                  rows={4}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-emerald-300/90 font-mono break-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(forgedToken)}
                  className="mt-2 font-mono text-[10px] text-cyber-cyan hover:underline tracking-[1px]"
                >
                  Copy token
                </button>
              </div>
            )}

            {burpSnippet && (
              <div className="mt-4">
                <label className="font-mono text-[9px] text-slate-400 tracking-[1.5px] uppercase">
                  Copy Repeater template (includes Authorization: Bearer)
                </label>
                <textarea
                  readOnly
                  value={burpSnippet}
                  rows={6}
                  className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-slate-300 font-mono break-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyBurpSnippet}
                  className="mt-2 font-mono text-[10px] text-cyber-cyan hover:underline tracking-[1px]"
                >
                  Copy Repeater template
                </button>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-5">
              <button
                type="button"
                disabled={testLoading || !sessionToken}
                onClick={testWithSessionToken}
                className="w-full border border-white/20 hover:border-white/40 text-slate-200 font-mono text-[10px] py-3 rounded-lg tracking-[1px] transition-all disabled:opacity-40"
              >
                {testLoading ? 'Calling API…' : 'Test with session JWT — GET /api/admin/users (403)'}
              </button>
              <button
                type="button"
                disabled={testLoading || !forgedToken}
                onClick={testAdminApi}
                className="w-full pulse-glow-cyan bg-cyber-cyan hover:bg-cyan-400 text-cyber-dark font-bold font-mono text-xs py-3 rounded-lg tracking-[2px] transition-all disabled:opacity-40"
              >
                {testLoading
                  ? 'Calling API…'
                  : 'Test admin API — GET /api/admin/users (forged Bearer)'}
              </button>
            </div>

            {testResult && (
              <div className="mt-4 border border-white/10 bg-black/30 p-4 rounded-xl">
                <p className="font-mono text-[10px] text-slate-400 mb-2">
                  {testResult.label || 'Response'}{' '}
                  <span className={testResult.ok ? 'text-cyber-emerald' : 'text-red-400'}>
                    HTTP {testResult.status}
                  </span>
                </p>
                <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(testResult.body, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {errorMsg && (
          <p className="mt-4 font-mono text-xs text-red-400 border border-red-500/30 bg-red-950/20 px-3 py-2 rounded-lg">
            {errorMsg}
          </p>
        )}
      </div>
    </section>
  )
}
