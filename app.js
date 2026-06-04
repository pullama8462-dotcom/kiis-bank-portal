/**
 * KIIS Bank Portal - Application Engine
 * high-fidelity canvas physics, custom charts, biometric overlays, and dashboard loops.
 */

// ==================== MAIN CORE STATE ENGINE & PERSISTENCE ====================
const SESSION_KEY = 'kiis_portal_session';

const BACKEND_URL =
  typeof window !== 'undefined' &&
  window.location?.origin &&
  window.location.origin !== 'null'
    ? window.location.origin
    : 'http://localhost:8000';

function getAuthHeader() {
  const token = localStorage.getItem('kiis_portal_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const DB_CREDENTIALS = 'kiis_db_credentials';
const DB_WIRES = 'kiis_db_wires';
const DB_TICKETS = 'kiis_db_tickets';
const DB_BALANCES = 'kiis_db_balances';
const DB_AUDIT_LOGS = 'kiis_db_audit_logs';

const DEFAULT_CREDENTIALS = [
  { username: 'Alex Mercer', role: 'Admin', password: 'admin123', otp: '888999', initials: 'AM', title: 'Super Admin', active: true },
  { username: 'Marcus Lee', role: 'Manager', password: 'manager123', otp: '777888', initials: 'ML', title: 'Vault Manager', active: true },
  { username: 'Sam Kovac', role: 'Employee', password: 'employee123', otp: '555666', initials: 'SK', title: 'Clearing Operator', active: true },
  { username: 'Jane Doe', role: 'Customer', password: 'customer123', otp: '111222', initials: 'JD', title: 'Retail Client', active: true }
];

const DEFAULT_WIRES = [
  { id: 'wireRow1', txName: 'TX-BATCH-094', route: 'Zürich &rarr; New York', amount: 12500000, asset: 'Swiss Francs' },
  { id: 'wireRow2', txName: 'TX-BATCH-108', route: 'Singapore &rarr; London', amount: 8400000, asset: 'SGD' },
  { id: 'wireRow3', txName: 'TX-BATCH-244', route: 'Zürich &rarr; Singapore', amount: 19200000, asset: 'USD' }
];

const DEFAULT_TICKETS = [
  { id: 'ticket1', user: 'Jane Doe (Retail Vault #084)', desc: '"Biometric mismatch lockout on central mobile terminal. Core re-key needed."', priority: 'High', priorityClass: 'priority-high' },
  { id: 'ticket2', user: 'Viktor Haas (System Overseer)', desc: '"Manual token pager synch buffer drifting out of network matrix standard."', priority: 'High', priorityClass: 'priority-high' },
  { id: 'ticket3', user: 'Marcus Lee (Zürich Vault)', desc: '"Auditing logs synchronization requested on Swiss central mainframe."', priority: 'Medium', priorityClass: 'priority-med' }
];

const DEFAULT_BALANCES = {
  'Jane Doe': 1248500.00
};

// Initialize persistent state records
function initMainframeState() {
  if (!localStorage.getItem(DB_CREDENTIALS)) {
    localStorage.setItem(DB_CREDENTIALS, JSON.stringify(DEFAULT_CREDENTIALS));
  }
  if (!localStorage.getItem(DB_WIRES)) {
    localStorage.setItem(DB_WIRES, JSON.stringify(DEFAULT_WIRES));
  }
  if (!localStorage.getItem(DB_TICKETS)) {
    localStorage.setItem(DB_TICKETS, JSON.stringify(DEFAULT_TICKETS));
  }
  if (!localStorage.getItem(DB_BALANCES)) {
    localStorage.setItem(DB_BALANCES, JSON.stringify(DEFAULT_BALANCES));
  }
  if (!localStorage.getItem(DB_AUDIT_LOGS)) {
    localStorage.setItem(DB_AUDIT_LOGS, JSON.stringify([]));
  }
}

// Invoke state loader
initMainframeState();

// Core DB Accessors
function getCredentials() {
  return JSON.parse(localStorage.getItem(DB_CREDENTIALS)) || DEFAULT_CREDENTIALS;
}
function saveCredentials(data) {
  localStorage.setItem(DB_CREDENTIALS, JSON.stringify(data));
}
function getWires() {
  return JSON.parse(localStorage.getItem(DB_WIRES)) || DEFAULT_WIRES;
}
function saveWires(data) {
  localStorage.setItem(DB_WIRES, JSON.stringify(data));
}
function getTickets() {
  return JSON.parse(localStorage.getItem(DB_TICKETS)) || DEFAULT_TICKETS;
}
function saveTickets(data) {
  localStorage.setItem(DB_TICKETS, JSON.stringify(data));
}
function getBalances() {
  return JSON.parse(localStorage.getItem(DB_BALANCES)) || DEFAULT_BALANCES;
}
function saveBalances(data) {
  localStorage.setItem(DB_BALANCES, JSON.stringify(data));
}

function getSession() {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    const token = localStorage.getItem('kiis_portal_token');
    
    // Strict authentication gate: redirect unauthenticated sessions to landing path
    if (!session || !token) {
      if (window.location.pathname.includes('dashboard.html')) {
        window.location.href = window.location.protocol === 'file:' ? 'index.html' : '/';
      }
      return null;
    }
    return JSON.parse(session);
  } catch (e) {
    if (window.location.pathname.includes('dashboard.html')) {
      window.location.href = window.location.protocol === 'file:' ? 'index.html' : '/';
    }
    return null;
  }
}


// ==================== MULTI-FACTOR BIOMETRIC GATEWAY (index.html) ====================
let currentScanRole = 'Admin';
let biometricProgress = 0;
let biometricInterval = null;
let tempAuthUser = null; // Caches matched user record before 2FA check

function initiateScan(role) {
  currentScanRole = role;
  
  const overlay = document.getElementById('bioOverlay');
  if (!overlay) return;
  
  // Set role label in password stage
  const label = document.getElementById('authRoleLabel');
  if (label) {
    label.innerText = role;
  }
  
  // Clear inputs & alerts
  const userInput = document.getElementById('authUsername');
  const pwdInput = document.getElementById('authPassword');
  const alertDiv = document.getElementById('passwordAlert');
  const codeInput = document.getElementById('authTwofaCode');
  const alertDiv2 = document.getElementById('twofaAlert');
  
  if (userInput) userInput.value = '';
  if (pwdInput) pwdInput.value = '';
  if (alertDiv) alertDiv.innerText = '';
  if (codeInput) codeInput.value = '';
  if (alertDiv2) alertDiv2.innerText = '';
  
  tempAuthUser = null;
  
  // Reset stages
  document.getElementById('stagePassword').style.display = 'block';
  document.getElementById('stageBiometric').style.display = 'none';
  document.getElementById('stageTwofa').style.display = 'none';
  
  overlay.classList.add('show');
}

async function submitPassword() {
  const userInput = document.getElementById('authUsername');
  const pwdInput = document.getElementById('authPassword');
  const alertDiv = document.getElementById('passwordAlert');
  
  if (!userInput || !pwdInput || !alertDiv) return;
  
  const username = userInput.value.trim();
  const password = pwdInput.value;
  
  if (!username) {
    alertDiv.innerText = 'ACCESS ERROR - IDENTITY FIELD REQUIRED';
    return;
  }
  
  alertDiv.innerText = 'CONNECTING TO KIIS MAINFRAME...';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // Check role authorization matching
      if (data.role.toLowerCase() !== currentScanRole.toLowerCase()) {
        alertDiv.innerText = `ACCESS DENIED - ROLE MISMATCH (AUTHORIZED AS ${data.role.toUpperCase()})`;
        return;
      }
      
      const initials = username.split(' ').map(n=>n[0]).join('').toUpperCase();
      let title = 'Retail Client';
      if (data.role === 'admin') title = 'Systems Admin';
      else if (data.role === 'manager') title = 'Vault Manager';
      else if (data.role === 'employee') title = 'Clearing Operator';
      
      let otp = '111222';
      if (data.role === 'admin') otp = '888999';
      else if (data.role === 'manager') otp = '777888';
      else if (data.role === 'employee') otp = '555666';
      
      tempAuthUser = {
        username: username,
        role: currentScanRole,
        otp: otp,
        initials: initials,
        title: title,
        token: data.access_token
      };
      
      alertDiv.innerText = '';
      document.getElementById('stagePassword').style.display = 'none';
      document.getElementById('stageBiometric').style.display = 'block';
      
      biometricProgress = 0;
      const fill = document.getElementById('progressBarFill');
      if (fill) fill.style.width = '0%';
      const statusText = document.getElementById('scannerStatus');
      if (statusText) {
        statusText.innerText = 'SENSOR PAD STANDBY';
        statusText.style.color = 'var(--glow-cyan)';
      }
      const subtextText = document.getElementById('scannerSubtext');
      if (subtextText) {
        subtextText.innerText = 'Press and hold sensor pad to run sweep diagnostic.';
      }
      return;
    } else {
      const err = await res.json();
      alertDiv.innerText = `ACCESS DENIED - ${err.detail || 'SECURITY CREDENTIAL MISMATCH'}`;
      return;
    }
  } catch (e) {
    console.warn("Backend down. Falling back to local offline simulation mode.", e);
    // Offline simulation fallback
    const credsList = getCredentials();
    const matchedCred = credsList.find(c => 
      c.username.toLowerCase() === username.toLowerCase() && 
      c.role === currentScanRole
    );
    
    if (matchedCred && password === matchedCred.password) {
      tempAuthUser = matchedCred;
      alertDiv.innerText = '';
      document.getElementById('stagePassword').style.display = 'none';
      document.getElementById('stageBiometric').style.display = 'block';
      
      biometricProgress = 0;
      const fill = document.getElementById('progressBarFill');
      if (fill) fill.style.width = '0%';
      const statusText = document.getElementById('scannerStatus');
      if (statusText) {
        statusText.innerText = 'SENSOR PAD STANDBY';
        statusText.style.color = 'var(--glow-cyan)';
      }
      const subtextText = document.getElementById('scannerSubtext');
      if (subtextText) {
        subtextText.innerText = 'Press and hold sensor pad to run sweep diagnostic.';
      }
    } else {
      alertDiv.innerText = 'ACCESS DENIED - SECURITY CREDENTIAL MISMATCH (OFFLINE)';
    }
  }
}

// Fingerprint Sweep Sweeper
function startFingerprintSweep(event) {
  if (event) event.preventDefault();
  
  const pad = document.getElementById('fingerprintTouchPad');
  if (pad) pad.classList.add('scanning');
  
  const fill = document.getElementById('progressBarFill');
  const statusText = document.getElementById('scannerStatus');
  const subText = document.getElementById('scannerSubtext');
  
  const scanPhrases = [
    { threshold: 25, phrase: 'SENSING SURFACE CONTACT...' },
    { threshold: 55, phrase: 'ACQUIRING CRYPTOGRAPHIC VECTOR...' },
    { threshold: 85, phrase: 'ANALYZING GENOMIC SIGNATURES...' },
    { threshold: 99, phrase: 'DNA INTEGRITY STABLE - VERIFYING HASH...' }
  ];
  
  if (biometricInterval) clearInterval(biometricInterval);
  
  biometricInterval = setInterval(() => {
    biometricProgress += Math.random() * 8 + 4;
    
    if (biometricProgress >= 100) {
      biometricProgress = 100;
      clearInterval(biometricInterval);
      biometricInterval = null;
      
      if (fill) fill.style.width = '100%';
      if (statusText) {
        statusText.innerText = 'BIOMETRIC SIGNATURE RESOLVED';
        statusText.style.color = 'var(--glow-emerald)';
      }
      if (subText) subText.innerText = 'Authenticating clearance token...';
      
      setTimeout(() => {
        if (pad) pad.classList.remove('scanning');
        document.getElementById('stageBiometric').style.display = 'none';
        document.getElementById('stageTwofa').style.display = 'block';
        
        const mockOtp = document.getElementById('mockOtpToken');
        if (tempAuthUser && mockOtp) {
          const otpStr = tempAuthUser.otp;
          mockOtp.innerText = otpStr.slice(0, 3) + ' ' + otpStr.slice(3);
        }
      }, 800);
      
    } else {
      if (fill) fill.style.width = `${biometricProgress}%`;
      
      const currentPhrase = scanPhrases.find(p => biometricProgress <= p.threshold);
      if (currentPhrase && statusText) {
        statusText.innerText = currentPhrase.phrase;
      }
    }
  }, 100);
}

function endFingerprintSweep() {
  const pad = document.getElementById('fingerprintTouchPad');
  if (pad) pad.classList.remove('scanning');
  
  if (biometricInterval) {
    clearInterval(biometricInterval);
    biometricInterval = null;
  }
  
  if (biometricProgress < 100) {
    biometricProgress = 0;
    const fill = document.getElementById('progressBarFill');
    if (fill) fill.style.width = '0%';
    const statusText = document.getElementById('scannerStatus');
    if (statusText) {
      statusText.innerText = 'SCAN INTERRUPTED - HOLD PRESSURE REQUIRED';
      statusText.style.color = '#ff5050';
    }
  }
}

function submitTwofa() {
  const codeInput = document.getElementById('authTwofaCode');
  const alertDiv = document.getElementById('twofaAlert');
  if (!codeInput || !alertDiv) return;
  
  const cleanCode = codeInput.value.replace(/\s+/g, '');
  if (!tempAuthUser) return;
  
  if (cleanCode === tempAuthUser.otp) {
    alertDiv.innerText = '';
    alertDiv.style.color = 'var(--glow-emerald)';
    alertDiv.innerText = 'AUTHORIZATION GRANTED. DECRYPTING VAULT KEY...';
    
    // Save session (normalize role casing to Title Case so dashboard IDs match)
    const rawRole = tempAuthUser.role || '';
    const normRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      role: normRole,
      name: tempAuthUser.username,
      initials: tempAuthUser.initials,
      title: tempAuthUser.title
    }));
    
    // Save backend token (use an offline placeholder token when running local fallback)
    if (tempAuthUser.token) {
      localStorage.setItem('kiis_portal_token', tempAuthUser.token);
    } else {
      localStorage.setItem('kiis_portal_token', 'offline-token');
    }
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } else {
    alertDiv.innerText = 'SECURITY TOKEN INVALID - HASH VECTOR DRIFT';
  }
}

function abortScan() {
  const overlay = document.getElementById('bioOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
  
  if (biometricInterval) {
    clearInterval(biometricInterval);
    biometricInterval = null;
  }
  biometricProgress = 0;
  tempAuthUser = null;
  
  const userInput = document.getElementById('authUsername');
  const pwdInput = document.getElementById('authPassword');
  const codeInput = document.getElementById('authTwofaCode');
  if (userInput) userInput.value = '';
  if (pwdInput) pwdInput.value = '';
  if (codeInput) codeInput.value = '';
}

// Auto-open staff modal when URL contains staff hash (supports direct links)
window.addEventListener('load', () => {
  try {
    const h = window.location.hash || '';
    if (h.includes('#staff') || h.includes('#/staff/login')) {
      openStaffModal();
    }
  } catch (e) {
    // ignore
  }
});

window.addEventListener('hashchange', () => {
  try {
    const h = window.location.hash || '';
    if (h.includes('#staff') || h.includes('#/staff/login')) {
      openStaffModal();
    }
  } catch (e) {}
});

// --- STAFF PORTAL ACTIONS ---
function openStaffModal() {
  const overlay = document.getElementById('staffOverlay');
  if (!overlay) return;
  
  // Clear and reset staff input fields
  const userInp = document.getElementById('staffUsername');
  const pwdInp = document.getElementById('staffPassword');
  const alertDiv = document.getElementById('staffAlert');
  if (userInp) userInp.value = '';
  if (pwdInp) pwdInp.value = '';
  if (alertDiv) {
    alertDiv.innerText = '';
    alertDiv.style.color = '#ff5050';
  }
  
  // Default staff modal to Admin login to expose admin panel quickly
  setStaffRole('Admin');
  overlay.classList.add('show');
}

function closeStaffModal() {
  const overlay = document.getElementById('staffOverlay');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

function setStaffRole(role) {
  // Update state variable for staff role validation
  currentScanRole = role; // Re-uses the active scanning role from the main flow
  
  const empTab = document.getElementById('tabEmployee');
  const admTab = document.getElementById('tabAdmin');
  
  if (empTab) empTab.classList.remove('active');
  if (admTab) admTab.classList.remove('active');
  
  if (role === 'Employee' && empTab) {
    empTab.classList.add('active');
  } else if (role === 'Admin' && admTab) {
    admTab.classList.add('active');
  }
  
  const alertDiv = document.getElementById('staffAlert');
  if (alertDiv) alertDiv.innerText = '';
}

async function submitStaffPassword() {
  const userInput = document.getElementById('staffUsername');
  const pwdInput = document.getElementById('staffPassword');
  const alertDiv = document.getElementById('staffAlert');
  
  if (!userInput || !pwdInput || !alertDiv) return;
  
  const username = userInput.value.trim();
  const password = pwdInput.value;
  
  if (!username) {
    alertDiv.innerText = 'ACCESS ERROR - IDENTITY FIELD REQUIRED';
    return;
  }
  
  alertDiv.style.color = 'var(--glow-cyan)';
  alertDiv.innerText = 'CONNECTING TO KIIS MAINFRAME...';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      const data = await res.json();
      
      if (data.role.toLowerCase() !== currentScanRole.toLowerCase()) {
        alertDiv.style.color = '#ff5050';
        alertDiv.innerText = `ACCESS DENIED - ROLE MISMATCH (AUTHORIZED AS ${data.role.toUpperCase()})`;
        return;
      }
      
      const initials = username.split(' ').map(n=>n[0]).join('').toUpperCase();
      let title = 'Staff Operator';
      if (data.role === 'admin') title = 'Systems Admin';
      else if (data.role === 'manager') title = 'Vault Manager';
      else if (data.role === 'employee') title = 'Clearing Operator';
      
      let otp = '555666';
      if (data.role === 'admin') otp = '888999';
      else if (data.role === 'manager') otp = '777888';
      
      tempAuthUser = {
        username: username,
        role: currentScanRole,
        otp: otp,
        initials: initials,
        title: title,
        token: data.access_token
      };
      
      // Close staff modal
      closeStaffModal();
      
      // Open biometric overlay directly at biometric validation stage
      const bioOverlay = document.getElementById('bioOverlay');
      if (bioOverlay) {
        // Set up biometric stage variables
        const label = document.getElementById('authRoleLabel');
        if (label) label.innerText = currentScanRole;
        
        document.getElementById('stagePassword').style.display = 'none';
        document.getElementById('stageBiometric').style.display = 'block';
        document.getElementById('stageTwofa').style.display = 'none';
        
        biometricProgress = 0;
        const fill = document.getElementById('progressBarFill');
        if (fill) fill.style.width = '0%';
        const statusText = document.getElementById('scannerStatus');
        if (statusText) {
          statusText.innerText = 'SENSOR PAD STANDBY';
          statusText.style.color = 'var(--glow-cyan)';
        }
        const subtextText = document.getElementById('scannerSubtext');
        if (subtextText) {
          subtextText.innerText = 'Press and hold sensor pad to run sweep diagnostic.';
        }
        
        bioOverlay.classList.add('show');
      }
      return;
    } else {
      const err = await res.json();
      alertDiv.style.color = '#ff5050';
      alertDiv.innerText = `ACCESS DENIED - ${err.detail || 'SECURITY CREDENTIAL MISMATCH'}`;
      return;
    }
  } catch (e) {
    console.warn("Backend down. Falling back to local offline simulation mode for staff.", e);
    // Offline simulation fallback
    const credsList = getCredentials();
    const matchedCred = credsList.find(c => 
      c.username.toLowerCase() === username.toLowerCase() && 
      c.role.toLowerCase() === currentScanRole.toLowerCase()
    );
    
    if (matchedCred && password === matchedCred.password) {
      tempAuthUser = matchedCred;
      closeStaffModal();
      
      const bioOverlay = document.getElementById('bioOverlay');
      if (bioOverlay) {
        const label = document.getElementById('authRoleLabel');
        if (label) label.innerText = currentScanRole;
        
        document.getElementById('stagePassword').style.display = 'none';
        document.getElementById('stageBiometric').style.display = 'block';
        document.getElementById('stageTwofa').style.display = 'none';
        
        biometricProgress = 0;
        const fill = document.getElementById('progressBarFill');
        if (fill) fill.style.width = '0%';
        const statusText = document.getElementById('scannerStatus');
        if (statusText) {
          statusText.innerText = 'SENSOR PAD STANDBY';
          statusText.style.color = 'var(--glow-cyan)';
        }
        const subtextText = document.getElementById('scannerSubtext');
        if (subtextText) {
          subtextText.innerText = 'Press and hold sensor pad to run sweep diagnostic.';
        }
        
        bioOverlay.classList.add('show');
      }
    } else {
      alertDiv.style.color = '#ff5050';
      alertDiv.innerText = 'ACCESS DENIED - SECURITY CREDENTIAL MISMATCH (OFFLINE)';
    }
  }
}


// ==================== DASHBOARD INTEGRATION (dashboard.html) ====================

// Initialize customizable header elements based on session role
async function initDashboardSession() {
  const session = getSession();
  
  const badge = document.getElementById('systemModeBadge');
  const namePrf = document.getElementById('userNameProfile');
  const rolePrf = document.getElementById('userRoleProfile');
  const avatarInit = document.getElementById('avatarInitials');
  
  if (badge) badge.innerText = `${session.role.toUpperCase()} SECURE-CORE`;
  if (namePrf) namePrf.innerText = session.name;
  if (rolePrf) rolePrf.innerText = session.title;
  if (avatarInit) {
    avatarInit.innerText = session.initials;
    if (session.role === 'Admin') {
      avatarInit.style.color = '#ff5050';
      avatarInit.style.borderColor = 'rgba(255, 80, 80, 0.4)';
      avatarInit.style.textShadow = '0 0 10px rgba(255, 80, 80, 0.6)';
    } else if (session.role === 'Employee') {
      avatarInit.style.color = 'var(--glow-emerald)';
      avatarInit.style.borderColor = 'rgba(0, 230, 118, 0.4)';
      avatarInit.style.textShadow = '0 0 10px rgba(0, 230, 118, 0.6)';
    } else if (session.role === 'Manager') {
      avatarInit.style.color = 'var(--glow-cyan)';
      avatarInit.style.borderColor = 'rgba(0, 255, 255, 0.4)';
      avatarInit.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.6)';
    } else if (session.role === 'Customer') {
      avatarInit.style.color = 'var(--glow-emerald)';
      avatarInit.style.borderColor = 'rgba(0, 230, 118, 0.4)';
      avatarInit.style.textShadow = '0 0 10px rgba(0, 230, 118, 0.6)';
    }
  }

  // Strict conditional rendering: completely scrub and detach unauthorized desktops from the DOM!
  const allowedDesktopId = `desktop${session.role}`;
  const desktops = document.querySelectorAll('.role-desktop');
  desktops.forEach(d => {
    if (d.id !== allowedDesktopId) {
      d.remove(); // Purge unauthorized elements completely from DOM markup!
    } else {
      d.classList.add('show-desktop');
    }
  });

  // If customer, completely detach administrative sidebar controls to prevent leakages
  if (session.role === 'Customer') {
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (sidebar) {
      sidebar.remove(); // Detach administrative sidebar completely!
    }
    const currentDesktopEl = document.getElementById(allowedDesktopId);
    if (currentDesktopEl) {
      currentDesktopEl.style.width = '100%';
    }
  }

  // Trigger dedicated DB table renderers based on role
  if (session.role === 'Admin') {
    renderAdminStaffTable();
  } else if (session.role === 'Manager') {
    renderManagerOverrideTable();
  } else if (session.role === 'Employee') {
    renderEmployeeSupportQueue();
  } else if (session.role === 'Customer') {
    let bal = 0.0;
    let accNum = 'KIIS-VAL-09432-SEC';
    try {
      const res = await fetch(`${BACKEND_URL}/api/customer/accounts`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const accounts = await res.json();
        if (accounts && accounts.length > 0) {
          bal = accounts[0].balance;
          accNum = accounts[0].account_number;
          customerBalanceValue = bal;
          
          const vaultIdEl = document.querySelector('.vault-id');
          if (vaultIdEl) vaultIdEl.innerText = accNum;
        }
      }
    } catch (e) {
      console.warn("Using local storage fallback for customer balance.", e);
      const balances = getBalances();
      bal = balances[session.name];
      if (bal === undefined) {
        bal = 100000.00; // Default fallback for new customers
        balances[session.name] = bal;
        saveBalances(balances);
      }
      customerBalanceValue = bal;
    }
    
    const custBalEl = document.getElementById('customerBalance');
    if (custBalEl) {
      custBalEl.innerText = `$${customerBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
  }

  // Update HUD telemetry stats per role
  const load = document.getElementById('hudLedgerLoad');
  const activeNodes = document.getElementById('hudActiveNodes');
  const threatLevel = document.getElementById('hudThreatLevel');
  
  if (session.role === 'Admin') {
    if (load) load.innerText = '14.2 GigaFLOPs';
    if (activeNodes) activeNodes.innerText = '5 / 5 ONLINE';
    if (threatLevel) {
      threatLevel.innerText = 'MINIMAL';
      threatLevel.style.color = '#00ff87';
    }
  } else if (session.role === 'Manager') {
    try {
      const res = await fetch(`${BACKEND_URL}/api/manager/liquidity`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const telemetry = await res.json();
        const reserves = telemetry.total_reserves_usd || 0;
        if (load) load.innerText = `Reserves: $${reserves.toLocaleString()}`;
        if (activeNodes) activeNodes.innerText = `${telemetry.active_account_count} Nodes Online`;
      }
    } catch (e) {
      console.warn("Using offline fallback for manager liquidity telemetry.", e);
      if (load) load.innerText = 'RESERVE UNBLOCKED';
      if (activeNodes) activeNodes.innerText = 'OVERRIDE DEPLOYED';
    }
    if (threatLevel) {
      threatLevel.innerText = '$50,000,000 CAP';
      threatLevel.style.color = 'var(--glow-cyan)';
    }
  } else if (session.role === 'Employee') {
    const tickets = getTickets();
    if (load) load.innerText = `${tickets.length} TICKETS OPEN`;
    if (activeNodes) activeNodes.innerText = 'FLOW VECTOR NOMINAL';
    if (threatLevel) {
      threatLevel.innerText = 'LEVEL 2 ACTIVE';
      threatLevel.style.color = 'var(--glow-cyan)';
    }
  } else if (session.role === 'Customer') {
    if (load) load.innerText = `$${customerBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    if (activeNodes) activeNodes.innerText = 'VAULT NOMINAL';
    if (threatLevel) {
      threatLevel.innerText = 'MAXIMUM';
      threatLevel.style.color = 'var(--glow-emerald)';
    }
  }
}

// Side navigation selection states
function selectSidebar(element) {
  const buttons = document.querySelectorAll('.sidebar-icon');
  buttons.forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  
  // Inject mock alert to show system reaction
  addAuditLog('INFO', `Navigated viewport matrix to secure channel #${Math.floor(Math.random() * 100)}`);
}


// ==================== DYNAMIC MAINFRAME TABLE RENDERERS ====================

async function renderAdminStaffTable() {
  const tbody = document.getElementById('adminStaffTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: getAuthHeader()
    });
    if (res.ok) {
      const users = await res.json();
      users.forEach(u => {
        const initials = u.username.split(' ').map(n=>n[0]).join('').toUpperCase();
        const mappedRole = u.role.charAt(0).toUpperCase() + u.role.slice(1);
        const isOnline = true; // active by default in DB
        const stateText = isOnline ? 'ONLINE' : 'OFFLINE';
        const stateClass = isOnline ? 'state-online' : 'state-offline';
        
        let avatarColor = 'var(--glow-cyan)';
        let avatarBorder = 'rgba(0, 255, 255, 0.3)';
        if (mappedRole === 'Admin') {
          avatarColor = '#ff5050';
          avatarBorder = 'rgba(255, 80, 80, 0.3)';
        } else if (mappedRole === 'Employee') {
          avatarColor = 'var(--glow-emerald)';
          avatarBorder = 'rgba(0, 230, 118, 0.3)';
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="table-user">
              <div class="table-user-pic" style="color: ${avatarColor}; border-color: ${avatarBorder};">${initials}</div>
              <div><strong>${u.username}</strong></div>
            </div>
          </td>
          <td><span class="table-badge tier-${mappedRole.toLowerCase() === 'customer' ? 'manager' : mappedRole.toLowerCase()}">${mappedRole}</span></td>
          <td><span class="table-badge ${stateClass}">${stateText}</span></td>
          <td>
            ${u.username === 'Alex Mercer' 
              ? `<button class="btn-table-action" onclick="auditEmployee('${u.username}', '${mappedRole}')">AUDIT</button>` 
              : `<button class="btn-table-action danger" onclick="revokeAccess('${u.username}', '${mappedRole}')">REVOKE</button>`
            }
          </td>
        `;
        tbody.appendChild(tr);
      });
      return;
    }
  } catch (e) {
    console.warn("Using offline credentials fallback for admin staff table.", e);
  }
  
  // OFFLINE FALLBACK
  const creds = getCredentials();
  creds.forEach(c => {
    const initials = c.initials || c.username.split(' ').map(n=>n[0]).join('').toUpperCase();
    const isOnline = c.active !== false;
    const stateText = isOnline ? 'ONLINE' : 'OFFLINE';
    const stateClass = isOnline ? 'state-online' : 'state-offline';
    
    let avatarColor = 'var(--glow-cyan)';
    let avatarBorder = 'rgba(0, 255, 255, 0.3)';
    if (c.role === 'Admin') {
      avatarColor = '#ff5050';
      avatarBorder = 'rgba(255, 80, 80, 0.3)';
    } else if (c.role === 'Employee') {
      avatarColor = 'var(--glow-emerald)';
      avatarBorder = 'rgba(0, 230, 118, 0.3)';
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="table-user">
          <div class="table-user-pic" style="color: ${avatarColor}; border-color: ${avatarBorder};">${initials}</div>
          <div><strong>${c.username}</strong></div>
        </div>
      </td>
      <td><span class="table-badge tier-${c.role.toLowerCase() === 'customer' ? 'manager' : c.role.toLowerCase()}">${c.role}</span></td>
      <td><span class="table-badge ${stateClass}">${stateText}</span></td>
      <td>
        ${isOnline 
          ? (c.username === 'Alex Mercer' 
              ? `<button class="btn-table-action" onclick="auditEmployee('${c.username}', '${c.role}')">AUDIT</button>` 
              : `<button class="btn-table-action danger" onclick="revokeAccess('${c.username}', '${c.role}')">REVOKE</button>`)
          : `<button class="btn-table-action" onclick="elevateTier('${c.username}')">ACTIVATE</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function renderManagerOverrideTable() {
  const tbody = document.getElementById('managerOverrideTable');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/manager/transactions`, {
      headers: getAuthHeader()
    });
    if (res.ok) {
      const txs = await res.json();
      if (txs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-family: var(--font-mono); font-size: 0.8rem;">NO PENDING OVERRIDES - LEDGER SECURE</td></tr>`;
        return;
      }
      txs.forEach(t => {
        const tr = document.createElement('tr');
        const txName = t.reference_uuid.substring(0, 8).toUpperCase();
        const route = `Account #${t.sender_id || 'EXTERNAL'} &rarr; Account #${t.receiver_id || 'EXTERNAL'}`;
        tr.innerHTML = `
          <td><span style="font-family: var(--font-mono); color: var(--glow-cyan);">${txName}</span></td>
          <td>${route}</td>
          <td><strong style="color: var(--glow-emerald);">$${t.amount.toLocaleString()} USD</strong></td>
          <td><span class="table-badge state-online">✓ COMPLETED</span></td>
        `;
        tbody.appendChild(tr);
      });
      return;
    }
  } catch (e) {
    console.warn("Using offline manager overrides table fallback.", e);
  }

  const wires = getWires();
  if (wires.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 3rem 0; font-family: var(--font-mono); font-size: 0.8rem;">NO PENDING OVERRIDES - LEDGER SECURE</td></tr>`;
    return;
  }
  
  wires.forEach(w => {
    const tr = document.createElement('tr');
    tr.id = w.id;
    tr.innerHTML = `
      <td><span style="font-family: var(--font-mono); color: var(--glow-cyan);">${w.txName}</span></td>
      <td>${w.route}</td>
      <td><strong style="color: var(--glow-emerald);">$${w.amount.toLocaleString()} ${w.asset}</strong></td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn-table-action" onclick="approveWireOverride('${w.id}', '${w.txName}', ${w.amount})">APPROVE HASH</button>
          <button class="btn-table-action danger" onclick="quarantineWireOverride('${w.id}', '${w.txName}')">QUARANTINE</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function renderEmployeeSupportQueue() {
  const queue = document.getElementById('employeeSupportQueue');
  if (!queue) return;
  queue.innerHTML = '';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/employee/vkyc/pending`, {
      headers: getAuthHeader()
    });
    if (res.ok) {
      const pendingAccounts = await res.json();
      
      const load = document.getElementById('hudLedgerLoad');
      if (load) load.innerText = `${pendingAccounts.length} WORKFLOWS OPEN`;
      
      if (pendingAccounts.length === 0) {
        queue.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3.5rem 0; width:100%; font-family: var(--font-mono); font-size: 0.8rem;">ALL ESCALATIONS RESOLVED - DESK READY</div>`;
        return;
      }
      
      pendingAccounts.forEach(acc => {
        const accId = acc.id;
        const div = document.createElement('div');
        div.className = 'support-ticket-item';
        div.id = `vkyc-acc-${accId}`;
        div.innerHTML = `
          <div class="ticket-meta">
            <span class="ticket-user">Customer ID #${acc.user_id} (${acc.account_type.toUpperCase()} Account)</span>
            <span class="ticket-desc">Pending vKYC verification for Account ${acc.account_number}. Aadhaar / PAN validations required.</span>
            <span class="ticket-tag priority-high">High Priority</span>
          </div>
          <button class="btn-table-action" onclick="resolveTicket(${accId}, 'Customer #${acc.user_id}')">RESOLVE</button>
        `;
        queue.appendChild(div);
      });
      return;
    }
  } catch (e) {
    console.warn("Using offline fallback support tickets queue.", e);
  }

  const tickets = getTickets();
  
  const load = document.getElementById('hudLedgerLoad');
  if (load) load.innerText = `${tickets.length} TICKETS OPEN`;

  if (tickets.length === 0) {
    queue.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3.5rem 0; width:100%; font-family: var(--font-mono); font-size: 0.8rem;">ALL ESCALATIONS RESOLVED - DESK READY</div>`;
    return;
  }
  
  tickets.forEach(t => {
    const div = document.createElement('div');
    div.className = 'support-ticket-item';
    div.id = t.id;
    div.innerHTML = `
      <div class="ticket-meta">
        <span class="ticket-user">${t.user}</span>
        <span class="ticket-desc">${t.desc}</span>
        <span class="ticket-tag ${t.priorityClass}">${t.priority} Priority</span>
      </div>
      <button class="btn-table-action" onclick="resolveTicket('${t.id}', '${t.user}')">RESOLVE</button>
    `;
    queue.appendChild(div);
  });
}


// ==================== INTERACTIVE ROLE MAIN ACTIONS ====================

// --- ADMIN CREATIONS & AUDITS ---
async function registerNewUser(event) {
  if (event) event.preventDefault();
  
  const name = document.getElementById('regName').value.trim();
  const role = document.getElementById('regRole').value;
  const pwd = document.getElementById('regPwd').value.trim();
  const otp = document.getElementById('regOtp').value.trim();
  
  if (!name || !pwd || !otp) return;
  
  const initials = name.split(' ').map(n=>n[0]).join('').toUpperCase();
  let title = 'Staff Operator';
  if (role === 'Admin') title = 'Systems Admin';
  else if (role === 'Manager') title = 'Vault Manager';
  else if (role === 'Customer') title = 'Retail Client';
  
  try {
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@kiisbank.com`;
    const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        username: name,
        email: email,
        password: pwd,
        phone: "+41 44 000 0000",
        role: role.toLowerCase()
      })
    });
    
    if (res.ok) {
      const newUser = await res.json();
      
      if (role === 'Customer') {
        const initialBal = parseFloat(document.getElementById('regBalance').value) || 0;
        await fetch(`${BACKEND_URL}/api/admin/accounts/provision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            user_id: newUser.id,
            initial_deposit: initialBal,
            account_type: 'savings'
          })
        });
      }
      
      addAuditLog('SEC', `REGISTERED: Access keys active for ${role.toUpperCase()} node: ${name}. Database synchronized.`);
      renderAdminStaffTable();
      
      document.getElementById('regName').value = '';
      document.getElementById('regPwd').value = '';
      document.getElementById('regOtp').value = '';
      document.getElementById('regBalance').value = '0';
      
      alert(`ACCESS NODE REGISTERED (ONLINE):\n\nClearance: ${role.toUpperCase()}\nIdentity: ${name}\nMainframe keys written.`);
      return;
    } else {
      const err = await res.json();
      alert(`Access node registration failed: ${err.detail || 'Clearance conflict'}`);
      return;
    }
  } catch (e) {
    console.warn("Backend down. Falling back to local offline user registration mode.", e);
  }

  // OFFLINE FALLBACK
  const creds = getCredentials();
  if (creds.some(c => c.username.toLowerCase() === name.toLowerCase())) {
    alert("Clearance Conflict: An access profile with that username already exists.");
    return;
  }
  
  creds.push({
    username: name,
    role: role,
    password: pwd,
    otp: otp,
    initials: initials,
    title: title,
    active: true
  });
  saveCredentials(creds);
  
  if (role === 'Customer') {
    const balances = getBalances();
    const initialBal = parseFloat(document.getElementById('regBalance').value) || 0;
    balances[name] = initialBal;
    saveBalances(balances);
  }
  
  addAuditLog('SEC', `REGISTERED: Access keys active for ${role.toUpperCase()} node: ${name}. Code OTP initialized (OFFLINE).`);
  renderAdminStaffTable();
  
  document.getElementById('regName').value = '';
  document.getElementById('regPwd').value = '';
  document.getElementById('regOtp').value = '';
  document.getElementById('regBalance').value = '0';
  
  alert(`ACCESS NODE REGISTERED (OFFLINE):\n\nClearance: ${role.toUpperCase()}\nIdentity: ${name}\nMainframe keys written.`);
}

function toggleRegBalanceField(role) {
  const group = document.getElementById('regBalanceGroup');
  if (group) {
    group.style.display = (role === 'Customer') ? 'block' : 'none';
  }
}

function revokeAccess(name, role) {
  const creds = getCredentials();
  const index = creds.findIndex(c => c.username.toLowerCase() === name.toLowerCase());
  if (index !== -1) {
    creds[index].active = false;
    saveCredentials(creds);
    addAuditLog('SEC', `OPERATOR SUSPEND: Access tokens revoked for ${role.toUpperCase()}: ${name}. Connection locked.`);
    renderAdminStaffTable();
  }
}

function elevateTier(name) {
  const creds = getCredentials();
  const index = creds.findIndex(c => c.username.toLowerCase() === name.toLowerCase());
  if (index !== -1) {
    creds[index].active = true;
    saveCredentials(creds);
    addAuditLog('SEC', `OPERATOR ELEVATE: Access clearance restored on node: ${name}. Mainframe active.`);
    renderAdminStaffTable();
  }
}

// --- MANAGER DESKTOP CONTROLS ---
function approveWireOverride(rowId, txName, amount) {
  const wires = getWires();
  const filtered = wires.filter(w => w.id !== rowId);
  saveWires(filtered);
  
  const row = document.getElementById(rowId);
  if (row) {
    row.style.opacity = '0';
    row.style.transform = 'translateX(25px)';
    row.style.transition = 'all 0.4s ease';
    setTimeout(() => {
      renderManagerOverrideTable();
    }, 400);
    
    addAuditLog('TX', `MANAGER ACTION: High-value wire override approved for ${txName} ($${amount.toLocaleString()}).`);
  }
}

function quarantineWireOverride(rowId, txName) {
  const wires = getWires();
  const filtered = wires.filter(w => w.id !== rowId);
  saveWires(filtered);
  
  const row = document.getElementById(rowId);
  if (row) {
    row.style.opacity = '0';
    row.style.transform = 'translateX(-25px)';
    row.style.transition = 'all 0.4s ease';
    setTimeout(() => {
      renderManagerOverrideTable();
    }, 400);
    
    addAuditLog('SEC', `QUARANTINE TRIGGERED: Transaction override denied for ${txName} on security audit vector.`);
  }
}

function adjustSlider(id, value, prefix, suffix) {
  const readout = document.getElementById(`readout${id}`);
  if (readout) {
    const numericVal = parseInt(value);
    readout.innerText = `${prefix}${numericVal.toLocaleString()}${suffix}`;
    addAuditLog('INFO', `VAULT PARAMS: ${id} cap limit modified to ${prefix}${numericVal.toLocaleString()}${suffix} by Manager Lee.`);
  }
}

// --- EMPLOYEE DESKTOP CONTROLS ---
async function resolveTicket(ticketId, userName) {
  if (typeof ticketId === 'number') {
    try {
      const res = await fetch(`${BACKEND_URL}/api/employee/vkyc/verify/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        addAuditLog('INFO', `CLEARANCE GRANTED: vKYC approved for ${userName}. Ledger nodes activated.`);
        
        const item = document.getElementById(`vkyc-acc-${ticketId}`);
        if (item) {
          item.style.opacity = '0';
          item.style.transform = 'translateY(15px)';
          item.style.transition = 'all 0.4s ease';
          setTimeout(() => {
            renderEmployeeSupportQueue();
          }, 400);
        } else {
          renderEmployeeSupportQueue();
        }
        return;
      } else {
        const err = await res.json();
        alert(`Failed to approve vKYC: ${err.detail || 'Error'}`);
        return;
      }
    } catch (e) {
      console.warn("Backend Down. Falling back to local resolveTicket logic.", e);
    }
  }

  const tickets = getTickets();
  const filtered = tickets.filter(t => t.id !== ticketId);
  saveTickets(filtered);
  
  const item = document.getElementById(ticketId);
  if (item) {
    item.style.opacity = '0';
    item.style.transform = 'translateY(15px)';
    item.style.transition = 'all 0.4s ease';
    setTimeout(() => {
      renderEmployeeSupportQueue();
      
      const load = document.getElementById('hudLedgerLoad');
      if (load) load.innerText = `${filtered.length} TICKETS OPEN`;
    }, 400);
    
    addAuditLog('INFO', `CLEARANCE GRANTED: Support ticket resolved for ${userName}. Biometric tokens flushed.`);
  }
}

function submitManualPost(event) {
  if (event) event.preventDefault();
  
  const source = document.getElementById('manualSource').value;
  const dest = document.getElementById('manualDest').value;
  const amount = parseInt(document.getElementById('manualAmount').value);
  
  if (source === dest) {
    alert("Manual Inject Drifting Error: Source and destination hubs must be distinct.");
    return;
  }
  
  addAuditLog('TX', `INJECT TRANSACTION: Dispatched manual ledger wire of $${amount.toLocaleString()} from ${source} Node to ${dest} Node.`);
  
  // Trigger particle generation inside nodeMap if available
  if (typeof nodes !== 'undefined' && nodes.length > 0) {
    const startNode = nodes.find(n => n.label === source);
    const endNode = nodes.find(n => n.label === dest);
    if (startNode && endNode) {
      particles.push(new Packet(startNode, endNode));
      startNode.isPulsing = true;
      startNode.pulse = 0;
    }
  }
  
  // Reset amount input
  document.getElementById('manualAmount').value = '';
}

// --- CUSTOMER DESKTOP CONTROLS ---
let customerBalanceValue = 1248500.00;
let customerWireSigned = false;

function signCustomerWire() {
  const pad = document.getElementById('custWireFingerprint');
  const status = document.getElementById('custFingerprintStatus');
  const submitBtn = document.getElementById('custWireSubmitBtn');
  
  if (!pad || !status || !submitBtn) return;
  
  pad.classList.add('scanning');
  status.innerText = "CAPTURING SCAN...";
  status.style.color = "var(--glow-cyan)";
  
  setTimeout(() => {
    pad.classList.remove('scanning');
    pad.style.borderColor = "var(--glow-emerald)";
    pad.style.boxShadow = "var(--neon-emerald-glow)";
    pad.querySelector('svg').style.color = "var(--glow-emerald)";
    
    status.innerText = "HASH VERIFIED - SIGNED";
    status.style.color = "var(--glow-emerald)";
    
    // Enable submit button
    customerWireSigned = true;
    submitBtn.style.opacity = "1";
    submitBtn.style.pointerEvents = "auto";
  }, 1000);
}

async function submitCustomerWire(event) {
  if (event) event.preventDefault();
  
  if (!customerWireSigned) return;
  
  const wallet = document.getElementById('custWallet').value;
  const amount = parseFloat(document.getElementById('custAmount').value);
  const asset = document.getElementById('custAsset').value;
  
  const vaultIdEl = document.querySelector('.vault-id');
  const senderAccountNumber = vaultIdEl ? vaultIdEl.innerText : 'KIIS-VAL-09432-SEC';
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/customer/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        amount: amount,
        sender_account_number: senderAccountNumber,
        receiver_account_number: wallet
      })
    });
    
    if (res.ok) {
      const tx = await res.json();
      
      customerBalanceValue -= amount;
      
      const balText = document.getElementById('customerBalance');
      const balHud = document.getElementById('hudLedgerLoad');
      
      if (balText) {
        balText.innerText = `$${customerBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      }
      if (balHud) {
        balHud.innerText = `$${customerBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
      }
      
      alert(`DISPATCHED SECURE CORE WIRE (ONLINE):\n\nSuccessfully transmitted $${amount.toLocaleString()} ${asset} to account ${wallet}.\nReference Hash: ${tx.reference_uuid}`);
      addAuditLog('TX', `CLIENT WIRE DISPATCHED: Cryptographic wire transfer of $${amount.toLocaleString()} signed and settled in DB.`);
      
      document.getElementById('custWallet').value = '';
      document.getElementById('custAmount').value = '';
      customerWireSigned = false;
      
      const pad = document.getElementById('custWireFingerprint');
      const status = document.getElementById('custFingerprintStatus');
      const submitBtn = document.getElementById('custWireSubmitBtn');
      
      if (pad) {
        pad.style.borderColor = "";
        pad.style.boxShadow = "";
        pad.querySelector('svg').style.color = "";
      }
      if (status) {
        status.innerText = "STANDBY CLEARANCE";
        status.style.color = "";
      }
      if (submitBtn) {
        submitBtn.style.opacity = "0.5";
        submitBtn.style.pointerEvents = "none";
      }
      return;
    } else {
      const err = await res.json();
      alert(`Ledger Wire Rejected: ${err.detail || 'Transfer failed'}`);
      return;
    }
  } catch (e) {
    console.warn("Backend Down. Falling back to local offline transfer logic.", e);
  }

  if (amount > customerBalanceValue) {
    alert("Cryptographic Deficit: Insufficient liquidity clearance in this vault sector.");
    return;
  }
  
  customerBalanceValue -= amount;
  
  const session = getSession();
  const balances = getBalances();
  balances[session.name] = customerBalanceValue;
  saveBalances(balances);
  
  const balText = document.getElementById('customerBalance');
  const balHud = document.getElementById('hudLedgerLoad');
  
  if (balText) {
    balText.innerText = `$${customerBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  }
  if (balHud) {
    balHud.innerText = `$${customerBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
  }
  
  alert(`DISPATCHED SECURE CORE WIRE (OFFLINE):\n\nSuccessfully transmitted $${amount.toLocaleString()} ${asset} to address ${wallet}.`);
  addAuditLog('TX', `CLIENT WIRE DISPATCHED: Cryptographic wire transfer of $${amount.toLocaleString()} signed and cleared.`);
  
  document.getElementById('custWallet').value = '';
  document.getElementById('custAmount').value = '';
  customerWireSigned = false;
  
  const pad = document.getElementById('custWireFingerprint');
  const status = document.getElementById('custFingerprintStatus');
  const submitBtn = document.getElementById('custWireSubmitBtn');
  
  if (pad) {
    pad.style.borderColor = "";
    pad.style.boxShadow = "";
    pad.querySelector('svg').style.color = "";
  }
  if (status) {
    status.innerText = "STANDBY CLEARANCE";
    status.style.color = "";
  }
  if (submitBtn) {
    submitBtn.style.opacity = "0.5";
    submitBtn.style.pointerEvents = "none";
  }
}


// ==================== DYNAMIC 3D TRANSACTION NETWORK NODE MAP ====================
let canvas, ctx;
let nodes = [];
let particles = [];
let dragNode = null;
let animationFrameId = null;

// Standard cities representing central nodes
const hubCities = ['Zürich', 'Singapore', 'New York', 'London', 'Tokyo'];

class Node {
  constructor(x, y, label) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 4 + 8;
    this.label = label;
    this.pulse = 0;
    this.isPulsing = false;
    this.alert = false;
    this.alertTimer = 0;
  }

  update(width, height) {
    if (this === dragNode) return;
    
    // Slight drift logic
    this.x += this.vx;
    this.y += this.vy;
    
    // Spring back to base center bounds slightly
    const dx = this.baseX - this.x;
    const dy = this.baseY - this.y;
    this.x += dx * 0.005;
    this.y += dy * 0.005;
    
    // Boundary collision
    if (this.x - this.radius < 0 || this.x + this.radius > width) this.vx *= -1;
    if (this.y - this.radius < 0 || this.y + this.radius > height) this.vy *= -1;

    // Pulse animation logic
    if (this.isPulsing) {
      this.pulse += 0.15;
      if (this.pulse > Math.PI * 2) {
        this.pulse = 0;
        this.isPulsing = false;
      }
    }
    
    if (this.alert) {
      this.alertTimer--;
      if (this.alertTimer <= 0) {
        this.alert = false;
      }
    }
  }

  draw(context) {
    const isAlert = this.alert;
    const mainColor = isAlert ? 'rgb(255, 60, 60)' : (this.label === 'Zürich' ? 'var(--glow-emerald)' : 'var(--glow-cyan)');
    const shadowGlow = isAlert ? '0 0 15px rgba(255, 60, 60, 0.8)' : (this.label === 'Zürich' ? 'var(--neon-emerald-glow)' : 'var(--neon-cyan-glow)');
    
    // 3D sphere representation using radial gradient
    const grad = context.createRadialGradient(
      this.x - this.radius * 0.2, this.y - this.radius * 0.2, this.radius * 0.1,
      this.x, this.y, this.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, mainColor);
    grad.addColorStop(1, '#05080c');
    
    // Pulsing outer halo vector ring
    if (this.isPulsing || isAlert) {
      const ringRad = this.radius * (1 + (isAlert ? Math.sin(Date.now() * 0.01) * 0.5 + 0.8 : Math.sin(this.pulse) * 1));
      context.beginPath();
      context.arc(this.x, this.y, ringRad, 0, Math.PI * 2);
      context.strokeStyle = isAlert ? 'rgba(255, 60, 60, 0.4)' : 'rgba(0, 255, 255, 0.3)';
      context.lineWidth = 1;
      context.stroke();
    }
    
    // Actual Node Circle
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fillStyle = grad;
    context.fill();
    
    // Label Display overlay
    context.font = "bold 9px 'Space Grotesk'";
    context.fillStyle = isAlert ? '#ff5050' : 'var(--text-primary)';
    context.textAlign = 'center';
    context.fillText(this.label.toUpperCase(), this.x, this.y - this.radius - 8);
  }
}

// Drifting packets representing routing transactions
class Packet {
  constructor(startNode, endNode) {
    this.startNode = startNode;
    this.endNode = endNode;
    this.progress = 0;
    this.speed = Math.random() * 0.01 + 0.005;
    this.color = Math.random() > 0.5 ? 'var(--glow-cyan)' : 'var(--glow-emerald)';
  }

  update() {
    this.progress += this.speed;
    return this.progress >= 1;
  }

  draw(context) {
    const x = this.startNode.x + (this.endNode.x - this.startNode.x) * this.progress;
    const y = this.startNode.y + (this.endNode.y - this.startNode.y) * this.progress;
    
    context.beginPath();
    context.arc(x, y, 3, 0, Math.PI * 2);
    context.fillStyle = this.color;
    context.shadowColor = this.color === 'var(--glow-cyan)' ? 'rgba(0, 255, 255, 0.8)' : 'rgba(0, 230, 118, 0.8)';
    context.shadowBlur = 8;
    context.fill();
    context.shadowBlur = 0; // reset
  }
}

function initNodeMap() {
  canvas = document.getElementById('nodeCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  
  resizeNodeCanvas();
  window.addEventListener('resize', resizeNodeCanvas);
  
  // Set up mouse events for 3D routing nodes dragging
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  
  // Map parameters
  resetNodeMap();
  
  // Trigger animation loop
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  tickNodeMap();
}

function resizeNodeCanvas() {
  const box = document.getElementById('nodeMapBox');
  if (box && canvas) {
    canvas.width = box.clientWidth;
    canvas.height = box.clientHeight;
  }
}

function resetNodeMap() {
  if (!canvas) return;
  nodes = [];
  particles = [];
  
  const w = canvas.width;
  const h = canvas.height;
  
  // Layout locations dynamically in a central high-tech web
  const positions = [
    { x: w * 0.25, y: h * 0.3, label: 'New York' },
    { x: w * 0.5, y: h * 0.25, label: 'London' },
    { x: w * 0.35, y: h * 0.7, label: 'Zürich' },
    { x: w * 0.65, y: h * 0.75, label: 'Singapore' },
    { x: w * 0.75, y: h * 0.35, label: 'Tokyo' }
  ];
  
  positions.forEach(pos => {
    nodes.push(new Node(pos.x, pos.y, pos.label));
  });
  
  addAuditLog('INFO', 'Routing Grid synchronized with 5 global node points.');
}

function tickNodeMap() {
  if (!canvas || !ctx) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw connecting laser vectors
  const maxDist = 200;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < maxDist) {
        const opacity = (1 - (dist / maxDist)) * 0.25;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = n1.alert || n2.alert ? `rgba(255, 60, 60, ${opacity * 1.5})` : `rgba(0, 255, 255, ${opacity})`;
        ctx.lineWidth = n1.alert || n2.alert ? 1.5 : 1;
        ctx.stroke();
      }
    }
  }

  // Draw HUD connecting vector updates
  nodes.forEach(node => {
    node.update(canvas.width, canvas.height);
    node.draw(ctx);
  });
  
  // Handle random mock packet routes
  if (Math.random() < 0.04 && nodes.length > 1) {
    const start = nodes[Math.floor(Math.random() * nodes.length)];
    let end = nodes[Math.floor(Math.random() * nodes.length)];
    while (start === end) {
      end = nodes[Math.floor(Math.random() * nodes.length)];
    }
    particles.push(new Packet(start, end));
  }
  
  // Draw transaction flow packets
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const finished = p.update();
    p.draw(ctx);
    if (finished) {
      p.endNode.isPulsing = true;
      p.endNode.pulse = 0;
      
      // Update global digital ledger telemetry stat briefly
      const load = document.getElementById('hudLedgerLoad');
      if (load) {
        load.innerText = `${(Math.random() * 8 + 12).toFixed(2)} GigaFLOPs`;
      }
      particles.splice(i, 1);
    }
  }
  
  // Update live cursor telemetry indices in canvas text frame
  const coordsText = document.getElementById('overlayCoords');
  if (coordsText) {
    if (dragNode) {
      coordsText.innerText = `LOCKED X:${Math.round(dragNode.x)} Y:${Math.round(dragNode.y)}`;
      coordsText.style.color = '#ff5050';
    } else {
      coordsText.innerText = 'DYN_STEADY_ROUTING';
      coordsText.style.color = 'var(--glow-cyan)';
    }
  }

  animationFrameId = requestAnimationFrame(tickNodeMap);
}

// Drag & Drop mechanisms
function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const dx = mouseX - node.x;
    const dy = mouseY - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < node.radius + 10) {
      dragNode = node;
      node.vx = 0;
      node.vy = 0;
      addAuditLog('INFO', `Manual override locked on routing hub: ${node.label}`);
      break;
    }
  }
}

function handleMouseMove(e) {
  if (!dragNode) return;
  const rect = canvas.getBoundingClientRect();
  dragNode.x = e.clientX - rect.left;
  dragNode.y = e.clientY - rect.top;
}

function handleMouseUp() {
  if (dragNode) {
    addAuditLog('INFO', `Override released. Recalibrating route vector vectors.`);
    dragNode.vx = (Math.random() - 0.5) * 0.4;
    dragNode.vy = (Math.random() - 0.5) * 0.4;
    dragNode = null;
  }
}

// Threat Inject Simulation
function simulateAttack() {
  if (nodes.length === 0) return;
  
  // Pick random city to attack
  const target = nodes[Math.floor(Math.random() * nodes.length)];
  target.alert = true;
  target.alertTimer = 350; // frames alert is visible
  
  // Update HUD threat indices
  const level = document.getElementById('hudThreatLevel');
  if (level) {
    level.innerText = 'ACTIVE ATTACK INJECTED';
    level.style.color = '#ff5050';
    level.style.textShadow = '0 0 10px rgba(255, 80, 80, 0.8)';
  }
  
  addAuditLog('SEC', `LEDGER THREAT INJECTED: Irregular buffer overload detected on node ${target.label.toUpperCase()}.`);
  
  // Trigger system recovery sequence
  setTimeout(() => {
    if (level) {
      level.innerText = 'MINIMAL';
      level.style.color = '#00ff87';
      level.style.textShadow = '0 0 5px rgba(0, 230, 118, 0.3)';
    }
    addAuditLog('SEC', `System quarantine engaged on Node ${target.label.toUpperCase()}. Route vector recovered.`);
  }, 4000);
}


// ==================== HOLOGRAPHIC ANALYTICS LINE CHART ====================
let chartCanvas, chartCtx;
let chartPoints = [];
const maxPoints = 30;
let lineProgress = 0;

function initHoloChart() {
  chartCanvas = document.getElementById('holoChartCanvas');
  if (!chartCanvas) return;
  chartCtx = chartCanvas.getContext('2d');
  
  resizeChartCanvas();
  window.addEventListener('resize', resizeChartCanvas);
  
  // Populate starting chart vectors representing ledger volume
  for (let i = 0; i < maxPoints; i++) {
    chartPoints.push(generateChartValue(i));
  }
  
  // Render and update chart values
  setInterval(() => {
    chartPoints.shift();
    chartPoints.push(generateChartValue(chartPoints.length));
  }, 1000);
  
  tickHoloChart();
}

function resizeChartCanvas() {
  const box = document.getElementById('chartContainerBox');
  if (box && chartCanvas) {
    chartCanvas.width = box.clientWidth;
    chartCanvas.height = box.clientHeight;
  }
}

function generateChartValue(index) {
  // Complex combination of trigonometric waves representing high-fidelity trading
  const wave1 = Math.sin(index * 0.2) * 20;
  const wave2 = Math.cos(index * 0.45) * 12;
  const randomBump = Math.random() * 8;
  return 60 + wave1 + wave2 + randomBump; // percentage scale
}

function tickHoloChart() {
  if (!chartCanvas || !chartCtx) return;
  
  const w = chartCanvas.width;
  const h = chartCanvas.height;
  
  chartCtx.clearRect(0, 0, w, h);
  
  // Draw digital holographic grid lines
  const gridRows = 5;
  const gridCols = 8;
  chartCtx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
  chartCtx.lineWidth = 1;
  
  for (let r = 1; r < gridRows; r++) {
    const y = (h / gridRows) * r;
    chartCtx.beginPath();
    chartCtx.moveTo(0, y);
    chartCtx.lineTo(w, y);
    chartCtx.stroke();
  }
  
  for (let c = 1; c < gridCols; c++) {
    const x = (w / gridCols) * c;
    chartCtx.beginPath();
    chartCtx.moveTo(x, 0);
    chartCtx.lineTo(x, h);
    chartCtx.stroke();
  }

  // Draw chart curve
  if (chartPoints.length > 1) {
    const step = w / (maxPoints - 1);
    
    // Draw area fill under curve with sleek emerald/cyan vertical gradient
    chartCtx.beginPath();
    chartCtx.moveTo(0, h);
    
    for (let i = 0; i < chartPoints.length; i++) {
      const x = i * step;
      const val = chartPoints[i];
      // Map percentage val to height coordinates
      const y = h - (val / 100) * (h * 0.7) - (h * 0.15);
      chartCtx.lineTo(x, y);
    }
    
    chartCtx.lineTo(w, h);
    chartCtx.closePath();
    
    const fillGrad = chartCtx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(0, 255, 255, 0.08)');
    fillGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
    chartCtx.fillStyle = fillGrad;
    chartCtx.fill();

    // Draw main glowing neon ledger vector line
    chartCtx.beginPath();
    for (let i = 0; i < chartPoints.length; i++) {
      const x = i * step;
      const val = chartPoints[i];
      const y = h - (val / 100) * (h * 0.7) - (h * 0.15);
      if (i === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    }
    
    chartCtx.strokeStyle = 'var(--glow-cyan)';
    chartCtx.lineWidth = 2.5;
    chartCtx.shadowColor = 'rgba(0, 255, 255, 0.4)';
    chartCtx.shadowBlur = 10;
    chartCtx.stroke();
    chartCtx.shadowBlur = 0; // reset

    // Draw hovering telemetry dot sweep
    lineProgress += 0.005;
    if (lineProgress > 1) lineProgress = 0;
    
    const currIndex = Math.floor(lineProgress * (maxPoints - 1));
    const nextIndex = Math.min(currIndex + 1, maxPoints - 1);
    const progressSegment = (lineProgress * (maxPoints - 1)) - currIndex;
    
    const p1x = currIndex * step;
    const p1y = h - (chartPoints[currIndex] / 100) * (h * 0.7) - (h * 0.15);
    const p2x = nextIndex * step;
    const p2y = h - (chartPoints[nextIndex] / 100) * (h * 0.7) - (h * 0.15);
    
    const dotX = p1x + (p2x - p1x) * progressSegment;
    const dotY = p1y + (p2y - p1y) * progressSegment;
    const dotVal = chartPoints[currIndex] + (chartPoints[nextIndex] - chartPoints[currIndex]) * progressSegment;
    
    // Outer pulsing tracker circle
    chartCtx.beginPath();
    chartCtx.arc(dotX, dotY, 9, 0, Math.PI * 2);
    chartCtx.fillStyle = 'rgba(0, 255, 255, 0.15)';
    chartCtx.strokeStyle = 'var(--glow-cyan)';
    chartCtx.lineWidth = 1;
    chartCtx.stroke();
    chartCtx.fill();
    
    // Core white tracker node
    chartCtx.beginPath();
    chartCtx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    chartCtx.fillStyle = '#ffffff';
    chartCtx.fill();
    
    // Holographic popup tracker details
    chartCtx.font = "bold 8px 'Space Grotesk'";
    chartCtx.fillStyle = 'var(--glow-emerald)';
    chartCtx.textAlign = 'left';
    chartCtx.fillText(`LEDGER RATE: $${(dotVal * 124000).toLocaleString(undefined, {maximumFractionDigits:0})} / SEC`, dotX + 15, dotY - 5);
  }

  requestAnimationFrame(tickHoloChart);
}


// ==================== CYBER SECURITY AUDIT TERMINAL ====================
const mockAuditPhrases = [
  { prefix: 'INFO', text: 'Central transaction routing ledger synced with Switzerland backup core.' },
  { prefix: 'SEC', text: 'Unauthorized port probe detected on Tokyo Node firewall. Blocked IP: 185.220.101.4' },
  { prefix: 'TX', text: 'Clearing settled: $5,240,000 Swiss Francs from London to Zürich Ledger Node.' },
  { prefix: 'INFO', text: 'System diagnostics complete. Subsecond desynchronization values healthy.' },
  { prefix: 'TX', text: 'Cryptographic block signature generated for Transaction Batch #94032.' },
  { prefix: 'SEC', text: 'Security override protocol bypassed: Manager Tier access granted to Marcus Lee.' },
  { prefix: 'INFO', text: 'Biometric authorization key pairs refreshed for 4 global admin terminals.' },
  { prefix: 'TX', text: 'Inter-ledger clearance executed: $14,800,000 retail assets settled.' }
];

function initAuditLogs() {
  const container = document.getElementById('terminalLogs');
  if (!container) return;
  
  // Starting diagnostic messages
  addAuditLog('INFO', 'Initializing secure operational vault logs...');
  addAuditLog('INFO', 'Synchronizing terminal connection metrics...');
  addAuditLog('SEC', 'Central Firewall Integrity check: 100% OK.');
  
  // Generate random live prompts
  setInterval(() => {
    const index = Math.floor(Math.random() * mockAuditPhrases.length);
    const phrase = mockAuditPhrases[index];
    addAuditLog(phrase.prefix, phrase.text);
  }, 3500);
}

function addAuditLog(prefix, text) {
  const container = document.getElementById('terminalLogs');
  if (!container) return;
  
  const timestamp = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = 'terminal-line';
  
  let prefixClass = 'prefix-info';
  if (prefix === 'SEC') prefixClass = 'prefix-sec';
  if (prefix === 'TX') prefixClass = 'prefix-tx';
  
  line.innerHTML = `
    <span class="timestamp">[${timestamp}]</span>
    <span class="${prefixClass}">[${prefix}]</span>
    <span>${text}</span>
  `;
  
  container.appendChild(line);
  
  // auto-scroll to lock bottom
  container.scrollTop = container.scrollHeight;
}

function clearLogs() {
  const container = document.getElementById('terminalLogs');
  if (container) {
    container.innerHTML = '';
    addAuditLog('INFO', 'Terminal Audit logs purged by Operator override.');
  }
}


// ==================== INTERACTIVE STAFF & CLEARING CONTROLS ====================

function auditEmployee(name, tier) {
  addAuditLog('INFO', `Triggering central audit profile fetch on ${tier.toUpperCase()}: ${name}`);
  alert(`KIIS Bank Central Audit\n-------------------------------\nIDENTITY: ${name}\nPORTAL TIER: ${tier}\nSTATUS: Verified Secure Session`);
}

function revokeAccess(name, tier) {
  addAuditLog('SEC', `OPERATOR ACTION: Revoking session token for ${tier.toUpperCase()}: ${name}`);
  alert(`ACTION CONFIRMED:\nAccess keys revoked for ${name} (${tier}).\nSession closed in ledger database.`);
}

function elevateTier(name) {
  addAuditLog('SEC', `OPERATOR ACTION: Active status requested on dormant Admin identity: ${name}`);
  alert(`Vault Core Update:\nSystem Administrator ${name} has been set to ONLINE status.\nSecurity keypairs mapped.`);
}


// ==================== MAIN PAGE ROUTING ENGINE ====================
window.addEventListener('DOMContentLoaded', () => {
  // Check if we are on Login screen
  if (document.getElementById('portalsGrid')) {
    // Enable interactive mouse 3D tilt adjustments on portal cards
    const cards = document.querySelectorAll('.portal-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        const angleX = (yc - y) / 10;
        const angleY = (x - xc) / 10;
        
        card.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-8px) scale(1.02)`;
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = `rotateX(0deg) rotateY(0deg) translateY(0px) scale(1)`;
      });
    });
  }
  
  // Check if we are on Dashboard screen
  if (document.getElementById('nodeCanvas')) {
    initDashboardSession();
    initNodeMap();
    initHoloChart();
    initAuditLogs();
  }
});
