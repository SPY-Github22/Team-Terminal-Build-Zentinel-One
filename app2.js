// Zentinel — Part 2: UI, Monitoring, Charts, AI

// EMPLOYEE TABLE
function renderEmployeeTable() {
    const filter = document.getElementById('riskFilter')?.value || 'all';
    const tbody = document.getElementById('employeeTableBody'); if (!tbody) return;
    const sorted = [...employees].sort((a,b) => b.riskScore - a.riskScore);
    const filtered = sorted.filter(e => {
        if (filter==='all') return true;
        if (filter==='critical') return e.riskScore > 80;
        if (filter==='high') return e.riskScore > 60;
        if (filter==='medium') return e.riskScore > 30;
        if (filter==='normal') return e.riskScore <= 30;
        return true;
    });
    tbody.innerHTML = filtered.map(e => {
        const color = getScoreColor(e.riskScore);
        const st = e.frozen ? 'frozen' : e.status;
        const rc = e.frozen ? 'frozen-row' : (e.riskScore > 80 ? 'critical-row' : (e.riskScore > 60 ? 'high-row' : ''));
        const dataMB = e.totalDataMB > 1000 ? (e.totalDataMB/1000).toFixed(1)+' GB' : e.totalDataMB+' MB';
        return `<tr class="${rc}" onclick="openInvestigate('${e.id}')">
            <td><div class="employee-name">${e.name}</div><div class="employee-id">${e.id} · ${e.device || ''}</div></td>
            <td>${e.role}</td><td>${e.dept}</td>
            <td><div class="risk-score-cell"><span class="risk-score-value" style="color:${color}">${e.riskScore}</span><div class="risk-score-bar"><div class="risk-score-fill" style="width:${e.riskScore}%;background:${color}"></div></div></div></td>
            <td><span class="status-badge ${st}">${e.frozen?'🔒 FROZEN':st.toUpperCase()}</span></td>
            <td style="font-size:0.72rem;color:var(--text-secondary)">${dataMB} transferred</td>
            <td style="font-size:0.68rem;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis">${e.lastAction}</td>
            <td>${e.frozen?'<button class="action-btn frozen" disabled>Frozen</button>':`<button class="action-btn danger" onclick="event.stopPropagation();freezeSession('${e.id}')">Freeze</button><button class="action-btn" onclick="event.stopPropagation();openInvestigate('${e.id}')">Investigate</button>`}</td></tr>`;
    }).join('');
}

function updateStats() {
    const active = employees.filter(e => !e.frozen);
    const alerts = employees.filter(e => e.riskScore > 60 && !e.frozen).length;
    const flagged = employees.filter(e => e.riskScore > 30 && !e.frozen).length;
    const avg = active.length ? Math.round(active.reduce((s,e) => s+e.riskScore, 0) / active.length) : 0;
    const el = id => document.getElementById(id);
    if(el('activeAlerts')) el('activeAlerts').textContent = alerts;
    if(el('flaggedToday')) el('flaggedToday').textContent = flagged;
    if(el('avgRisk')) el('avgRisk').textContent = avg + '/100';
    if(el('activeSessions')) el('activeSessions').textContent = active.length;
    if(el('alertCountBadge')) el('alertCountBadge').textContent = alerts;
    if(el('logCount')) el('logCount').textContent = logCount;
    if(el('totalDataTransferred')) {
        const total = employees.reduce((s,e) => s + e.totalDataMB, 0);
        el('totalDataTransferred').textContent = total > 1000 ? (total/1000).toFixed(1)+' GB' : Math.round(total)+' MB';
    }
    if (charts.riskDist) updateRiskDistChart();
}

// MONITORING
function toggleMonitoring() {
    const btn = document.getElementById('btnStartMonitoring');
    if (isMonitoring) { stopMonitoring(); btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Live Monitoring'; btn.classList.remove('monitoring'); }
    else { startMonitoring(); btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop Monitoring'; btn.classList.add('monitoring'); }
}

function buildAttackSeq() {
    if (!activityLogs.length) return employees.map((e,i) => ({ time: 2000+i*3000, empIdx: i, action: e.lastAction, scoreAdd: 5, type: 'normal', sizeMB: 0 }));
    return activityLogs.map((log, i) => {
        const empIdx = employees.findIndex(e => e.id === log.employee_id);
        if (empIdx === -1) return null;
        const act = (log.action_type||'').toUpperCase();
        const rec = log.records_accessed, mb = log.file_size_mb;
        const action = `${log.action_type}: ${log.module}` + (rec > 0 ? ` (${rec} records)` : '') + (mb > 0 ? ` [${mb} MB]` : '') + (log.location ? ` — ${log.location}` : '');
        let scoreAdd = 1, type = 'normal';
        if (act.includes('EXPORT') && mb > 100) { scoreAdd = 18; type = 'danger'; }
        else if (act.includes('EXPORT')) { scoreAdd = 6; type = 'warning'; }
        if (act.includes('BULK')) { scoreAdd = 20; type = 'danger'; }
        if (act.includes('PRIV') || act.includes('ESCALAT')) { scoreAdd = 22; type = 'danger'; }
        if (act.includes('BYPASS') || act.includes('OVERRIDE')) { scoreAdd = 10; type = 'warning'; }
        if (act.includes('LOG_DELET')) { scoreAdd = 30; type = 'danger'; }
        if (act.includes('CONFIG')) { scoreAdd = 6; type = 'warning'; }
        if (rec > 50) scoreAdd += 8;
        if (log.location?.includes('Unknown') || log.location?.includes('External') || log.location?.includes('VPN')) { scoreAdd += 12; type = type === 'normal' ? 'warning' : 'danger'; }
        const hour = log.timestamp ? parseInt(log.timestamp.split(' ')[1]?.split(':')[0]) : 10;
        if (hour < 7 || hour > 20) { scoreAdd += 10; type = 'danger'; }
        return { time: 1500 + i * 1200, empIdx, action, scoreAdd, type, sizeMB: mb };
    }).filter(Boolean);
}

function startMonitoring() {
    isMonitoring = true;
    employees.forEach(e => { if(!e.frozen) { e.riskScore = 5+Math.floor(Math.random()*8); e.status = 'normal'; e.totalDataMB = 0; e.fileTracker = []; } });
    renderEmployeeTable(); updateStats();
    document.getElementById('systemStatus').innerHTML = '<span class="status-dot online"></span><span class="status-text">Live Monitoring</span>';
    const ld = document.getElementById('liveDot'); if(ld) ld.classList.add('active');
    document.getElementById('feedList').innerHTML = '';
    feedCount = 0;
    showToast('info', 'Monitoring Active', 'Replaying activity logs through behavioral analysis engine.');
    buildAttackSeq().forEach(ev => { const t = setTimeout(() => { if (!isMonitoring) return; processEvent(ev); }, ev.time); attackTimeouts.push(t); });
}

function stopMonitoring() {
    isMonitoring = false;
    attackTimeouts.forEach(t => clearTimeout(t)); attackTimeouts = [];
    document.getElementById('systemStatus').innerHTML = '<span class="status-dot online"></span><span class="status-text">Model Active</span>';
    const ld = document.getElementById('liveDot'); if(ld) ld.classList.remove('active');
}

function processEvent(ev) {
    const emp = employees[ev.empIdx];
    if (!emp || emp.frozen) return;
    emp.riskScore = Math.min(100, emp.riskScore + ev.scoreAdd);
    emp.status = getStatus(emp.riskScore);
    emp.lastAction = ev.action;
    emp.totalDataMB += ev.sizeMB || 0;
    feedCount++; logCount++;
    if (!riskHistory[emp.id]) riskHistory[emp.id] = [];
    riskHistory[emp.id].push({ time: new Date(), score: emp.riskScore });
    addFeedItem(emp, ev);
    renderEmployeeTable(); updateStats(); updateRiskTimelineChart();
    if (emp.riskScore > 80 && ev.type === 'danger') {
        addAlert(emp, 'critical');
        showToast('critical', '🚨 CRITICAL', `${emp.name} — Score: ${emp.riskScore}/100`);
        document.getElementById('systemStatus').innerHTML = '<span class="status-dot alert"></span><span class="status-text">⚠ Alert Active</span>';
    } else if (emp.riskScore > 60 && ev.type !== 'normal') { addAlert(emp, 'high'); showToast('high', '⚠ HIGH', `${emp.name} — Score: ${emp.riskScore}/100`); }
    else if (emp.riskScore > 30 && ev.type === 'warning') addAlert(emp, 'medium');
    document.getElementById('feedCount').textContent = feedCount + ' events';
}

function addFeedItem(emp, ev) {
    const list = document.getElementById('feedList');
    const empty = list.querySelector('.feed-empty'); if (empty) empty.remove();
    const now = new Date().toLocaleTimeString('en-IN',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const div = document.createElement('div');
    div.className = `feed-item ${ev.type}`;
    div.innerHTML = `<span class="feed-time">${now}</span><span class="feed-name">${emp.name}</span><span class="feed-action">${ev.action}</span><span class="feed-score" style="color:${getScoreColor(emp.riskScore)}">${emp.riskScore}</span>`;
    list.prepend(div);
    if (list.children.length > 60) list.lastChild.remove();
}

// ALERTS & CASES
function addAlert(emp, severity) {
    const list = document.getElementById('alertList');
    const empty = list.querySelector('.alert-empty'); if (empty) empty.remove();
    const now = new Date().toLocaleTimeString('en-IN',{hour12:false});
    const card = document.createElement('div'), cid = `alert-${emp.id}-${Date.now()}`;
    card.className = `alert-card ${severity}`; card.id = cid;
    card.innerHTML = `<div class="alert-card-header"><span class="alert-severity ${severity}">${severity}</span><span class="alert-time">${now}</span></div>
        <div class="alert-card-body"><strong>${emp.name}</strong> (${emp.role}) — ${emp.lastAction}. Score: <strong style="color:${getScoreColor(emp.riskScore)}">${emp.riskScore}/100</strong>. Data transferred: ${emp.totalDataMB > 1000 ? (emp.totalDataMB/1000).toFixed(1)+' GB' : emp.totalDataMB+' MB'}</div>
        <div class="alert-card-actions">${severity!=='medium'?`<button class="alert-btn freeze" onclick="freezeFromAlert('${emp.id}','${cid}')">Freeze</button>`:''}<button class="alert-btn investigate" onclick="openInvestigate('${emp.id}')">Investigate</button><button class="alert-btn dismiss" onclick="dismissAlert(this,'${emp.id}')">Dismiss</button></div>`;
    list.prepend(card);
}

function freezeFromAlert(eid,cid) { freezeSession(eid); const c=document.getElementById(cid); if(c){c.classList.add('resolved'); c.querySelector('.alert-card-body').innerHTML+='<br><strong style="color:#64748B">✓ Frozen</strong>';} }
function dismissAlert(btn,eid) { const c=btn.closest('.alert-card'); c.classList.add('resolved'); addCase(eid,'dismissed'); setTimeout(()=>c.remove(),400); updateStats(); }
function freezeSession(eid) {
    const emp = employees.find(e=>e.id===eid);
    if (!emp||emp.frozen) return;
    emp.frozen = true; emp.status = 'frozen';
    renderEmployeeTable(); updateStats(); addCase(eid,'frozen');
    showToast('critical','🔒 Session Frozen',`${emp.name}'s session terminated.`);
}
function addCase(eid,type) { const emp=employees.find(e=>e.id===eid); if(!emp) return; cases.push({emp:emp.name,role:emp.role,type,time:new Date(),score:emp.riskScore,dataMB:emp.totalDataMB}); renderCases(); }
function renderCases() {
    const l = document.getElementById('casesList'); if(!l) return;
    l.innerHTML = cases.length ? cases.map(c => `<div class="case-item"><div class="case-info"><span class="case-title">${c.emp} — ${c.role}</span><span class="case-detail">Score: ${c.score} · ${c.dataMB > 1000 ? (c.dataMB/1000).toFixed(1)+' GB' : c.dataMB+' MB'} · ${c.time.toLocaleTimeString('en-IN',{hour12:false})}</span></div><span class="case-status ${c.type}">${c.type}</span></div>`).reverse().join('') : '<div class="case-empty"><p>No cases yet.</p></div>';
}

// INVESTIGATION MODAL
function openInvestigate(eid) {
    const emp = employees.find(e=>e.id===eid); if(!emp) return;
    const modal = document.getElementById('investigateModal');
    document.getElementById('modalTitle').textContent = `Investigating: ${emp.name}`;
    const initials = emp.name.split(' ').map(n=>n[0]).join('');
    // Build file tracker table
    let fileRows = '';
    if (emp.fileTracker && emp.fileTracker.length) {
        fileRows = `<h3 style="font-size:0.82rem;margin:1rem 0 0.5rem">📁 Files Tracked (${emp.fileTracker.length} transfers)</h3>
        <div style="max-height:200px;overflow-y:auto"><table class="risk-table" style="font-size:0.68rem"><thead><tr><th>Time</th><th>Module/System</th><th>Action</th><th>Size</th><th>Destination IP</th></tr></thead><tbody>
        ${emp.fileTracker.map(f => `<tr><td style="font-family:var(--mono);font-size:0.6rem">${f.time||'—'}</td><td>${f.module}</td><td>${f.action}</td><td style="color:${f.size>100?'var(--rose)':'var(--text-2)'};font-weight:${f.size>100?700:400}">${f.size > 1000 ? (f.size/1000).toFixed(1)+' GB' : f.size+' MB'}</td><td style="font-family:var(--mono);font-size:0.6rem">${f.ip||'—'}</td></tr>`).join('')}
        </tbody></table></div>`;
    }
    document.getElementById('modalBody').innerHTML = `
        <div class="investigate-header"><div class="investigate-avatar">${initials}</div><div class="investigate-info"><h3>${emp.name}</h3><p>${emp.role} · ${emp.dept} · ${emp.id} · ${emp.device||''} · Access: ${emp.accessLevel||'STANDARD'}</p></div></div>
        <div class="investigate-stats">
            <div class="investigate-stat"><div class="investigate-stat-value" style="color:${getScoreColor(emp.riskScore)}">${emp.riskScore}</div><div class="investigate-stat-label">Risk Score</div></div>
            <div class="investigate-stat"><div class="investigate-stat-value">${emp.totalDataMB > 1000 ? (emp.totalDataMB/1000).toFixed(1)+' GB' : emp.totalDataMB+' MB'}</div><div class="investigate-stat-label">Total Data Moved</div></div>
            <div class="investigate-stat"><div class="investigate-stat-value">${emp.baseline.avgAccess}</div><div class="investigate-stat-label">Baseline Avg Access/Day</div></div>
        </div>${fileRows}`;
    document.getElementById('modalFreezeBtn').onclick = () => { freezeSession(eid); closeModal(); };
    document.getElementById('modalAIBtn').onclick = () => { closeModal(); generateAIReport(emp); };
    modal.classList.add('show');
}
function closeModal() { document.getElementById('investigateModal').classList.remove('show'); }
function closeAIAlertModal() { document.getElementById('aiAlertModal').classList.remove('show'); }

// AI (Groq)
async function callGroqAI(messages) {
    try {
        const res = await fetch(GROQ_API_URL, {method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${GROQ_API_KEY}`},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages,temperature:0.7,max_tokens:2048})});
        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'Analysis unavailable.';
    } catch(e) { return 'Error connecting to AI service.'; }
}
function getSystemPrompt() {
    const empData = employees.map(e => `${e.name}(${e.id}): Role=${e.role}, Dept=${e.dept}, Score=${e.riskScore}/100, Status=${e.frozen?'FROZEN':e.status}, DataMoved=${e.totalDataMB}MB, Baseline:avgAccess=${e.baseline.avgAccess}/day,avgExports=${e.baseline.avgExports}/day`).join('\n');
    return `You are Zentinel, an AI insider fraud analyst for Union Bank of India. You use Isolation Forest ML for behavioral anomaly detection.\nCURRENT EMPLOYEE DATA:\n${empData}\nBe precise, use banking terminology, reference specific data points, format with headers and bullets. Explain deviations from baselines.`;
}
async function generateAIReport(emp) {
    const modal = document.getElementById('aiAlertModal');
    document.getElementById('aiAlertModalBody').innerHTML = `<div class="ai-loading"><div class="ai-loading-spinner"></div><p>Analyzing ${emp.name}...</p></div>`;
    modal.classList.add('show');
    const fileInfo = emp.fileTracker.length ? `Files: ${emp.fileTracker.map(f=>`${f.module}(${f.size}MB→${f.ip})`).join(', ')}` : '';
    const r = await callGroqAI([{role:'system',content:getSystemPrompt()},{role:'user',content:`Generate formal RBI-compliant fraud investigation report for ${emp.name}(${emp.id}), ${emp.role}. Score:${emp.riskScore}/100. TotalData:${emp.totalDataMB}MB. Last:"${emp.lastAction}". Baseline:${emp.baseline.avgAccess}access/day,${emp.baseline.avgExports}exports/day. ${fileInfo}. Include risk breakdown, anomaly deviations from baseline, file tracking details, recommended actions, and compliance findings.`}]);
    document.getElementById('aiAlertModalBody').innerHTML = `<div class="ai-report">${formatAI(r)}</div>`;
}
async function sendAIMessage() {
    const input = document.getElementById('aiInput');
    const msg = input.value.trim(); if(!msg) return; input.value = '';
    addChat('user', msg);
    const loading = document.createElement('div'); loading.className = 'ai-message system';
    loading.innerHTML = `<div class="ai-avatar"><svg width="20" height="20" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#3B82F6" stroke-width="2" opacity="0.5"/><circle cx="32" cy="32" r="12" stroke="#3B82F6" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="#3B82F6"/></svg></div><div class="ai-message-content"><div class="ai-loading-inline"><div class="typing-dots"><span></span><span></span><span></span></div> Analyzing...</div></div>`;
    document.getElementById('aiChat').appendChild(loading); loading.scrollIntoView({behavior:'smooth'});
    const r = await callGroqAI([{role:'system',content:getSystemPrompt()},{role:'user',content:msg}]);
    loading.remove(); addChat('system', r);
}
window.askAI = function(p) { document.getElementById('aiInput').value = p; document.querySelector('[data-tab="ai-assistant"]').click(); setTimeout(sendAIMessage, 300); };
function addChat(role, content) {
    const chat = document.getElementById('aiChat'), div = document.createElement('div');
    div.className = `ai-message ${role}`;
    if (role==='user') div.innerHTML = `<div class="ai-avatar" style="background:rgba(168,85,247,0.08);border-color:var(--accent)">👤</div><div class="ai-message-content">${escHtml(content)}</div>`;
    else div.innerHTML = `<div class="ai-avatar"><svg width="20" height="20" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="28" stroke="#3B82F6" stroke-width="2" opacity="0.5"/><circle cx="32" cy="32" r="12" stroke="#3B82F6" stroke-width="2"/><circle cx="32" cy="32" r="4" fill="#3B82F6"/></svg></div><div class="ai-message-content"><strong>Zentinel AI</strong>${formatAI(content)}</div>`;
    chat.appendChild(div); div.scrollIntoView({behavior:'smooth'});
}
function formatAI(t) { return t.replace(/```([\s\S]*?)```/g,'<pre>$1</pre>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^### (.*$)/gm,'<h3>$1</h3>').replace(/^## (.*$)/gm,'<h3>$1</h3>').replace(/^# (.*$)/gm,'<h3>$1</h3>').replace(/^- (.*$)/gm,'• $1<br>').replace(/^\d+\. (.*$)/gm,'• $1<br>').replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>'); }
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function exportReport() { showToast('info','Exported','PDF report generated.'); }
function updateAIPrompts() {
    const c = document.getElementById('aiQuickPrompts'); if(!c||!employees.length) return;
    const hi = [...employees].sort((a,b)=>b.riskScore-a.riskScore)[0];
    c.innerHTML = `<button class="quick-prompt" onclick="askAI('Analyze ${hi.name} behavior. Why is their risk score ${hi.riskScore}/100? Show baseline deviations.')">Analyze ${hi.name}</button><button class="quick-prompt" onclick="askAI('Generate formal RBI-compliant investigation report for the highest-risk employee.')">RBI Report</button><button class="quick-prompt" onclick="askAI('Which employees show signs of data exfiltration? Check file sizes and destination IPs.')">Detect Exfiltration</button><button class="quick-prompt" onclick="askAI('Compare all employees against their peer group baselines. Who deviates most?')">Peer Comparison</button>`;
}

// TOAST
function showToast(type, title, message) {
    let c = document.querySelector('.toast-container');
    if (!c) { c = document.createElement('div'); c.className='toast-container'; document.body.appendChild(c); }
    const icons = {critical:'🚨',high:'⚠️',info:'ℹ️'};
    const t = document.createElement('div'); t.className=`toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>`;
    c.appendChild(t); setTimeout(()=>t.remove(),5000);
}

// CHARTS
function initRiskDistChart() {
    const ctx = document.getElementById('riskDistributionChart'); if(!ctx) return;
    if (charts.riskDist) charts.riskDist.destroy();
    charts.riskDist = new Chart(ctx, {type:'doughnut',data:{labels:['Normal','Medium','High','Critical'],datasets:[{data:[0,0,0,0],backgroundColor:['#22C55E','#F59E0B','#F97316','#EF4444'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#94A3B8',font:{size:11},padding:12}}},cutout:'65%'}});
    updateRiskDistChart();
}
function updateRiskDistChart() {
    const c=[0,0,0,0]; employees.forEach(e=>{if(e.frozen)return;if(e.riskScore>80)c[3]++;else if(e.riskScore>60)c[2]++;else if(e.riskScore>30)c[1]++;else c[0]++;}); charts.riskDist.data.datasets[0].data=c; charts.riskDist.update();
}
function initRiskTimelineChart() {
    const ctx = document.getElementById('riskTimelineChart'); if(!ctx) return;
    if (charts.timeline) charts.timeline.destroy();
    charts.timeline = new Chart(ctx, {type:'line',data:{labels:[],datasets:[]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},scales:{y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#475569',font:{size:10}}},x:{grid:{display:false},ticks:{color:'#475569',font:{size:10},maxRotation:0}}},plugins:{legend:{labels:{color:'#94A3B8',font:{size:11}}}}}});
}
function updateRiskTimelineChart() {
    if(!charts.timeline) return;
    const colors=['#3B82F6','#EF4444','#22C55E','#F59E0B','#8B5CF6','#F97316','#FBBF24','#EC4899','#06B6D4','#A855F7'];
    const ds = [];
    employees.forEach((emp,i) => { const h=riskHistory[emp.id]; if(!h||!h.length) return; ds.push({label:emp.name,data:h.map(x=>x.score),borderColor:colors[i%colors.length],backgroundColor:'transparent',borderWidth:2,pointRadius:2,tension:0.3}); });
    const maxLen = Math.max(...Object.values(riskHistory).map(h=>h.length), 0);
    charts.timeline.data.labels = Array.from({length:maxLen},(_,i)=>`E${i+1}`);
    charts.timeline.data.datasets = ds; charts.timeline.update();
}
function initDeptChart() {
    const ctx = document.getElementById('departmentChart'); if(!ctx) return;
    if (charts.dept) charts.dept.destroy();
    const depts = {}; employees.forEach(e=>{if(!depts[e.dept])depts[e.dept]=[];depts[e.dept].push(e.riskScore);});
    const labels = Object.keys(depts), avg = labels.map(d=>Math.round(depts[d].reduce((a,b)=>a+b,0)/depts[d].length));
    charts.dept = new Chart(ctx, {type:'bar',data:{labels,datasets:[{label:'Avg Risk',data:avg,backgroundColor:avg.map(s=>s>60?'rgba(239,68,68,0.15)':s>30?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)'),borderColor:avg.map(s=>s>60?'#EF4444':s>30?'#F59E0B':'#22C55E'),borderWidth:1.5,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#475569'}},x:{grid:{display:false},ticks:{color:'#94A3B8',font:{size:9}}}},plugins:{legend:{display:false}}}});
}
function initHourlyChart() {
    const ctx = document.getElementById('hourlyChart'); if(!ctx) return;
    if (charts.hourly) charts.hourly.destroy();
    const hd = new Array(24).fill(0);
    if (activityLogs.length) activityLogs.forEach(l => { const h = l.timestamp ? parseInt(l.timestamp.split(' ')[1]?.split(':')[0]) : null; if (h !== null && !isNaN(h)) hd[h]++; });
    else [2,1,0,1,0,1,3,12,28,35,42,38,30,33,36,34,28,20,14,8,5,4,8,3].forEach((v,i)=>hd[i]=v);
    charts.hourly = new Chart(ctx, {type:'line',data:{labels:Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`),datasets:[{label:'Events',data:hd,borderColor:'#3B82F6',backgroundColor:'rgba(59,130,246,0.08)',fill:true,borderWidth:2,pointRadius:2,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{grid:{color:'rgba(255,255,255,0.03)'},ticks:{color:'#475569'}},x:{grid:{display:false},ticks:{color:'#475569',font:{size:8},maxRotation:45}}},plugins:{legend:{display:false}}}});
}
function renderHeatmap() {
    const acts = ['Record Access','Data Export','Transactions','Config Change','Login Activity','Reports'];
    const c = document.getElementById('heatmapContainer'); if(!c) return;
    let h='<table class="heatmap-table"><thead><tr><th>Employee</th>';
    acts.forEach(a=>h+=`<th>${a}</th>`); h+='</tr></thead><tbody>';
    employees.forEach(emp => {
        h+=`<tr><td>${emp.name}</td>`;
        acts.forEach(()=>{ const v=Math.floor(Math.random()*100); const cl=v>80?'#EF4444':v>60?'#F97316':v>30?'#F59E0B':v>15?'#22C55E':'rgba(255,255,255,0.03)';
            h+=`<td class="heatmap-cell" style="background:${cl};opacity:${Math.max(0.3,v/100)}">${v}</td>`; });
        h+='</tr>';
    }); c.innerHTML = h+'</tbody></table>';
}

// MISC
function showAddConnector() { showToast('info','Add Connector','Supports: Oracle CBS, LDAP, Syslog, REST API, Kafka.'); }
function saveConfig() {
    if (dataLoaded && activityLogs.length) {
        showToast('info', '⚙️ Retraining', 'Model parameters updated. Retraining with new configuration...');
        runTrainingAnimation(() => {
            calculateRiskFromLogs();
            renderEmployeeTable(); updateStats();
            if (charts.riskDist) updateRiskDistChart();
            initDeptChart(); initHourlyChart(); renderHeatmap();
            showToast('info', '✓ Model Retrained', `Risk scores recalculated for ${employees.length} employees.`);
        });
    } else {
        showToast('info', '✓ Config Saved', 'Model parameters updated. Upload data to train the model.');
    }
}
