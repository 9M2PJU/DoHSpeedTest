/*
 * DoHSpeedTest - Real-time DNS over HTTPS (DoH) Speed Testing Tool
 * Copyright (C) 2023 Silviu Stroe
 * Fork Maintained by 9M2PJU <9m2pju@gmail.com> (2026)
 *
 * This file is part of DoHSpeedTest.
 *
 * DoHSpeedTest is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * DoHSpeedTest is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with DoHSpeedTest. If not, see <http://www.gnu.org/licenses/>.
 */
const checkButton = document.getElementById('checkButton');
const editButton = document.getElementById('editButton');
const topWebsites = ['google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'chatgpt.com', 'x.com', 'whatsapp.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'tiktok.com', 'pinterest.com'];
// Penalize failed/timeout requests so they don't skew averages in favor of unstable servers
const TIMEOUT_PENALTY_MS = 5000;
// Global variable to store chart instance
const dnsServers = [
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
    { name: "RethinkDNS", url: "https://sky.rethinkdns.com/dns-query", ips: ["104.21.83.62"], allowCors: false },
    { name: "Comcast Xfinity", url: "https://doh.xfinity.com/dns-query", type: "get", allowCors: false, ips: ["75.75.75.75"] },
    { name: "DNS.WATCH", url: "https://resolver2.dns.watch/dns-query", ips: ["84.200.69.80", "84.200.70.40"] },
    { name: "Cisco Umbrella", url: "https://doh.umbrella.com/dns-query", ips: ["208.67.222.222"] },
    { name: "Neustar", url: "https://doh.neustar.biz/dns-query", ips: ["156.154.70.2", "156.154.71.2"] },
    { name: "Freenom World", url: "https://doh.freenom.com/dns-query", ips: ["80.80.80.80", "80.80.81.81"] },
    { name: "DNS4EU", url: "https://unfiltered.joindns4.eu/dns-query", ips: ["86.54.11.100"], type: "post", allowCors: false },
    { name: "Verisign", url: "https://doh.verisign-dns.com/dns-query", ips: ["64.6.64.6", "64.6.65.6"] },
    { name: "Yandex DNS", url: "https://doh.yandex.net/dns-query", ips: ["77.8.8.8"] },
    { name: "360 DNS", url: "https://doh.360.cn/dns-query", ips: ["101.226.4.6"] },
    { name: "AhaDNS", url: "https://doh.ahadns.com/dns-query", ips: ["45.67.219.208"] },
    { name: "BlahDNS", url: "https://doh.blahdns.com/dns-query", ips: ["159.69.198.101"] },
    { name: "deSEC", url: "https://desec.io/dns-query", ips: ["45.54.76.1"] },
    { name: "FlashStart", url: "https://doh.flashstart.com/f17c9ee5", ips: ["185.236.104.104"] },
    { name: "Gcore", url: "https://doh.gcore.com/dns-query", ips: ["95.161.180.1"] },
    { name: "LibreDNS", url: "https://doh.libredns.gr/dns-query", ips: ["116.202.176.26"] },
    { name: "SafeDNS", url: "https://doh.safedns.com/dns-query", ips: ["195.46.39.39"] },
    { name: "Switch", url: "https://dns.switch.ch/dns-query", ips: ["130.59.31.248"] }
];

let dnsChart, jitterChart;
let chartData = [];

function updateChartWithData(server) {
    const existingIndex = chartData.findIndex(item => item.name === server.name);
    const hasReliableSamples = server.reliability ? server.reliability.successCount > 0 : server.speed.avg !== 'Unavailable';
    
    // Use the pre-calculated jitter from server.speed
    const jitter = typeof server.speed.jitter === 'number' ? server.speed.jitter : 0;

    const serverInfo = {
        name: server.name,
        avg: hasReliableSamples && typeof server.speed.avg === 'number' ? server.speed.avg : null,
        min: hasReliableSamples && typeof server.speed.min === 'number' ? server.speed.min : null,
        max: hasReliableSamples && typeof server.speed.max === 'number' ? server.speed.max : null,
        jitter: jitter
    };

    if (existingIndex === -1) {
        chartData.push(serverInfo);
    } else {
        chartData[existingIndex] = serverInfo;
    }

    updateCharts();
}

function updateCharts() {
    const chartSection = document.getElementById('chartSection');
    const validData = chartData.filter(item => item.avg !== null).sort((a, b) => a.avg - b.avg);
    
    if (validData.length === 0) return;
    chartSection.classList.remove('hidden');

    updateLatencyChart(validData);
    updateJitterChart(validData);
}

function updateLatencyChart(validData) {
    const canvas = document.getElementById('dnsChart');
    const ctx = canvas.getContext('2d');
    
    if (dnsChart) dnsChart.destroy();

    dnsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: validData.slice(0, 10).map(item => item.name),
            datasets: [{
                label: 'Average Latency (ms)',
                data: validData.slice(0, 10).map(item => item.avg),
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    bodyFont: { size: 14 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#f8fafc', font: { weight: '500' } }
                }
            }
        }
    });
}

function updateJitterChart(validData) {
    const canvas = document.getElementById('dnsJitterChart');
    const ctx = canvas.getContext('2d');
    
    if (jitterChart) jitterChart.destroy();

    const jitterData = [...validData].sort((a, b) => a.jitter - b.jitter).slice(0, 10);

    jitterChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: jitterData.map(item => item.name),
            datasets: [{
                label: 'Jitter (Max-Min ms)',
                data: jitterData.map(item => item.jitter),
                backgroundColor: 'rgba(168, 85, 247, 0.5)',
                borderColor: '#a855f7',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#f8fafc', font: { weight: '500' } }
                }
            }
        }
    });
}

// Performance-based color coding (green = fast, red = slow)
function getPerformanceColor(responseTime, allData, border = false) {
    if (!allData || allData.length === 0) return border ? '#22c55e' : '#22c55e80';
    
    const validTimes = allData.map(d => d.avg).filter(t => t !== null);
    const minTime = Math.min(...validTimes);
    const maxTime = Math.max(...validTimes);
    
    // Avoid division by zero
    if (minTime === maxTime) return border ? '#22c55e' : '#22c55e80';
    
    // Normalize response time to 0-1 scale
    const normalized = (responseTime - minTime) / (maxTime - minTime);
    
    // Color interpolation from green (fast) to red (slow)
    let r, g, b;
    if (normalized <= 0.5) {
        // Green to yellow (0-0.5)
        r = Math.round(255 * (normalized * 2));
        g = 255;
        b = 0;
    } else {
        // Yellow to red (0.5-1)
        r = 255;
        g = Math.round(255 * (2 - normalized * 2));
        b = 0;
    }
    
    // Return hex color with or without alpha
    const alpha = border ? '' : '80';
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${alpha}`;
}

// Legacy function kept for compatibility
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function warmUpDNSServers() {
    // Display the warm-up message
    // Use the same DNS server list and top websites for warm-up
    const warmUpPromises = dnsServers.map(server => Promise.all(topWebsites.map(website => measureDNSSpeed(server.url, website, server.type, server.allowCors))));

    await Promise.all(warmUpPromises);
    console.log("Warm-up phase completed");
}

async function updateLoadingMessage(message) {
    document.getElementById('loadingMessage').innerHTML = `<span>${message}</span> <div class="flex gap-1"><div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div><div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div><div class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div></div>`;
}

checkButton.addEventListener('click', async function () {
    this.disabled = true;
    editButton.disabled = true;
    document.getElementById('editDoHButton').disabled = true;
    document.getElementById('loadingMessage').classList.remove('hidden');
    
    chartData = [];
    const chartSection = document.getElementById('chartSection');
    chartSection.classList.add('hidden');

    // Focus on charts immediately if they were visible, or prepare to show them
    window.scrollTo({
        top: document.getElementById('checkButton').offsetTop + 100,
        behavior: 'smooth'
    });

    await updateLoadingMessage('Initializing Warm-up Phase');
    await warmUpDNSServers();
    await updateLoadingMessage('Benchmarking Network Latency');
    await performDNSTests();

    document.getElementById('loadingMessage').classList.add('hidden');
    this.disabled = false;
    editButton.disabled = false;
    document.getElementById('editDoHButton').disabled = false;

    // Show recommendations after completion
    showRecommendationPopup();
});

async function performDNSTests() {

    const totalQueries = topWebsites.length;

    for (const server of dnsServers) {
        const speedResults = await Promise.all(topWebsites.map(website => measureDNSSpeed(server.url, website, server.type, server.allowCors)));

        // Map each website to its speed result for the current server
        server.individualResults = topWebsites.map((website, index) => {
            const speed = speedResults[index];
            return {website, speed: speed !== null ? speed : 'Unavailable'};
        });

        if (totalQueries === 0) {
            server.speed = {min: 'Unavailable', median: 'Unavailable', max: 'Unavailable', avg: 'Unavailable', jitter: 'Unavailable'};
            server.reliability = {
                status: 'no-data',
                successCount: 0,
                failureCount: 0,
                totalQueries: 0,
                message: 'No hostnames configured for testing.'
            };
            updateResult(server);
            continue;
        }

        const penalizedResults = speedResults.map(speed => typeof speed === 'number' ? speed : TIMEOUT_PENALTY_MS);
        server.speed = calculateSpeedStats(penalizedResults);
        server.reliability = buildReliabilityProfile(speedResults, totalQueries);

        updateResult(server);
    }
}

function calculateSpeedStats(results) {
    if (!results.length) {
        return {min: 'Unavailable', median: 'Unavailable', max: 'Unavailable', avg: 'Unavailable', jitter: 'Unavailable'};
    }

    const sorted = [...results].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, value) => acc + value, 0);
    const avg = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const middleIndex = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[middleIndex - 1] + sorted[middleIndex]) / 2 : sorted[middleIndex];
    
    // Calculate jitter as the range (max - min) to show overall consistency
    const jitter = max - min;

    return {min, median, max, avg, jitter};
}

function buildReliabilityProfile(speedResults, totalQueries) {
    if (totalQueries === 0) {
        return {
            status: 'no-data',
            successCount: 0,
            failureCount: 0,
            totalQueries: 0,
            message: 'No hostnames configured for testing.'
        };
    }

    const successCount = speedResults.filter(speed => typeof speed === 'number').length;
    const failureCount = totalQueries - successCount;

    let status = 'healthy';
    if (successCount === 0) {
        status = 'failed';
    } else if (failureCount > 0) {
        status = 'partial';
    }

    let message;
    if (status === 'healthy') {
        message = 'All queries succeeded.';
    } else if (status === 'partial') {
        message = `${failureCount} of ${totalQueries} queries timed out or failed. Failed runs are scored as ${TIMEOUT_PENALTY_MS}ms penalties.`;
    } else if (status === 'failed') {
        message = `All queries failed. Each timeout counts as ${TIMEOUT_PENALTY_MS}ms to avoid skewed averages.`;
    } else {
        message = 'No hostnames configured for testing.';
    }

    return {status, successCount, failureCount, totalQueries, message};
}

async function measureDNSSpeed(dohUrl, hostname, serverType = 'post', allowCors = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    try {
        const dnsQuery = buildDNSQuery(hostname);
        const startTime = performance.now();
        let response;

        if (serverType === 'get') {
            const urlWithParam = new URL(dohUrl);
            const usesJsonApi = urlWithParam.pathname.includes('/resolve');

            let fetchOptions = {method: 'GET', signal: controller.signal};

            if (usesJsonApi) {
                // JSON-style API (e.g., dns.google/resolve)
                urlWithParam.searchParams.set('name', hostname);
                urlWithParam.searchParams.set('type', 'A');
                urlWithParam.searchParams.set('nocache', Date.now());
                if (allowCors) {
                    fetchOptions.mode = 'cors';
                    fetchOptions.headers = {'Accept': 'application/dns-json'};
                } else {
                    fetchOptions.mode = 'no-cors';
                }
            } else {
                // RFC 8484 wire-format GET with base64url-encoded DNS message
                urlWithParam.searchParams.set('dns', encodeDnsQueryBase64Url(dnsQuery));
                fetchOptions.mode = allowCors ? 'cors' : 'no-cors';
                if (allowCors) {
                    fetchOptions.headers = {'Accept': 'application/dns-message'};
                }
            }

            response = await fetch(urlWithParam, fetchOptions);
        } else {
            if (allowCors) {
                const fetchOptions = {
                    method: 'POST',
                    body: dnsQuery,
                    mode: 'cors',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/dns-message',
                        'Accept': 'application/dns-message'
                    }
                };
                response = await fetch(dohUrl, fetchOptions);
            } else {
                // Non-CORS endpoints: use GET with `dns` param to avoid missing Content-Type rejections
                const urlWithParam = new URL(dohUrl);
                urlWithParam.searchParams.set('dns', encodeDnsQueryBase64Url(dnsQuery));
                const fetchOptions = {method: 'GET', mode: 'no-cors', signal: controller.signal};
                response = await fetch(urlWithParam, fetchOptions);
            }
        }

        clearTimeout(timeoutId);

        if (allowCors && !response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const endTime = performance.now();
        return endTime - startTime;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError' || error.message === 'NS_BINDING_ABORTED') {
            console.error('Request timed out or was aborted');
        } else {
            console.error('Error during DNS resolution:', error);
        }
        return null;
    }
}

function buildDNSQuery(hostname) {
    // Normalize hostname: drop trailing dot and let the URL parser punycode-encode IDNs
    const normalizedHost = (() => {
        const trimmed = hostname.trim().replace(/\.$/, '');
        try {
            return new URL(`http://${trimmed}`).hostname;
        } catch (e) {
            return trimmed;
        }
    })();

    const labels = normalizedHost.split('.').filter(Boolean);
    if (labels.length === 0) {
        throw new Error('Invalid hostname for DNS query');
    }

    // Header: random TXID, RD flag set, QDCOUNT=1
    const header = new Uint8Array(12);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(header.subarray(0, 2));
    } else {
        const txid = Math.floor(Math.random() * 0xffff);
        header[0] = (txid >> 8) & 0xff;
        header[1] = txid & 0xff;
    }
    header[2] = 0x01; // Flags: recursion desired (0x0100)
    header[5] = 0x01; // QDCOUNT: one question

    // Build QNAME (labels + terminating zero)
    const qnameParts = [];
    labels.forEach(label => {
        const bytes = Array.from(label).map(char => {
            const code = char.charCodeAt(0);
            if (code > 0x7f) {
                throw new Error('Hostname must be ASCII/punycode encoded');
            }
            return code;
        });
        if (bytes.length === 0 || bytes.length > 63) {
            throw new Error('Invalid label length in hostname');
        }
        qnameParts.push(bytes.length, ...bytes);
    });
    const qname = new Uint8Array(qnameParts.length + 1); // trailing zero byte already 0
    qname.set(qnameParts);

    // Type (A) + Class (IN)
    const typeAndClass = new Uint8Array([0x00, 0x01, 0x00, 0x01]);

    // Assemble final query without extra padding bytes
    const query = new Uint8Array(header.length + qname.length + typeAndClass.length);
    let offset = 0;
    query.set(header, offset); offset += header.length;
    query.set(qname, offset); offset += qname.length;
    query.set(typeAndClass, offset);

    return query;
}

function encodeDnsQueryBase64Url(query) {
    const binary = Array.from(query, byte => String.fromCharCode(byte)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function updateResult(server) {
    const table = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
    let row = document.querySelector(`tr[data-server-name="${server.name}"]`);
    let detailsRow;
    const reliabilityBadge = getReliabilityBadge(server.reliability);
    const reliabilityDetails = server.reliability && server.reliability.message ? `<div class="mt-2 text-sm text-slate-400">${server.reliability.message}</div>` : '';
    const minValue = formatMetric(server.speed.min);
    const medianValue = formatMetric(server.speed.median);
    const avgValue = formatMetric(server.speed.avg);
    const maxValue = formatMetric(server.speed.max);
    const jitterValue = formatMetric(server.speed.jitter);

    if (!row) {
        row = document.createElement('tr');
        row.setAttribute('data-server-name', server.name);
        row.className = 'group transition-all duration-300';
        table.appendChild(row);

        detailsRow = document.createElement('tr');
        detailsRow.className = 'details-row hidden';
        table.appendChild(detailsRow);
    } else {
        detailsRow = row.nextElementSibling;
    }

    row.innerHTML = `
        <td class="text-left py-4 px-6">
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-3">
                    <span class="font-semibold text-white/90">${server.name}</span>
                    <button class="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100" onclick="copyToClipboard('DoH Server URL: ${server.url}' + '\\n' + 'IP Addresses: ${server.ips.join(', ')}', this)" title="Copy details">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="text-slate-400"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    </button>
                </div>
                ${reliabilityBadge}
            </div>
        </td>
        <td class="text-center py-4 px-6 font-medium text-slate-300">${minValue}</td>
        <td class="text-center py-4 px-6 font-medium text-slate-300">${medianValue}</td>
        <td class="text-center py-4 px-6 font-bold text-blue-400">${avgValue}</td>
        <td class="text-center py-4 px-6 font-medium text-slate-300">${maxValue}</td>
        <td class="text-center py-4 px-6 font-medium text-slate-300">${jitterValue}</td>
    `;

    detailsRow.innerHTML = `
        <td colspan="7" class="py-6 px-8 bg-blue-500/5 rounded-b-2xl">
            <div class="max-w-3xl">
                ${reliabilityDetails}
                <div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${server.individualResults.map(result => `
                        <div class="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg border border-white/5">
                            <span class="text-sm text-slate-400">${result.website}</span>
                            <span class="text-sm font-mono ${typeof result.speed === 'number' ? 'text-emerald-400' : 'text-red-400'}">
                                ${typeof result.speed === 'number' ? result.speed.toFixed(1) + 'ms' : 'Error'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </td>
    `;

    updateChartWithData(server);
}

function formatMetric(value) {
    return typeof value === 'number' ? value.toFixed(2) : 'Unavailable';
}

function getReliabilityBadge(reliability) {
    if (!reliability) return '';

    const badgeConfig = {
        healthy: { label: 'Stable', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
        partial: { label: 'Partial', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
        failed: { label: 'Unreachable', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
        'no-data': { label: 'No data', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    };

    const config = badgeConfig[reliability.status] || badgeConfig['no-data'];
    const ratioText = reliability.totalQueries ? ` (${reliability.successCount}/${reliability.totalQueries})` : '';

    return `
        <div class="mt-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${config.classes}">
                ${config.label}${ratioText}
            </span>
        </div>
    `;
}

function sortTable(columnIndex) {
    let table = document.getElementById("resultsTable");
    let rows = Array.from(table.getElementsByTagName("tr"));

    let startIndex = 1; // Adjust this index as per your table structure

    let rowPairs = [];
    for (let i = startIndex; i < rows.length; i++) {
        if (!rows[i].classList.contains("details-row")) {
            let detailRow = (i + 1 < rows.length && rows[i + 1].classList.contains("details-row")) ? rows[i + 1] : null;
            rowPairs.push([rows[i], detailRow]);
        }
    }

    rowPairs.sort((a, b) => {
        let cellA = a[0].getElementsByTagName("TD")[columnIndex];
        let cellB = b[0].getElementsByTagName("TD")[columnIndex];

        if (!cellA || !cellB) {
            console.error("Undefined cell encountered", {
                cellA, cellB, rowIndexA: a[0].rowIndex, rowIndexB: b[0].rowIndex
            });
            return 0;
        }

        let valA = cellA.textContent.trim();
        let valB = cellB.textContent.trim();

        // Convert 'Unavailable' to a high number for sorting
        valA = valA === 'Unavailable' ? Infinity : parseFloat(valA) || 0;
        valB = valB === 'Unavailable' ? Infinity : parseFloat(valB) || 0;

        if (valA < valB) return -1;
        if (valA > valB) return 1;
        return 0;
    });

    for (let pair of rowPairs) {
        table.appendChild(pair[0]);
        if (pair[1]) table.appendChild(pair[1]);
    }
}

function copyToClipboard(text, buttonElement) {
    event.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
        // Change button state to indicate success
        buttonElement.className = "cursor-pointer ml-2 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 border border-green-400 text-green-700 dark:text-green-300 rounded flex items-center gap-1 transition-all duration-200 select-none inline-flex";
        buttonElement.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Copied!
        `;

        // Revert button state after 2 seconds
        setTimeout(() => {
            buttonElement.className = "cursor-pointer ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded flex items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 select-none inline-flex";
            buttonElement.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                Copy
            `;
        }, 2000);
    }).catch(err => {
        console.error('Error in copying text: ', err);
        // Show error state
        buttonElement.className = "cursor-pointer ml-2 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 border border-red-400 text-red-700 dark:text-red-300 rounded flex items-center gap-1 transition-all duration-200 select-none inline-flex";
        buttonElement.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
            Error
        `;
        setTimeout(() => {
            buttonElement.className = "cursor-pointer ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded flex items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 select-none inline-flex";
            buttonElement.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                Copy
            `;
        }, 2000);
    });
}

document.getElementById('cta').addEventListener('click', function () {
    if (navigator.share) {
        navigator.share({
            title: 'Find the Fastest DNS Server for You',
            text: 'Check out this tool to find the fastest DNS server for your location!',
            url: window.location.href
        }).then(() => {
            console.log('Thanks for sharing!');
        }).catch(console.error);
    }
});

// Add this at the top of your script, after the global variable declarations
window.addEventListener('resize', function () {
    updateChartVisibility();
    if (dnsChart) {
        dnsChart.resize(); // This line triggers the chart to resize
    }
});

function updateChartVisibility() {
    // Horizontal bar chart works well on mobile - no need to hide
    // Chart is responsive and maintains good UX on all screen sizes
}

// JavaScript to handle modal and list manipulation
function showRecommendationPopup() {
    const modal = document.getElementById('recommendModal');
    const container = document.getElementById('recommendationCards');
    const explanation = document.getElementById('recommendationExplanation');

    // Filter healthy servers and sort by median speed
    const candidates = dnsServers
        .filter(s => s.reliability && s.reliability.status === 'healthy')
        .sort((a, b) => (a.speed.median || 9999) - (b.speed.median || 9999))
        .slice(0, 3);

    if (candidates.length === 0) return;

    container.innerHTML = '';
    candidates.forEach((server, index) => {
        const card = document.createElement('div');
        const rankColor = index === 0 ? 'from-yellow-400 to-amber-600' : 
                         index === 1 ? 'from-slate-300 to-slate-500' : 
                         'from-orange-400 to-red-600';
        
        const validResults = server.individualResults?.filter(r => typeof r.speed === 'number').map(r => r.speed) || [];
        const jitter = validResults.length > 1 ? Math.max(...validResults) - Math.min(...validResults) : 0;

        card.className = 'bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-blue-500/30 transition-all';
        card.innerHTML = `
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${rankColor}"></div>
            <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-xl font-bold text-white/50">
                #${index + 1}
            </div>
            <h4 class="text-xl font-bold text-white mb-1">${server.name}</h4>
            <div class="text-3xl font-black text-blue-400 mb-4">${server.speed.median.toFixed(1)}<span class="text-xs font-normal text-slate-500">ms</span></div>
            <div class="flex flex-col gap-2 w-full">
                <div class="flex justify-between text-xs px-2">
                    <span class="text-slate-500 uppercase font-bold tracking-tighter">Consistency</span>
                    <span class="text-emerald-400 font-mono">${jitter.toFixed(1)}ms jitter</span>
                </div>
                <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full" style="width: ${Math.max(10, 100 - (jitter * 2))}%"></div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    const best = candidates[0];
    explanation.textContent = `${best.name} is your optimal choice today because it maintains the lowest median latency (${best.speed.median.toFixed(2)}ms) across all tested endpoints. Combined with a success rate of 100%, it offers the most stable and responsive resolution for your current network path.`;

    modal.classList.remove('hidden');
}

// Modal management system
const modalIds = ['recommendModal', 'websiteModal', 'dohModal'];

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}

function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
}

document.addEventListener('click', function(e) {
    // Handling close buttons (X) and background clicks
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;
        
        const isClickOutside = e.target === modal;
        const isCloseBtn = e.target.classList.contains('close') && e.target.closest(`#${id}`);
        const isActionBtn = e.target.classList.contains('close-recommend') || e.target.classList.contains('acknowledge-btn'); // For specific modal buttons

        if (isClickOutside || isCloseBtn || isActionBtn) {
            modal.classList.add('hidden');
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    updateChartVisibility();
    document.getElementById('resultsTable').addEventListener('click', function (event) {
        let row = event.target.closest('tr');
        if (row && !row.classList.contains('details-row')) {
            let detailsRow = row.nextElementSibling;
            if (detailsRow && detailsRow.classList.contains('details-row')) {
                detailsRow.classList.toggle('hidden');
            }
        }
    });

    const modal = document.getElementById("websiteModal");
    const btn = document.getElementById("editButton"); // Button that opens the modal
    const span = document.getElementsByClassName("close")[0];
    const addBtn = document.getElementById("addHostname");
    const input = document.getElementById("newWebsite");
    const list = document.getElementById("websiteList");

    // Function to render the list
    function renderList() {
        list.innerHTML = '';
        topWebsites.forEach((site, index) => {
            const li = document.createElement("li");
            li.className = 'px-4 py-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5 group hover:bg-white/10 transition-colors';

            const siteText = document.createElement("span");
            siteText.className = 'text-slate-300 font-medium';
            siteText.textContent = site;
            li.appendChild(siteText);

            const removeBtn = document.createElement("button");
            removeBtn.className = 'text-slate-500 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100';
            removeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>';
            removeBtn.onclick = function () {
                topWebsites.splice(index, 1);
                renderList();
            };

            li.appendChild(removeBtn);
            list.appendChild(li);
        });
        checkButton.disabled = topWebsites.length === 0;
    }

    // Open the modal
    btn.onclick = function () {
        openModal("websiteModal");
        renderList();
    }

    function validateAndExtractHost(input) {
        try {
            // Check if input is a valid URL with http or https protocol
            const url = new URL(input);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                throw new Error("Invalid protocol");
            }
            return url.hostname; // Return the hostname part of the URL
        } catch (e) {
            // If it's not a URL, check if it's a valid hostname
            const hostnameRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;
            if (hostnameRegex.test(input)) {
                return input; // Return the input as it's a valid hostname
            } else {
                return null; // Invalid input
            }
        }
    }

    // Close the modal
    // Handled by global listener

    // Add new website
    addBtn.onclick = function () {
        const host = validateAndExtractHost(input.value);
        if (host) {
            if (!topWebsites.includes(host)) {
                topWebsites.push(host);
                renderList();
            } else {
                alert("This website is already in the list.");
            }
        } else {
            alert("Please enter a valid URL or hostname.");
        }
        input.value = ''; // Clear the input field
    }

    // Close the modal when clicking outside of it
    // Handled by global listener


    const dohModal = document.getElementById("dohModal");
    const dohBtn = document.getElementById("editDoHButton");
    const closeDohBtn = dohModal.querySelector(".close");
    const addDoHBtn = document.getElementById("addDoH");
    const newDoHInput = document.getElementById("newDoH");
    const dohList = document.getElementById("dohList");

    // Function to render the DoH servers list
    function renderDoHList() {
        dohList.innerHTML = '';
        dnsServers.forEach((server, index) => {
            const li = document.createElement("li");
            li.className = 'px-4 py-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5 group hover:bg-white/10 transition-colors';

            const serverInfo = document.createElement("div");
            serverInfo.className = 'flex flex-col';
            serverInfo.innerHTML = `
                <span class="text-white/90 font-semibold text-sm">${server.name}</span>
                <span class="text-slate-500 text-xs truncate max-w-[300px]">${server.url}</span>
            `;
            li.appendChild(serverInfo);

            const removeBtn = document.createElement("button");
            removeBtn.className = 'text-slate-500 hover:text-red-400 p-2 transition-colors opacity-0 group-hover:opacity-100';
            removeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>';
            removeBtn.onclick = function () {
                dnsServers.splice(index, 1);
                renderDoHList();
            };

            li.appendChild(removeBtn);
            dohList.appendChild(li);
        });
    }

    dohBtn.onclick = function () {
        openModal("dohModal");
        renderDoHList();
    };

    // Close buttons handled by global listener

    // Add new DoH server with automatic capability check
    addDoHBtn.onclick = function () {
        const serverDetails = newDoHInput.value.split(', '); // Expected format: "Name, URL"
        if (serverDetails.length >= 2) {
            const [name, url] = serverDetails;

            // Check if server already exists by URL or name
            const isDuplicate = dnsServers.some(server => server.url === url || server.name === name);
            if (!isDuplicate) {
                // If not duplicate, proceed to check and add the server
                checkServerCapabilities(name, url);
            } else {
                alert("A server with the same name or URL already exists. Please enter a unique name and URL.");
            }
        } else {
            alert("Please enter DoH server details in the correct format: Name, URL");
        }
        newDoHInput.value = ''; // Clear the input field
    };

    // Handled by global listener

    // Function to check server capabilities for CORS and method support
    async function checkServerCapabilities(name, url) {
        const testHostname = 'example.com';
        const dnsQuery = buildDNSQuery(testHostname);
        const usesJsonApi = (() => {
            try {
                return new URL(url).pathname.includes('/resolve');
            } catch (e) {
                return false;
            }
        })();

        const wireGetUrl = (() => {
            const u = new URL(url);
            u.searchParams.set('dns', encodeDnsQueryBase64Url(dnsQuery));
            return u;
        })();

        const jsonGetUrl = (() => {
            const u = new URL(url);
            u.searchParams.set('name', testHostname);
            u.searchParams.set('type', 'A');
            u.searchParams.set('nocache', Date.now());
            return u;
        })();

        const withTimeout = async (input, options = {}) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            try {
                return await fetch(input, {...options, signal: controller.signal});
            } catch (error) {
                console.error('Capability test error', {input, options, error});
                return null;
            } finally {
                clearTimeout(timer);
            }
        };

        const testGet = async (mode) => {
            const urlToUse = usesJsonApi ? jsonGetUrl : wireGetUrl;
            const headers = usesJsonApi ? {'Accept': 'application/dns-json'} : {'Accept': 'application/dns-message'};
            const response = await withTimeout(urlToUse, {method: 'GET', mode, headers});
            if (!response) return {success: false, cors: false};
            if (mode === 'cors') {
                const corsAllowed = response.type === 'cors';
                return {success: response.ok, cors: corsAllowed};
            }
            // In no-cors mode we can't inspect status; assume success if no network error
            return {success: true, cors: false};
        };

        const testPostCors = async () => {
            // Only meaningful for wire-format endpoints
            if (usesJsonApi) return {success: false, cors: false};
            const response = await withTimeout(url, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/dns-message',
                    'Accept': 'application/dns-message'
                },
                body: dnsQuery
            });
            if (!response) return {success: false, cors: false};
            return {success: response.ok, cors: response.type === 'cors'};
        };

        const [getCors, postCors, getNoCors] = await Promise.all([
            testGet('cors'),
            testPostCors(),
            testGet('no-cors')
        ]);

        let chosenType = null;
        let allowCors = false;

        if (getCors.success) {
            chosenType = 'get';
            allowCors = true;
        } else if (postCors.success) {
            chosenType = 'post';
            allowCors = true;
        } else if (getNoCors.success) {
            chosenType = 'get';
            allowCors = false;
        }

        if (chosenType) {
            dnsServers.push({name, url, type: chosenType, allowCors, ips: []});
            renderDoHList();
            alert(`Server added. GET: ${getCors.success || getNoCors.success} (CORS: ${getCors.cors}), POST: ${postCors.success} (CORS: ${postCors.cors}). Using ${chosenType.toUpperCase()} with${allowCors ? '' : 'out'} CORS.`);
        } else {
            alert('Failed to add server. Neither GET nor POST methods succeeded. Check console for details.');
        }
    }
});
