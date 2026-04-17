const API_BASE = window.location.port === '5173' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'https://securesync-ai-production.up.railway.app/api/v1' 
    : `${window.location.origin}/api/v1`;

// Update time
function updateTime() {
    const el = document.getElementById('current-time');
    const locale = (window.localStorage.getItem('securesync_lang') || 'en') + '-IN';
    if (el) el.textContent = new Date().toLocaleString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}
setInterval(updateTime, 1000);
updateTime();

async function fetchAPI(path) {
    try {
        const res = await fetch(`${API_BASE}${path}`, { timeout: 5000 });
        if (!res.ok) return null;
        return await res.json();
    } catch(e) {
        console.warn('API fetch failed:', path, e);
        return null;
    }
}

// Section Management with smoother transitions
function showSection(id) {
    const sections = ['overview', 'heatmap', 'forecast', 'review', 'fraud', 'workers', 'triggers', 'predictions', 'claims'];
    sections.forEach(s => {
        const el = document.getElementById('section-' + s);
        if (el) el.style.display = (s === id) ? 'block' : 'none';
    });
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        if (btnText.includes(id) || 
            (id === 'predictions' && btnText.includes('prediction')) ||
            (id === 'claims' && btnText.includes('claims'))) {
            btn.classList.add('active');
        }
    });

    // Integrated loaders
    if (id === 'overview') loadAll();
    if (id === 'heatmap') loadHeatmapOverview();
    if (id === 'forecast') loadForecasts();
    if (id === 'review') loadReviewQueueOverview();
    if (id === 'fraud') loadFraudGraph();
    if (id === 'workers') loadWorkers();
    if (id === 'triggers') loadTriggers();
    if (id === 'predictions') loadPredictions();
    if (id === 'claims') loadClaimsDistribution();
}

async function loadOverview() {
    const data = await fetchAPI('/admin/overview');
    if (!data) return;
    
    document.getElementById('m-policies').textContent = data.active_policies;
    document.getElementById('m-workers').textContent = data.total_workers;
    const locale = (window.localStorage.getItem('securesync_lang') || 'en') + '-IN';
    document.getElementById('m-payouts').textContent = Number(data.month_payouts_total || 0).toLocaleString(locale);
    document.getElementById('m-payout-count').textContent = data.month_payouts_count;
    document.getElementById('m-processing').textContent = data.avg_processing_ms;
    
    const lr = Math.round((data.loss_ratio || 0) * 100);
    document.getElementById('m-loss-ratio').textContent = lr + '%';
    
    const lrBg = document.getElementById('lr-icon-bg');
    const lrSym = document.getElementById('lr-icon-sym');
    
    if (lr > 80) {
        lrBg.style.background = 'var(--danger-dim)';
        lrSym.style.color = 'var(--danger)';
    } else if (lr > 65) {
        lrBg.style.background = 'var(--warning-dim)';
        lrSym.style.color = 'var(--warning)';
    } else {
        lrBg.style.background = 'var(--success-dim)';
        lrSym.style.color = 'var(--success)';
    }
    
    // Risk breakdown
    const total = data.week_claims || 1;
    const credited = data.week_credited || 0;
    const held = data.week_held || 0;
    
    const autoP = Math.round((credited / Math.max(total, 1)) * 100);
    const hardP = Math.round((held / Math.max(total, 1)) * 100);
    
    document.getElementById('f-auto').textContent = autoP + '%';
    document.getElementById('f-hard').textContent = hardP + '%';
    document.getElementById('f-auto-bar').style.width = autoP + '%';
    document.getElementById('f-hard-bar').style.width = hardP + '%';
}

async function loadHeatmapOverview() {
    const data = await fetchAPI('/admin/heatmap?days=7');
    if (!data || !data.zones) return;
    
    const zones = Object.values(data.zones);
    const renderZones = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = zones.map(z => {
            const severityClass = z.severity > 70 ? 'badge-danger' : z.severity > 40 ? 'badge-warning' : z.severity > 15 ? 'badge-info' : 'badge-success';
            return `<div class="zone-pill">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span class="zone-name jakarta">${z.zone}</span>
                    <span class="badge ${severityClass}">${z.alert_level}</span>
                </div>
                <p class="zone-stat">${z.total_events} Events · ${z.total_affected_workers} Fleet</p>
                <div style="margin-top:12px; height:4px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden;">
                    <div style="height:100%; width:${Math.min(z.severity, 100)}%; background:currentColor;" class="${severityClass.replace('badge-', 'text-')}"></div>
                </div>
            </div>`;
        }).join('');
    };
    renderZones('zone-heatmap');
    renderZones('zone-heatmap-full');
}

async function loadReviewQueueOverview() {
    const data = await fetchAPI('/admin/review-queue?limit=5');
    if (!data) return;
    
    document.getElementById('review-count').textContent = `${data.count} Actions Required`;
    const list = document.getElementById('review-list');
    
    if (data.count === 0) {
        list.innerHTML = `<div style="text-align:center; padding:48px; border:1px dashed var(--border); border-radius:16px;">
            <span class="material-symbols-outlined" style="font-size:48px; opacity:0.1; margin-bottom:12px;">checklist</span>
            <p style="color:var(--text-muted);">Queue cleared. All payouts verified via neural engine.</p>
        </div>`;
        return;
    }
    
    list.innerHTML = data.queue.map(p => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:20px; border-bottom:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:48px; height:48px; border-radius:12px; background:var(--warning-dim); display:flex; align-items:center; justify-content:center;">
                    <span class="material-symbols-outlined" style="color:var(--warning);">person</span>
                </div>
                <div>
                    <p style="font-weight:700; font-size:15px;">${p.worker?.name || 'Partner Account'}</p>
                    <p style="font-size:12px; color:var(--text-muted);">₹${p.amount_rupees} · ${p.type} · Risk Score: ${p.fraud_score}</p>
                </div>
            </div>
            <div style="display:flex; gap:12px;">
                <button class="btn btn-approve" onclick="approvePayoutAdmin(${p.payout_id})">Release</button>
                <button class="btn btn-reject" onclick="rejectPayoutAdmin(${p.payout_id})">Hold</button>
            </div>
        </div>
    `).join('');
}

async function approvePayoutAdmin(id) {
    await fetch(`${API_BASE}/admin/review/${id}/approve`, { method: 'POST' });
    loadReviewQueueOverview();
    loadOverview();
}

async function rejectPayoutAdmin(id) {
    await fetch(`${API_BASE}/admin/review/${id}/reject`, { method: 'POST' });
    loadReviewQueueOverview();
    loadOverview();
}

async function loadForecasts() {
    const container = document.getElementById('forecast-zones');
    const data = await fetchAPI('/forecast/zones');
    if (!data) return;
    
    container.innerHTML = data.map(z => {
        const alertColor = z.max_risk_6h >= 70 ? 'var(--danger)' : z.max_risk_6h >= 45 ? 'var(--warning)' : z.max_risk_6h >= 20 ? 'var(--info)' : 'var(--success)';
        return `<div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                    <h3 class="jakarta" style="font-size:16px;font-weight:700;">${z.zone}</h3>
                    <p style="font-size:12px;color:var(--text-muted);">${z.city}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-size:24px;font-weight:800;color:${alertColor};">${z.max_risk_6h}%</p>
                    <p style="font-size:10px;color:var(--text-muted);">6h risk</p>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
                <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;text-align:center;">
                    <p style="font-size:10px;color:var(--text-muted);">24h</p>
                    <p style="font-size:16px;font-weight:700;">${z.max_risk_24h}%</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;text-align:center;">
                    <p style="font-size:10px;color:var(--text-muted);">72h</p>
                    <p style="font-size:16px;font-weight:700;">${z.max_risk_72h}%</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;text-align:center;">
                    <p style="font-size:10px;color:var(--danger);">RED hrs</p>
                    <p style="font-size:16px;font-weight:700;">${z.red_hours}</p>
                </div>
            </div>
            <p style="font-size:12px;color:var(--text-dim);">${z.message}</p>
        </div>`;
    }).join('');
}

async function loadFraudGraph() {
    const container = document.getElementById('fraud-graph-view');
    const data = await fetchAPI('/admin/fraud-graph');
    if (!data) { container.innerHTML = '<p style="color:var(--text-muted);">No data</p>'; return; }
    
    const stats = data.graph_stats;
    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;">
            <div style="background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;text-align:center;">
                <p style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Active Nodes</p>
                <p style="font-size:24px;font-weight:800;margin-top:4px;">${data.vis_data.nodes.length}</p>
            </div>
            <div style="background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;text-align:center;">
                <p style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;">Connections</p>
                <p style="font-size:24px;font-weight:800;margin-top:4px;">${data.vis_data.links.length}</p>
            </div>
            <div style="background:rgba(255,255,255,0.03);padding:16px;border-radius:12px;text-align:center;">
                <p style="font-size:10px;color:var(--warning);text-transform:uppercase;letter-spacing:1px;">Shared Links</p>
                <p style="font-size:24px;font-weight:800;color:var(--warning);margin-top:4px;">${stats.shared_devices + stats.shared_upis}</p>
            </div>
            <div style="background:var(--danger-dim);padding:16px;border-radius:12px;text-align:center;">
                <p style="font-size:10px;color:var(--danger);text-transform:uppercase;letter-spacing:1px;">Fraud Rings</p>
                <p style="font-size:24px;font-weight:800;color:var(--danger);margin-top:4px;">${stats.fraud_rings_detected}</p>
            </div>
        </div>
        <div id="d3-graph-container" style="width:100%; height:400px; background:rgba(0,0,0,0.2); border-radius:16px; border:1px solid var(--border); overflow:hidden; position:relative;">
             <svg id="fraud-svg" style="width:100%; height:100%;"></svg>
        </div>
        <div style="margin-top:24px;">
            ${stats.rings.length > 0 ? stats.rings.map(r => `
                <div style="background:var(--danger-dim);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span class="material-symbols-outlined" style="color:var(--danger);">warning</span>
                        <span style="font-weight:700;color:var(--danger);">${r.risk_level} — ${r.ring_size} accounts</span>
                    </div>
                    <p style="font-size:13px;color:var(--text-dim);">${r.reason}</p>
                </div>
            `).join('') : '<p style="color:var(--success);margin-top:16px;">✅ No fraud rings detected — all physical devices verified</p>'}
        </div>
    `;

    renderD3FraudGraph(data.vis_data);
}

function renderD3FraudGraph(graph) {
    const svg = d3.select("#fraud-svg");
    const container = document.getElementById('d3-graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.links).id(d => d.id).distance(60))
        .force("charge", d3.forceManyBody().strength(-150))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(20));

    const link = svg.append("g")
        .attr("stroke", "rgba(255,255,255,0.1)")
        .attr("stroke-width", 1.5)
        .selectAll("line")
        .data(graph.links)
        .join("line");

    const node = svg.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .join("g")
        .call(d3.drag()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x; d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            }));

    node.append("circle")
        .attr("r", d => d.type === 'worker' ? 10 : 6)
        .attr("fill", d => {
            if (d.type === 'worker') return d.risk > 0.5 ? 'var(--danger)' : 'var(--primary)';
            if (d.type === 'device') return '#3b82f6';
            return 'var(--warning)';
        })
        .attr("stroke", d => d.type === 'worker' ? 'white' : 'none')
        .attr("stroke-width", 1.5);

    node.append("text")
        .text(d => d.type === 'worker' ? d.label : '')
        .attr("x", 12)
        .attr("y", 4)
        .attr("fill", "var(--text-dim)")
        .style("font-size", "10px")
        .style("pointer-events", "none");

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });
}

async function loadWorkers() {
    const container = document.getElementById('workers-list');
    const data = await fetchAPI('/admin/workers');
    if (!data) { container.innerHTML = '<p style="color:var(--text-muted); padding:20px;">No data</p>'; return; }
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Partner & Platform</th>
                    <th>Zone</th>
                    <th>Growth Score</th>
                    <th>Policy Tier</th>
                    <th style="text-align:right;">Total Payouts</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(w => `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:36px; height:36px; border-radius:10px; background:var(--primary-dim); display:flex; align-items:center; justify-content:center;">
                                <span class="material-symbols-outlined" style="font-size:18px; color:var(--primary);">person</span>
                            </div>
                            <div>
                                <p style="font-weight:700;">${w.name || 'Anonymous'}</p>
                                <p style="font-size:11px; color:var(--text-muted);">${w.partner_id || 'ID Pending'}</p>
                            </div>
                        </div>
                    </td>
                    <td><span style="font-size:13px; font-weight:500;">${w.zone || '—'}</span></td>
                    <td>
                         <span style="font-weight:800; color:${w.score >= 80 ? 'var(--success)' : w.score >= 60 ? 'var(--warning)' : 'var(--danger)'};">${w.score}</span>
                    </td>
                    <td>
                        <span class="badge ${w.has_active_policy ? 'badge-success' : 'badge-info'}">
                            ${w.has_active_policy ? w.policy_tier || 'PRO' : 'INACTIVE'}
                        </span>
                    </td>
                    <td style="text-align:right; font-weight:800; color:var(--text);">${Number(w.total_payout_amount).toLocaleString((window.localStorage.getItem('securesync_lang') || 'en')+'-IN', {style:'currency', currency:'INR', minimumFractionDigits:0})}</td>
                </tr>`).join('')}
            </tbody>
        </table>
    `;
}

async function loadLossRatio() {
    const container = document.getElementById('loss-detail');
    const data = await fetchAPI('/admin/loss-ratio?days=30');
    if (!data || !data.data) { container.innerHTML = '<p style="color:var(--text-muted);">No data</p>'; return; }
    
    container.innerHTML = `
        <div style="display:flex;gap:6px;align-items:flex-end;height:200px;margin-bottom:16px;">
            ${data.data.map(d => {
                const h = Math.max(4, Math.min(190, d.loss_ratio * 190));
                const color = d.loss_ratio > 0.80 ? 'var(--danger)' : d.loss_ratio > 0.65 ? 'var(--warning)' : 'var(--accent)';
                return `<div class="bar-container"><div class="bar-track" style="height:200px;"><div class="chart-bar" style="height:${h}px;background:${color};width:100%;"></div></div></div>`;
            }).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;">
            <span style="font-size:10px;color:var(--text-muted);">${data.data[0]?.label || ''}</span>
            <span style="font-size:10px;color:var(--text-muted);">${data.data[data.data.length-1]?.label || ''}</span>
        </div>
        <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;">
            <span style="font-size:12px;color:var(--text-muted);">Target loss ratio: </span>
            <span style="font-weight:700;color:var(--accent);">≤ 65%</span>
        </div>
    `;
}

async function loadTriggers() {
    const container = document.getElementById('trigger-list');
    const data = await fetchAPI('/admin/trigger-history?limit=30');
    if (!data) { container.innerHTML = '<p style="color:var(--text-muted); padding:20px;">No telemetry found</p>'; return; }
    
    const iconMap = {
        'Heavy Rain': 'rainy', 'AQI Danger': 'air', 'Heat Wave': 'thermostat',
        'Red Alert': 'notifications_active', 'Dense Fog': 'foggy', 'Gridlock': 'traffic',
        'Bandh': 'lock_clock', 'Platform Outage': 'cloud_off',
    };
    
    container.innerHTML = data.length === 0 
        ? '<div style="padding:48px; text-align:center;"><p style="color:var(--text-muted);">No neural triggers recorded</p></div>'
        : data.map(e => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 24px; border-bottom:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:40px; height:40px; border-radius:12px; background:${e.alert_level==='RED'?'var(--danger-dim)':'var(--warning-dim)'}; display:flex; align-items:center; justify-content:center;">
                    <span class="material-symbols-outlined" style="font-size:20px; color:${e.alert_level==='RED'?'var(--danger)':'var(--warning)'};">${iconMap[e.type]||'bolt'}</span>
                </div>
                <div>
                    <p style="font-weight:700; font-size:14px;">${e.type} — ${e.zone}</p>
                    <p style="font-size:12px; color:var(--text-muted);">${e.timestamp} · Impacting ${e.affected_workers} partners</p>
                </div>
            </div>
            <div style="text-align:right;">
                <span class="badge ${e.alert_level==='RED'?'badge-danger':'badge-warning'}">${e.alert_level}</span>
                <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">Signal: ${e.signal_value}</p>
            </div>
        </div>
    `).join('');
}

async function loadReviewQueue() {
    const container = document.getElementById('review-full');
    const data = await fetchAPI('/admin/review-queue?limit=20');
    if (!data) { container.innerHTML = '<p style="color:var(--text-muted); padding:24px;">Connection to neural engine lost</p>'; return; }
    
    if (data.count === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:64px; background:var(--bg-card); border-radius:16px; border:1px dashed var(--border);">
                <span class="material-symbols-outlined" style="font-size:56px; color:var(--success); opacity:0.3; margin-bottom:16px;">verified_user</span>
                <p style="font-size:18px; color:var(--text); font-weight:700;">Queue Synchronized</p>
                <p style="font-size:14px; color:var(--text-dim); margin-top:4px;">Machine verification has auto-cleared all pending claims.</p>
            </div>`;
        return;
    }
    
    container.innerHTML = data.queue.map(p => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:24px; background:var(--bg-card); border:1px solid var(--border); border-radius:16px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:52px; height:52px; border-radius:14px; background:var(--warning-dim); display:flex; align-items:center; justify-content:center;">
                    <span class="material-symbols-outlined" style="color:var(--warning); font-size:24px;">gavel</span>
                </div>
                <div>
                    <h4 style="font-weight:800; font-size:16px;">${p.worker?.name || 'Partner Account'}</h4>
                    <p style="font-size:13px; color:var(--text-dim); margin-top:2px;">₹${p.amount_rupees} · ${p.type} · Neural Risk Score: ${p.fraud_score}</p>
                    <p style="font-size:11px; color:var(--danger); margin-top:4px; font-weight:700;">Reason: ${p.reason}</p>
                </div>
            </div>
            <div style="display:flex; gap:12px;">
                <button class="btn btn-approve" onclick="approvePayoutAdmin(${p.payout_id});">Release Funds</button>
                <button class="btn btn-reject" onclick="rejectPayoutAdmin(${p.payout_id});">Flag for Audit</button>
            </div>
        </div>
    `).join('');
}

// Global Sync
function loadAll() {
    loadOverview();
    loadHeatmapOverview();
    loadReviewQueueOverview();
    loadLossRatioTrend();
}

// Phase 3 – Scale: Predictive Analytics
async function loadPredictions() {
    const data = await fetchAPI('/admin/predictive-claims');
    if (!data) return;

    document.getElementById('pred-claims').textContent = data.total_predicted_claims;
    document.getElementById('pred-liability').textContent = Number(data.total_predicted_liability).toLocaleString('en-IN');
    document.getElementById('pred-confidence').textContent = data.confidence === 'high' ? 'High' : 'Moderate';

    const container = document.getElementById('predictions-zones');
    container.innerHTML = data.zones.map(z => {
        const riskColor = z.forecast_risk_72h >= 70 ? 'var(--danger)' : z.forecast_risk_72h >= 40 ? 'var(--warning)' : 'var(--success)';
        return `<div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <div>
                    <h3 class="jakarta" style="font-size:16px;font-weight:700;">${z.zone}</h3>
                    <p style="font-size:12px;color:var(--text-muted);">${z.city}</p>
                </div>
                <div style="text-align:right;">
                    <p style="font-size:24px;font-weight:800;color:${riskColor};">${z.predicted_claims}</p>
                    <p style="font-size:10px;color:var(--text-muted);">predicted claims</p>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
                <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;text-align:center;">
                    <p style="font-size:10px;color:var(--text-muted);">Liability</p>
                    <p style="font-size:14px;font-weight:700;">₹${z.predicted_liability.toLocaleString('en-IN')}</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;text-align:center;">
                    <p style="font-size:10px;color:var(--text-muted);">72h Risk</p>
                    <p style="font-size:14px;font-weight:700;color:${riskColor};">${z.forecast_risk_72h}%</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:8px;text-align:center;">
                    <p style="font-size:10px;color:var(--text-muted);">Confidence</p>
                    <p style="font-size:14px;font-weight:700;">${z.confidence}%</p>
                </div>
            </div>
            <div style="margin-top:8px;">
                ${z.risk_factors.map(r => `<span style="display:inline-block;font-size:10px;padding:4px 10px;background:rgba(255,255,255,0.04);border-radius:20px;margin:2px 4px 2px 0;color:var(--text-dim);">${r}</span>`).join('')}
            </div>
        </div>`;
    }).join('');
}

// Phase 3 – Scale: Claims Distribution
async function loadClaimsDistribution() {
    const data = await fetchAPI('/admin/claims-distribution?days=30');
    if (!data) return;

    // By trigger type
    const typeContainer = document.getElementById('claims-by-type');
    const maxType = Math.max(...data.by_trigger_type.map(t => t.count), 1);
    typeContainer.innerHTML = data.by_trigger_type.map(t => {
        const pct = Math.round((t.count / maxType) * 100);
        return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="font-size:13px;font-weight:600;width:120px;flex-shrink:0;">${t.type}</span>
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:10px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:10px;transition:width 0.8s ease;"></div>
            </div>
            <span style="font-size:12px;font-weight:700;width:40px;text-align:right;">${t.count}</span>
            <span style="font-size:10px;color:var(--text-muted);width:50px;">FS:${t.avg_fraud_score}</span>
        </div>`;
    }).join('') || '<p style="color:var(--text-muted);">No claims data</p>';

    // By zone
    const zoneContainer = document.getElementById('claims-by-zone');
    const maxZone = Math.max(...data.by_zone.map(z => z.count), 1);
    zoneContainer.innerHTML = data.by_zone.map(z => {
        const pct = Math.round((z.count / maxZone) * 100);
        return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="font-size:13px;font-weight:600;width:80px;flex-shrink:0;">${z.zone}</span>
            <div style="flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:10px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:var(--info);border-radius:10px;transition:width 0.8s ease;"></div>
            </div>
            <span style="font-size:12px;font-weight:700;width:30px;text-align:right;">${z.count}</span>
        </div>`;
    }).join('') || '<p style="color:var(--text-muted);">No zone data</p>';

    // Hourly distribution
    const hourContainer = document.getElementById('claims-by-hour');
    const maxHour = Math.max(...data.by_hour.map(h => h.count), 1);
    hourContainer.innerHTML = data.by_hour.map(h => {
        const pct = Math.max(4, Math.round((h.count / maxHour) * 150));
        const color = h.hour >= 7 && h.hour <= 22 ? 'var(--primary)' : 'var(--text-muted)';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;" title="${h.hour}:00 — ${h.count} claims">
            <div style="width:100%;height:${pct}px;background:${color};border-radius:4px 4px 0 0;opacity:${h.count > 0 ? 1 : 0.15};transition:height 0.5s ease;"></div>
            <span style="font-size:8px;color:var(--text-muted);">${h.hour % 6 === 0 ? h.hour + ':00' : ''}</span>
        </div>`;
    }).join('');
}

// Phase 3 – Scale: Loss Ratio Trend
async function loadLossRatioTrend() {
    const data = await fetchAPI('/admin/loss-ratio-trend?days=28');
    if (!data) return;

    const chart = document.getElementById('lr-trend-chart');
    const trend = data.weekly_trend || [];
    if (trend.length === 0) return;

    const maxLR = Math.max(...trend.map(w => w.loss_ratio), 100);
    chart.innerHTML = trend.map((w, i) => {
        const h = Math.max(8, Math.round((w.loss_ratio / maxLR) * 160));
        const color = w.loss_ratio > 80 ? 'var(--danger)' : w.loss_ratio > 65 ? 'var(--warning)' : 'var(--success)';
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;" title="${w.week_label}: ${w.loss_ratio}%">
            <span style="font-size:10px;font-weight:700;color:${color};">${w.loss_ratio}%</span>
            <div style="width:100%;height:${h}px;background:${color};border-radius:6px 6px 0 0;opacity:0.8;transition:height 0.5s ease;"></div>
            <span style="font-size:9px;color:var(--text-muted);">${w.week_label}</span>
        </div>`;
    }).join('');

    // Update badge
    const badge = document.getElementById('lr-trend-badge');
    if (badge) {
        badge.textContent = data.status === 'healthy' ? 'Healthy' : data.status === 'warning' ? 'Warning' : 'Critical';
        badge.className = `badge badge-${data.status === 'healthy' ? 'success' : data.status === 'warning' ? 'warning' : 'danger'}`;
    }

    // Update dates
    if (trend.length > 0) {
        const startEl = document.getElementById('lr-trend-start');
        const endEl = document.getElementById('lr-trend-end');
        if (startEl) startEl.textContent = trend[0].week_start;
        if (endEl) endEl.textContent = trend[trend.length-1].week_end;
    }
}

// Cycle initialization
document.addEventListener('DOMContentLoaded', () => {
    loadAll();
    // Auto-sync every 60s
    setInterval(loadAll, 60000);
});
