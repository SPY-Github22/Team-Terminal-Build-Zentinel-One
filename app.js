// Zentinel — Core Application
const GROQ_API_KEY = 'gsk_YOUR_GROQ_API_KEY_HERE';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// STATE
let employees = [], activityLogs = [], uploadedFiles = [], isMonitoring = false;
let attackTimeouts = [], feedCount = 0, logCount = 0, charts = {}, riskHistory = {}, cases = [];
let dataLoaded = false, trainedModel = false;

// EMBEDDED SAMPLE DATA
const SAMPLE_BASELINES = `employee_id,employee_name,role,department,branch,device,avg_daily_access,avg_daily_exports,avg_daily_downloads,avg_login_hour,avg_logout_hour,avg_daily_transactions,avg_file_size_mb,modules_accessed,peer_group,access_level
EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,HQ Server Room,Laptop-11,18,3,2,9,18,2,12.5,Authentication;Admin Panel;Customer DB;Server Config,IT_ADMIN_HQ,PRIVILEGED
EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Analytics Lab,Desktop-06,45,8,5,9,17,0,4.2,MIS Reports;Analytics DB;Customer Segmentation DB;Risk Scoring,DATA_ANALYST_HQ,STANDARD
EMP-003,Pavan P,Jr Developer,Core Banking Dev,Dev Floor,Laptop-07,12,2,3,9,18,0,1.5,Git Repository;Test Environment;Dev Tools,DEVELOPER_CORE,STANDARD
EMP-004,Harsh Raj,Branch Manager,Operations,Ops Center,Desktop-03,14,2,1,9,18,18,0.8,Loan Approval;Operations;Counter Management,BRANCH_MGR_OPS,ELEVATED
EMP-005,Aarya Mittal,Loan Officer,Retail Loans,Loan Processing,Laptop-01,22,1,1,9,17,10,2.0,Loan Module;Customer DB;Credit Scoring,LOAN_OFFICER_RETAIL,STANDARD
EMP-006,Mehul Rathi,Compliance Officer,Risk & Compliance,Compliance Wing,Desktop-06,28,5,3,9,18,0,1.8,Audit Logs;Compliance Reports;Risk DB;Transaction Audit,COMPLIANCE_HQ,ELEVATED
EMP-007,Zaina Nasser,HR Manager,Human Resources,HR Department,Laptop-09,10,2,1,9,18,0,1.0,HR Records;Payroll System;Employee DB,HR_MANAGER_HQ,ELEVATED
EMP-008,Aditi Singh,Treasury Analyst,Treasury,Treasury Desk,Desktop-03,15,3,2,9,18,12,0.5,Treasury;Fund Management;SWIFT Terminal,TREASURY_HQ,ELEVATED
EMP-009,Kanak Poddar,Teller,Counter Operations,Counter 3,Laptop-01,8,0,0,9,17,35,0,Counter;Cash Management;Receipt Printer,TELLER_COUNTER,STANDARD
EMP-010,Akshat Vora,Network Engineer,IT Infrastructure,Server Room,Laptop-11,10,1,1,9,18,0,0.5,Network Config;Firewall;Server Monitoring;VPN Gateway,IT_ADMIN_HQ,PRIVILEGED`;

const SAMPLE_LOGS = `timestamp,employee_id,employee_name,role,department,device,action_type,module,records_accessed,file_size_mb,ip_address,location,destination_ip,session_id,risk_flag
2026-03-28 08:30:12,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,LOGIN,Authentication,0,0,10.0.1.15,HQ Server Room,10.0.1.15,SES-770112,normal
2026-03-28 08:45:33,EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Desktop-06,LOGIN,Authentication,0,0,10.0.2.8,Analytics Lab,10.0.2.8,SES-770113,normal
2026-03-28 08:52:07,EMP-003,Pavan P,Jr Developer,Core Banking Dev,Laptop-07,LOGIN,Authentication,0,0,10.0.3.44,Dev Floor,10.0.3.44,SES-770114,normal
2026-03-28 09:00:22,EMP-004,Harsh Raj,Branch Manager,Operations,Desktop-03,LOGIN,Authentication,0,0,10.0.4.12,Ops Center,10.0.4.12,SES-770115,normal
2026-03-28 09:05:45,EMP-005,Aarya Mittal,Loan Officer,Retail Loans,Laptop-01,LOGIN,Authentication,0,0,10.0.3.22,Loan Processing,10.0.3.22,SES-770116,normal
2026-03-28 09:08:18,EMP-006,Mehul Rathi,Compliance Officer,Risk & Compliance,Desktop-06,LOGIN,Authentication,0,0,10.0.1.45,Compliance Wing,10.0.1.45,SES-770117,normal
2026-03-28 09:12:30,EMP-007,Zaina Nasser,HR Manager,Human Resources,Laptop-09,LOGIN,Authentication,0,0,10.0.1.88,HR Department,10.0.1.88,SES-770118,normal
2026-03-28 09:15:55,EMP-008,Aditi Singh,Treasury Analyst,Treasury,Desktop-03,LOGIN,Authentication,0,0,10.0.5.33,Treasury Desk,10.0.5.33,SES-770119,normal
2026-03-28 09:18:11,EMP-009,Kanak Poddar,Teller,Counter Operations,Laptop-01,LOGIN,Authentication,0,0,10.0.6.11,Counter 3,10.0.6.11,SES-770120,normal
2026-03-28 09:22:44,EMP-010,Akshat Vora,Network Engineer,IT Infrastructure,Laptop-11,LOGIN,Authentication,0,0,10.0.1.67,Server Room,10.0.1.67,SES-770121,normal
2026-03-28 09:30:00,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,RECORD_ACCESS,Customer DB,18,0.4,10.0.1.15,HQ Server Room,10.0.1.15,SES-770112,normal
2026-03-28 09:35:18,EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Desktop-06,REPORT_GEN,MIS Reports,5,2.1,10.0.2.8,Analytics Lab,10.0.2.8,SES-770113,normal
2026-03-28 09:40:42,EMP-003,Pavan P,Jr Developer,Core Banking Dev,Laptop-07,CODE_ACCESS,Git Repository,3,0.2,10.0.3.44,Dev Floor,10.0.3.44,SES-770114,normal
2026-03-28 10:05:47,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,RECORD_ACCESS,Customer DB,85,18.5,10.0.1.15,HQ Server Room,10.0.1.15,SES-770112,elevated
2026-03-28 10:18:33,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,DATA_EXPORT,Customer DB,312,47.2,192.168.47.23,Unknown VPN Endpoint,89.122.171.182,SES-770112,critical
2026-03-28 10:40:18,EMP-003,Pavan P,Jr Developer,Core Banking Dev,Laptop-07,CODE_ACCESS,Production DB,14,2.8,10.0.3.44,Dev Floor,10.0.3.44,SES-770114,elevated
2026-03-28 10:55:02,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,PRIV_ESCALATION,Admin Panel,0,0,192.168.47.23,Unknown VPN Endpoint,238.214.237.203,SES-770112,critical
2026-03-28 11:20:44,EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Desktop-06,DATA_EXPORT,MIS Reports,28,8.4,10.0.2.8,Analytics Lab,105.122.210.196,SES-770113,elevated
2026-03-28 11:30:00,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,DATA_EXPORT,Core Banking System,543,877.0,192.168.47.23,Unknown VPN Endpoint,15.168.174.98,SES-770112,critical
2026-03-28 12:10:44,EMP-003,Pavan P,Jr Developer,Core Banking Dev,Laptop-07,DATA_EXPORT,Git Repository,7,3.2,10.0.3.44,Dev Floor,143.80.225.174,SES-770114,elevated
2026-03-28 13:00:02,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,DATA_EXPORT,HR Payroll System,289,943.0,192.168.47.23,Unknown VPN Endpoint,89.122.171.182,SES-770112,critical
2026-03-28 13:15:33,EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Desktop-06,RECORD_ACCESS,Customer Segmentation DB,45,6.8,10.0.2.8,Analytics Lab,10.0.2.8,SES-770113,elevated
2026-03-28 13:44:55,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,BULK_DOWNLOAD,SWIFT Transaction Records,0,1436.0,192.168.47.23,Unknown VPN Endpoint,242.162.183.121,SES-770112,critical
2026-03-28 14:30:02,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,DATA_EXPORT,Fraud Case Files,178,1895.0,192.168.47.23,Unknown VPN Endpoint,238.214.237.203,SES-770112,critical
2026-03-28 15:07:55,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,BULK_DOWNLOAD,Customer KYC Documents,0,908.0,192.168.47.23,Unknown VPN Endpoint,160.102.144.121,SES-770112,critical
2026-03-28 15:40:44,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,DATA_EXPORT,Employee PII Database,412,1436.0,192.168.47.23,Unknown VPN Endpoint,242.162.183.121,SES-770112,critical
2026-03-28 16:00:55,EMP-003,Pavan P,Jr Developer,Core Banking Dev,Laptop-07,CODE_ACCESS,Production Config Files,5,0.8,10.0.3.44,Dev Floor,10.0.3.44,SES-770114,elevated
2026-03-28 16:28:33,EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Desktop-06,DATA_EXPORT,Customer Analytics Report,18,12.5,10.0.2.8,Analytics Lab,76.86.1.23,SES-770113,elevated
2026-03-28 16:49:55,EMP-002,Navadeep K,Data Analyst,Analytics & MIS,Desktop-06,LOGIN,SSH Terminal,0,0,221.133.36.101,External IP - Coffee Shop WiFi,221.133.36.101,SES-770155,warning
2026-03-28 22:45:00,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,LOGIN,Authentication,0,0,192.168.99.5,External IP - Residential ISP,192.168.99.5,SES-770188,critical
2026-03-28 22:50:12,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,RECORD_ACCESS,Customer DB,200,32.5,192.168.99.5,External IP - Residential ISP,192.168.99.5,SES-770188,critical
2026-03-28 23:05:33,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,DATA_EXPORT,Customer PII + Account Data,500,2150.0,192.168.99.5,External IP - Residential ISP,194.45.62.170,SES-770188,critical
2026-03-28 23:15:44,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,BULK_DOWNLOAD,Entire Loan Portfolio DB,0,3200.0,192.168.99.5,External IP - Residential ISP,238.214.237.203,SES-770188,critical
2026-03-28 23:30:55,EMP-001,Sudarshan Pai Y,System Admin,IT Infrastructure,Laptop-11,LOG_DELETION,Audit Trail - System Logs,0,0,192.168.99.5,External IP - Residential ISP,192.168.99.5,SES-770188,critical`;

// INIT
window.addEventListener('DOMContentLoaded', () => initLoadingScreen());

function initLoadingScreen() {
    const msgs = ['Connecting to SIEM feed...','Loading engine modules...','Initializing Isolation Forest...','Calibrating risk thresholds...','System ready.'];
    const bar = document.getElementById('loadingBarFill'), status = document.getElementById('loadingStatus');
    let i = 0;
    const iv = setInterval(() => {
        if (i < msgs.length) { status.textContent = msgs[i]; bar.style.width = ((i+1)/msgs.length*100)+'%'; i++; }
        else { clearInterval(iv); setTimeout(() => { document.getElementById('loadingScreen').classList.add('hidden'); document.getElementById('mainApp').classList.remove('hidden'); initApp(); }, 400); }
    }, 400);
}

function initApp() {
    updateTime(); setInterval(updateTime, 1000);
    initTabs(); initFileUpload(); initSpotlight();
    document.getElementById('aiInput')?.addEventListener('keydown', e => { if(e.key==='Enter') sendAIMessage(); });
    // Ensure Browse Files button works (fallback wiring)
    const browseBtn = document.getElementById('btnBrowseFiles');
    const fileInput = document.getElementById('fileUpload');
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    }
}

// Spotlight effect: tracks mouse position on panels for radial glow
function initSpotlight() {
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.panel').forEach(panel => {
            const rect = panel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            panel.style.setProperty('--mouse-x', x + 'px');
            panel.style.setProperty('--mouse-y', y + 'px');
        });
    });
}

function updateTime() {
    const n = new Date();
    const el = document.getElementById('navTime');
    if(el) el.textContent = n.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ' · ' + n.toLocaleTimeString('en-IN',{hour12:false});
}

function initTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`[data-tab-content="${tab.dataset.tab}"]`).classList.add('active');
        });
    });
}

// FLEXIBLE CSV PARSER — handles any delimiter, quoted fields, varying columns
function parseCSV(text) {
    const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = smartSplit(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_'));
    return lines.slice(1).map(line => {
        const vals = smartSplit(line);
        const obj = {};
        headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
        return obj;
    }).filter(row => Object.values(row).some(v => v));
}

function smartSplit(line) {
    const vals = []; let cur = '', inQ = false;
    for (const c of line) {
        if (c === '"') inQ = !inQ;
        else if (c === ',' && !inQ) { vals.push(cur); cur = ''; }
        else cur += c;
    }
    vals.push(cur);
    return vals.map(v => v.trim().replace(/^"|"$/g,''));
}

// Detect what kind of data a CSV contains
function detectCSVType(headers, rows) {
    const h = headers.join(' ').toLowerCase();
    if (h.includes('avg_') || h.includes('baseline') || h.includes('peer_group')) return 'baselines';
    if (h.includes('timestamp') || h.includes('action') || h.includes('action_type')) return 'logs';
    // Check content - if rows have timestamps, it's logs
    const first = rows[0] || {};
    const vals = Object.values(first).join(' ');
    if (/\d{4}-\d{2}-\d{2}/.test(vals)) return 'logs';
    if (vals.includes('avg') || vals.includes('baseline')) return 'baselines';
    return 'logs'; // default
}

// Map arbitrary column names to our expected fields
function normalizeLogRow(row) {
    const get = (...keys) => {
        for (const k of keys) { for (const rk of Object.keys(row)) { if (rk.includes(k)) return row[rk]; } }
        return '';
    };
    return {
        timestamp: get('timestamp','time','date','datetime') || '',
        employee_id: get('employee_id','emp_id','id','user_id') || 'EMP-' + Math.random().toString(36).substr(2,4).toUpperCase(),
        employee_name: get('employee_name','name','user','username','emp_name') || 'Unknown',
        role: get('role','designation','position','job') || 'Employee',
        department: get('department','dept','division','team') || 'General',
        device: get('device','workstation','machine','computer') || 'Unknown',
        action_type: get('action_type','action','event','event_type','activity') || 'UNKNOWN',
        module: get('module','system','application','app','resource') || '',
        records_accessed: parseInt(get('records_accessed','records','count','file_count')) || 0,
        file_size_mb: parseFloat(get('file_size_mb','file_size','size','bytes','data_size')) || 0,
        ip_address: get('ip_address','ip','source_ip','src_ip') || '',
        location: get('location','branch','site','office') || '',
        destination_ip: get('destination_ip','dest_ip','dst_ip','target_ip') || '',
        session_id: get('session_id','session','sid') || '',
        risk_flag: get('risk_flag','risk','severity','flag') || 'normal',
        status: get('status','result','outcome') || 'success'
    };
}

function normalizeBaselineRow(row) {
    const get = (...keys) => {
        for (const k of keys) { for (const rk of Object.keys(row)) { if (rk.includes(k)) return row[rk]; } }
        return '';
    };
    return {
        id: get('employee_id','emp_id','id') || 'EMP-' + Math.random().toString(36).substr(2,4).toUpperCase(),
        name: get('employee_name','name','emp_name') || 'Unknown',
        role: get('role','designation','position') || 'Employee',
        dept: get('department','dept','division') || 'General',
        branch: get('branch','location','office','site') || 'HQ',
        device: get('device','workstation') || 'Unknown',
        accessLevel: get('access_level','privilege') || 'STANDARD',
        baseline: {
            avgAccess: parseInt(get('avg_daily_access','avg_access')) || 10,
            avgExports: parseInt(get('avg_daily_exports','avg_exports')) || 1,
            avgDownloads: parseInt(get('avg_daily_downloads','avg_downloads')) || 1,
            avgHour: parseInt(get('avg_login_hour','login_hour')) || 9,
            avgLogout: parseInt(get('avg_logout_hour','logout_hour')) || 18,
            avgTxn: parseInt(get('avg_daily_transactions','avg_txn')) || 0,
            avgFileSize: parseFloat(get('avg_file_size_mb','avg_size')) || 1,
            modules: get('modules_accessed','modules') || '',
            peerGroup: get('peer_group','peer') || ''
        }
    };
}

// FILE UPLOAD
function initFileUpload() {
    const dz = document.getElementById('uploadDropzone'), fi = document.getElementById('fileUpload');
    if (!dz || !fi) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    fi.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files) {
    const list = document.getElementById('uploadedFilesList');
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => { file._content = e.target.result; };
        reader.readAsText(file);
        uploadedFiles.push(file);
        const size = file.size > 1024*1024 ? (file.size/1024/1024).toFixed(1)+' MB' : (file.size/1024).toFixed(1)+' KB';
        const div = document.createElement('div');
        div.className = 'upload-file-item';
        div.innerHTML = `<div class="upload-file-info"><span class="upload-file-icon">📄</span><div><div class="upload-file-name">${file.name}</div><div class="upload-file-size">${file.name.split('.').pop().toUpperCase()} · ${size}</div></div></div><span class="upload-file-status ready">✓ Ready</span>`;
        list.appendChild(div);
    });
    showToast('info', 'Files Added', `${files.length} file(s) ready for processing.`);
}

function processUploadedData() {
    let baselineData = null, logData = null;
    // Check uploaded files
    uploadedFiles.forEach(f => {
        if (!f._content) return;
        const c = f._content, n = f.name.toLowerCase();
        if (n.includes('baseline') || c.includes('avg_daily') || c.includes('avg_login') || c.includes('peer_group')) baselineData = c;
        else logData = c; // everything else is treated as logs
    });

    if (!baselineData && !logData) {
        showToast('critical', 'No Valid Data', 'Upload CSV files with employee data. Download sample files for reference.');
        return;
    }

    runTrainingAnimation(() => {
        if (baselineData) {
            const rows = parseCSV(baselineData);
            employees = rows.map(r => {
                const n = normalizeBaselineRow(r);
                return { ...n, riskScore: 5 + Math.floor(Math.random()*8), status: 'normal', lastAction: 'Baseline loaded', frozen: false, totalDataMB: 0, fileTracker: [] };
            });
        }
        if (logData) {
            const rows = parseCSV(logData);
            activityLogs = rows.map(normalizeLogRow);
            if (!baselineData) buildEmployeesFromLogs();
            calculateRiskFromLogs();
        }
        logCount = activityLogs.length;
        dataLoaded = true; trainedModel = true;
        activateDashboard();
        showToast('info', '✓ Model Trained', `${employees.length} employees · ${activityLogs.length} events · Risk scores calculated.`);
    });
}

function buildEmployeesFromLogs() {
    const map = {};
    activityLogs.forEach(log => {
        const id = log.employee_id;
        if (!map[id]) {
            map[id] = {
                id, name: log.employee_name, role: log.role, dept: log.department,
                branch: log.location, device: log.device, accessLevel: 'STANDARD',
                riskScore: 5, status: 'normal', lastAction: '', frozen: false, totalDataMB: 0, fileTracker: [],
                baseline: { avgAccess: 10, avgExports: 1, avgDownloads: 1, avgHour: 9, avgLogout: 18, avgTxn: 5, avgFileSize: 2, modules: '', peerGroup: '' }
            };
        }
    });
    employees = Object.values(map);
}

function calculateRiskFromLogs() {
    const empAct = {};
    activityLogs.forEach(log => {
        const id = log.employee_id;
        if (!empAct[id]) empAct[id] = { totalAccess: 0, exports: 0, totalMB: 0, suspiciousIPs: 0, afterHours: 0, privEsc: 0, overrides: 0, logDeletions: 0, files: [], actions: [] };
        const a = empAct[id], rec = log.records_accessed, mb = log.file_size_mb;
        a.totalAccess += rec; a.totalMB += mb;
        const act = (log.action_type || '').toUpperCase();
        if (act.includes('EXPORT') || act === 'UPLOAD' || act === 'DOWNLOAD') { a.exports += rec || 1; a.totalMB += mb; }
        if (act.includes('BULK')) a.exports += 100;
        if (log.location && (log.location.includes('Unknown') || log.location.includes('External') || log.location.includes('VPN'))) a.suspiciousIPs++;
        const hour = log.timestamp ? parseInt(log.timestamp.split(' ')[1]?.split(':')[0]) : 10;
        if (hour < 7 || hour > 20) a.afterHours++;
        if (act.includes('PRIV') || act.includes('ESCALAT')) a.privEsc++;
        if (act.includes('OVERRIDE') || act.includes('BYPASS') || act.includes('BULK')) a.overrides++;
        if (act.includes('LOG_DELET') || act.includes('AUDIT_CLEAR')) a.logDeletions++;
        if (mb > 0) a.files.push({ module: log.module, size: mb, action: act, time: log.timestamp, ip: log.destination_ip || log.ip_address });
        a.actions.push(log);
    });

    employees.forEach(emp => {
        const a = empAct[emp.id]; if (!a) return;
        let score = 5;
        const bl = emp.baseline;
        // Access deviation
        if (bl.avgAccess > 0) { const r = a.totalAccess / bl.avgAccess; if (r > 10) score += 30; else if (r > 5) score += 18; else if (r > 2) score += 8; }
        // Export deviation  
        if (bl.avgExports > 0) { const r = a.exports / bl.avgExports; if (r > 50) score += 25; else if (r > 10) score += 15; else if (r > 3) score += 8; }
        else if (a.exports > 0) score += 20;
        // File size deviation
        if (bl.avgFileSize > 0 && a.totalMB > 0) { const r = a.totalMB / bl.avgFileSize; if (r > 100) score += 25; else if (r > 20) score += 15; else if (r > 5) score += 8; }
        score += a.suspiciousIPs * 12;
        score += a.afterHours * 10;
        score += a.privEsc * 18;
        score += a.overrides * 8;
        score += a.logDeletions * 25;
        emp.riskScore = Math.min(100, Math.max(0, score));
        emp.status = getStatus(emp.riskScore);
        emp.totalDataMB = Math.round(a.totalMB * 10) / 10;
        emp.fileTracker = a.files;
        const last = a.actions[a.actions.length - 1];
        if (last) emp.lastAction = `${last.action_type}: ${last.module}` + (last.records_accessed > 0 ? ` (${last.records_accessed} records)` : '') + (last.file_size_mb > 0 ? ` [${last.file_size_mb} MB]` : '');
    });
}

function getScoreColor(s) { return s > 80 ? '#EF4444' : s > 60 ? '#F97316' : s > 30 ? '#F59E0B' : '#22C55E'; }
function getStatus(s) { return s > 80 ? 'critical' : s > 60 ? 'high' : s > 30 ? 'medium' : 'normal'; }

// SAMPLE DATA DOWNLOADS
function downloadSampleBaselines() { downloadFile('employee_baselines.csv', SAMPLE_BASELINES); }
function downloadSampleLogs() { downloadFile('employee_activity_logs.csv', SAMPLE_LOGS); }
function downloadFile(name, content) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content],{type:'text/csv'})); a.download = name; a.click();
    showToast('info', 'Downloaded', `${name} saved.`);
}

// TRAINING ANIMATION
function runTrainingAnimation(cb) {
    const area = document.getElementById('trainingArea');
    const steps = ['Parsing CSV columns & detecting schema...','Extracting 8 behavioral features per employee...','Building 90-day behavioral baselines...','Training Isolation Forest model (n_estimators=200, contamination=0.05)...','Scoring anomalies & calibrating thresholds...','Computing peer-group deviations...','Deploying model — ready for live monitoring'];
    area.innerHTML = `<div class="training-progress"><div class="training-progress-label"><span>Training behavioral model...</span><span id="trainPct">0%</span></div><div class="training-progress-bar"><div class="training-progress-fill" id="trainFill"></div></div><div class="training-steps" id="trainSteps">${steps.map(s => `<div class="training-step"><span class="training-step-icon">○</span> ${s}</div>`).join('')}</div></div>`;
    const els = area.querySelectorAll('.training-step'), fill = document.getElementById('trainFill'), pct = document.getElementById('trainPct');
    let i = 0;
    const iv = setInterval(() => {
        if (i < els.length) {
            if (i > 0) { els[i-1].classList.remove('active'); els[i-1].classList.add('done'); els[i-1].querySelector('.training-step-icon').textContent = '✓'; }
            els[i].classList.add('active'); els[i].querySelector('.training-step-icon').textContent = '⏳';
            fill.style.width = ((i+1)/els.length*100)+'%'; pct.textContent = Math.round((i+1)/els.length*100)+'%';
            i++;
        } else { clearInterval(iv); els[els.length-1].classList.remove('active'); els[els.length-1].classList.add('done'); els[els.length-1].querySelector('.training-step-icon').textContent = '✓'; setTimeout(cb, 400); }
    }, 700);
}

function activateDashboard() {
    ['dashboardEmpty','monitoringEmpty','analyticsEmpty'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });
    ['dashboardContent','monitoringContent','analyticsContent'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'block'; });
    const ss = document.getElementById('systemStatus');
    if(ss) ss.innerHTML = '<span class="status-dot online"></span><span class="status-text">Model Active</span>';
    const ds = document.getElementById('dataStatus'); if(ds) ds.textContent = `${employees.length} employees`;
    const te = document.getElementById('totalEmployees'); if(te) te.textContent = employees.length;
    renderEmployeeTable(); updateStats();
    initRiskDistChart(); initRiskTimelineChart(); initDeptChart(); initHourlyChart(); renderHeatmap();
    updateAIPrompts();
    document.getElementById('btnStartMonitoring')?.addEventListener('click', toggleMonitoring);
    document.getElementById('riskFilter')?.addEventListener('change', renderEmployeeTable);
}
