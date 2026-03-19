/*
 * DoHSpeedTest - Real-time DNS over HTTPS (DoH) Speed Testing Tool
 * Copyright (C) 2023 Silviu Stroe
 * Fork Maintained by 9M2PJU <9m2pju@gmail.com> (2026)
 *
 * This file is part of DoHSpeedTest.
 */

// Global state and Constants
const DEFAULT_WEBSITES = ['google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'chatgpt.com', 'x.com', 'whatsapp.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'tiktok.com', 'pinterest.com'];
const DEFAULT_SERVERS = [
    { name: "AdGuard", url: "https://dns.adguard-dns.com/dns-query", ips: ["94.140.14.14", "94.140.15.15"] },
    { name: "AliDNS", url: "https://dns.alidns.com/dns-query", ips: ["223.5.5.5", "223.6.6.6"] },
    { name: "OpenDNS", url: "https://doh.opendns.com/dns-query", ips: ["208.67.222.222", "208.67.220.220"] },
    { name: "CleanBrowsing", url: "https://doh.cleanbrowsing.org/doh/family-filter/", ips: ["185.228.168.9", "185.228.169.9"] },
    { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", type: "get", allowCors: true, ips: ["1.1.1.1", "1.0.0.1"] },
    { name: "ControlD", url: "https://freedns.controld.com/p0", ips: ["76.76.2.0", "76.223.122.150"] },
    { name: "DNS.SB", url: "https://doh.dns.sb/dns-query", type: "get", allowCors: true, ips: ["185.222.222.222", "45.11.45.11"] },
    { name: "DNSPod", url: "https://dns.pub/dns-query", type: "post", allowCors: false, ips: ["119.29.29.29", "182.254.116.116"] },
    { name: "Google", url: "https://dns.google/resolve", type: "get", allowCors: true, ips: ["8.8.8.8", "8.8.4.4"] },
    { name: "Mullvad", url: "https://dns.mullvad.net/dns-query", ips: ["194.242.2.2"], type: "get", allowCors: false },
    { name: "NextDNS", url: "https://dns.nextdns.io", type: "get", ips: ["45.90.28.0", "45.90.30.0"] },
    { name: "Quad9", url: "https://dns.quad9.net/dns-query", ips: ["9.9.9.9", "149.112.112.112"] },
    { name: "RethinkDNS", url: "https://sky.rethinkdns.com/dns-query", ips: ["104.21.83.62"], allowCors: false }
];

let topWebsites = JSON.parse(localStorage.getItem('DOH_SPEEDTEST_WEBSITES')) || DEFAULT_WEBSITES;
let dnsServers = JSON.parse(localStorage.getItem('DOH_SPEEDTEST_SERVERS')) || DEFAULT_SERVERS;

let dnsChart, jitterChart;
let chartData = [];

function saveToLocalStorage() {
    localStorage.setItem('DOH_SPEEDTEST_WEBSITES', JSON.stringify(topWebsites));
    // Save configuration only, excluding benchmark results
    const serversToSave = dnsServers.map(({ name, url, ips, type, allowCors }) => ({ name, url, ips, type, allowCors }));
    localStorage.setItem('DOH_SPEEDTEST_SERVERS', JSON.stringify(serversToSave));
}

// Helper functions
const closeModal = (id) => document.getElementById(id)?.classList.add('hidden');
const openModal = (id) => document.getElementById(id)?.classList.remove('hidden');

async function updateLoadingMessage(message) {
    const el = document.getElementById('loadingMessage');
    if (el) el.innerHTML = `<span>${message}</span> <div class="flex gap-1"><div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div><div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div><div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div></div>`;
}

function updateCharts() {
    const chartSection = document.getElementById('chartSection');
    const validData = chartData.filter(item => item.avg !== null).sort((a, b) => a.avg - b.avg);
    if (validData.length > 0) {
        chartSection?.classList.remove('hidden');
        renderLatencyChart(validData);
        renderJitterChart(validData);
    }
}

function renderLatencyChart(validData) {
    const canvas = document.getElementById('dnsChart');
    if (!canvas) return;
    if (dnsChart) dnsChart.destroy();
    dnsChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: validData.slice(0, 10).map(item => item.name),
            datasets: [{
                label: 'Latency (ms)',
                data: validData.slice(0, 10).map(item => item.avg),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } }, y: { grid: { display: false } } } }
    });
}

function renderJitterChart(validData) {
    const canvas = document.getElementById('dnsJitterChart');
    if (!canvas) return;
    if (jitterChart) jitterChart.destroy();
    const jitterSorted = [...validData].sort((a, b) => a.jitter - b.jitter).slice(0, 10);
    jitterChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: jitterSorted.map(item => item.name),
            datasets: [{
                label: 'Jitter (ms)',
                data: jitterSorted.map(item => item.jitter),
                backgroundColor: 'rgba(168, 85, 247, 0.5)',
                borderColor: '#a855f7',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } }, y: { grid: { display: false } } } }
    });
}

// DNS Core Logic
function buildDNSQuery(hostname) {
    const labels = hostname.split('.').filter(Boolean);
    const header = new Uint8Array(12);
    header[0] = Math.floor(Math.random() * 255); header[1] = Math.floor(Math.random() * 255);
    header[2] = 0x01; header[5] = 0x01;
    const qnameParts = [];
    labels.forEach(l => { qnameParts.push(l.length, ...Array.from(l).map(c => c.charCodeAt(0))); });
    const qname = new Uint8Array([...qnameParts, 0]);
    const typeClass = new Uint8Array([0, 1, 0, 1]); // A Type, IN Class
    const res = new Uint8Array(header.length + qname.length + typeClass.length);
    res.set(header); res.set(qname, 12); res.set(typeClass, 12 + qname.length);
    return res;
}

function encodeDnsQueryBase64Url(q) {
    return btoa(String.fromCharCode(...q)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function measureDNSSpeed(url, hostname, type, allowCors) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
        const query = buildDNSQuery(hostname);
        const start = performance.now();
        const fetchUrl = new URL(url);
        let opts = { signal: controller.signal };
        
        if (type === 'get') {
            fetchUrl.searchParams.set('dns', encodeDnsQueryBase64Url(query));
            opts.method = 'GET';
            opts.mode = allowCors ? 'cors' : 'no-cors';
        } else {
            opts.method = 'POST';
            opts.headers = { 'Content-Type': 'application/dns-message', 'Accept': 'application/dns-message' };
            opts.body = query;
            opts.mode = allowCors ? 'cors' : 'no-cors';
        }
        
        await fetch(fetchUrl, opts);
        return performance.now() - start;
    } catch (e) {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

function calculateStats(results) {
    const valid = results.filter(r => r !== null);
    if (!valid.length) return { min: 0, median: 0, max: 0, avg: 0, jitter: 0 };
    const sorted = [...valid].sort((a,b) => a - b);
    const sum = sorted.reduce((a,b) => a + b, 0);
    const mid = Math.floor(sorted.length / 2);
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: sum / sorted.length,
        median: sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
        jitter: sorted[sorted.length - 1] - sorted[0]
    };
}

// Table Management
function updateResultRow(s) {
    const body = document.getElementById('resultsBody');
    if (!body) return;
    
    // Update chartData for visualization
    const serverInfo = { name: s.name, avg: s.speed.avg, min: s.speed.min, max: s.speed.max, jitter: s.speed.jitter };
    const chartIdx = chartData.findIndex(c => c.name === s.name);
    if (chartIdx === -1) chartData.push(serverInfo); else chartData[chartIdx] = serverInfo;
    
    // Sort all tested servers by reliability first (HEALTHY/PARTIAL before FAILED), then by their Minimum latency (fastest first)
    const testedServers = dnsServers
        .filter(server => server.speed && server.speed.min !== undefined)
        .sort((a, b) => {
            const getRank = (s) => (s.reliability === 'failed' ? 1 : 0);
            const rankA = getRank(a);
            const rankB = getRank(b);
            
            if (rankA !== rankB) return rankA - rankB;
            return a.speed.min - b.speed.min;
        });
    
    // Clear and re-render the entire table body to maintain sorted order
    body.innerHTML = testedServers.map(server => `
        <tr data-name="${server.name}" class="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
            <td class="py-3 px-4 font-bold text-white">${server.name}</td>
            <td class="py-3 px-2 text-center text-emerald-400 font-bold">${server.speed.min.toFixed(1)}</td>
            <td class="py-3 px-2 text-center text-blue-400 font-medium">${server.speed.median.toFixed(1)}</td>
            <td class="py-3 px-2 text-center text-slate-400">${server.speed.avg.toFixed(1)}</td>
            <td class="py-3 px-2 text-center text-slate-400">${server.speed.max.toFixed(1)}</td>
            <td class="py-3 px-2 text-center text-purple-400">${server.speed.jitter.toFixed(1)}</td>
            <td class="py-3 px-4 text-right">
                <span class="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                    server.reliability === 'healthy' ? 'bg-emerald-500/10 text-emerald-500' : 
                    (server.reliability === 'partial' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500')
                }">
                    ${server.reliability}
                </span>
            </td>
        </tr>
    `).join('');
    
    updateCharts();
}

function sortTable(n) {
    const table = document.getElementById("resultsTable");
    if (!table) return;
    let switching = true, shouldSwitch, i;
    let dir = "asc", switchcount = 0;
    while (switching) {
        switching = false;
        const rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            let x = rows[i].getElementsByTagName("TD")[n];
            let y = rows[i + 1].getElementsByTagName("TD")[n];
            let xVal = isNaN(parseFloat(x.innerHTML)) ? x.innerHTML.toLowerCase() : parseFloat(x.innerHTML);
            let yVal = isNaN(parseFloat(y.innerHTML)) ? y.innerHTML.toLowerCase() : parseFloat(y.innerHTML);
            if (dir === "asc") { if (xVal > yVal) { shouldSwitch = true; break; } }
            else if (dir === "desc") { if (xVal < yVal) { shouldSwitch = true; break; } }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true; switchcount++;
        } else if (switchcount === 0 && dir === "asc") {
            dir = "desc"; switching = true;
        }
    }
}
window.sortTable = sortTable;

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('checkButton');
    const editBtn = document.getElementById('editButton');
    const editDohBtn = document.getElementById('editDoHButton');
    const websiteList = document.getElementById('websiteList');
    const dohList = document.getElementById('dohList');

    const renderWebsites = () => {
        if (!websiteList) return;
        websiteList.innerHTML = topWebsites.map((site, i) => `
            <li class="flex justify-between items-center p-2 bg-white/5 rounded-lg mb-1 group">
                <span class="text-sm">${site}</span>
                <button onclick="topWebsites.splice(${i},1); saveToLocalStorage(); window.renderWebsites();" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </li>
        `).join('');
    };
    window.renderWebsites = renderWebsites;

    const renderServers = () => {
        if (!dohList) return;
        dohList.innerHTML = dnsServers.map((s, i) => `
            <li class="flex justify-between items-center p-2 bg-white/5 rounded-lg mb-1 group">
                <div class="flex flex-col">
                    <span class="text-sm font-medium">${s.name}</span>
                    <span class="text-[10px] text-slate-500 truncate max-w-[180px]">${s.url}</span>
                </div>
                <button onclick="dnsServers.splice(${i},1); saveToLocalStorage(); window.renderServers();" class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </li>
        `).join('');
    };
    window.renderServers = renderServers;

    checkBtn?.addEventListener('click', async () => {
        checkBtn.disabled = true;
        editBtn.disabled = true;
        editDohBtn.disabled = true;
        document.getElementById('loadingMessage')?.classList.remove('hidden');
        document.getElementById('resultsTable')?.scrollIntoView({ behavior: 'smooth' });
        chartData = [];
        
        for (const s of dnsServers) {
            await updateLoadingMessage(`Benchmarking ${s.name}...`);
            try {
                const results = await Promise.all(topWebsites.map(w => measureDNSSpeed(s.url, w, s.type || 'post', s.allowCors || false)));
                s.speed = calculateStats(results);
                const successCount = results.filter(r => r !== null).length;
                s.reliability = successCount === topWebsites.length ? 'healthy' : (successCount > 0 ? 'partial' : 'failed');
                updateResultRow(s);
            } catch (err) {
                console.error(`Error testing ${s.name}:`, err);
                s.reliability = 'failed';
            }
        }
        
        document.getElementById('loadingMessage')?.classList.add('hidden');
        checkBtn.disabled = false;
        editBtn.disabled = false;
        editDohBtn.disabled = false;
        showRecommendationPopup();
    });

    editBtn?.addEventListener('click', () => { openModal('websiteModal'); renderWebsites(); });
    editDohBtn?.addEventListener('click', () => { openModal('dohModal'); renderServers(); });

    // Global Modal Handler
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close') || e.target.classList.contains('close-recommend')) {
            const modal = e.target.closest('[id$="Modal"]');
            if (modal) modal.classList.add('hidden');
        }
        if (e.target.id && e.target.id.endsWith('Modal')) {
            e.target.classList.add('hidden');
        }
    });

    // Management Actions
    document.getElementById('addHostname')?.addEventListener('click', () => {
        const input = document.getElementById('newWebsite');
        if (input?.value && !topWebsites.includes(input.value)) {
            topWebsites.push(input.value);
            saveToLocalStorage();
            input.value = '';
            renderWebsites();
        }
    });

    document.getElementById('addDoH')?.addEventListener('click', () => {
        const input = document.getElementById('newDoH');
        if (input?.value) {
            const parts = input.value.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                dnsServers.push({ name: parts[0], url: parts[1], ips: [] });
                saveToLocalStorage();
                input.value = '';
                renderServers();
            } else {
                alert('Please use the format: Name, URL');
            }
        }
    });
});

function showRecommendationPopup() {
    const modal = document.getElementById('recommendModal');
    const container = document.getElementById('recommendationCards');
    const explanation = document.getElementById('recommendationExplanation');
    if (!modal || !container) return;

    // Filter for healthy first, then partial if no healthy found
    let best = dnsServers.filter(s => s.reliability === 'healthy');
    let isPartial = false;
    
    if (!best.length) {
        best = dnsServers.filter(s => s.reliability === 'partial');
        isPartial = true;
    }
    
    best = best.sort((a, b) => a.speed.median - b.speed.median).slice(0, 3);
        
    if (!best.length) return;

    if (explanation) {
        explanation.textContent = isPartial 
            ? "Showing the fastest results that responded to most queries. Some servers experienced minor timeouts."
            : "These providers showed the lowest latency and 100% reliability from your current location.";
    }

    container.innerHTML = best.map((s, i) => `
        <div class="bg-white/5 p-4 rounded-xl border border-white/10 text-center animate-scale-up" style="animation-delay: ${i * 0.1}s">
            <div class="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Rank #${i + 1}</div>
            <div class="font-bold text-white mb-1 truncate">${s.name}</div>
            <div class="text-2xl font-black text-blue-400">${s.speed.median.toFixed(1)}<span class="text-xs font-normal text-slate-500 ml-0.5">ms</span></div>
        </div>
    `).join('');
    modal.classList.remove('hidden');
}
