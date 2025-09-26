const API_URL = '/api';

let currentMode = 'blacklist';
let rules = {};

async function loadRules() {
    try {
        const response = await fetch(`${API_URL}/rules`);
        rules = await response.json();
        updateUI();
    } catch (error) {
        console.error('Failed to load rules:', error);
    }
}

function updateUI() {
    document.getElementById('blacklist-mode').classList.toggle('active', rules.mode === 'blacklist');
    document.getElementById('whitelist-mode').classList.toggle('active', rules.mode === 'whitelist');

    if (rules.mode === 'whitelist') {
        document.getElementById('mode-description').textContent =
            'Only allow specific websites while blocking everything else';
    } else {
        document.getElementById('mode-description').textContent =
            'Block specific websites while allowing everything else';
    }

    Object.keys(rules.categories || {}).forEach(category => {
        const checkbox = document.getElementById(`cat-${category}`);
        if (checkbox) {
            checkbox.checked = rules.blockedCategories?.includes(category) || false;
        }
    });

    updateDomainLists();
    loadActivityLog();
}

function updateDomainLists() {
    const blockedList = document.getElementById('blocked-list');
    const allowedList = document.getElementById('allowed-list');

    blockedList.innerHTML = '';
    allowedList.innerHTML = '';

    (rules.blocked || []).forEach(domain => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${domain}
            <button onclick="removeDomain('blocked', '${domain}')">Remove</button>
        `;
        blockedList.appendChild(li);
    });

    (rules.allowed || []).forEach(domain => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${domain}
            <button onclick="removeDomain('allowed', '${domain}')">Remove</button>
        `;
        allowedList.appendChild(li);
    });
}

async function removeDomain(type, domain) {
    try {
        const endpoint = type === 'blocked' ? 'block' : 'allow';
        await fetch(`${API_URL}/rules/${endpoint}/${encodeURIComponent(domain)}`, {
            method: 'DELETE'
        });
        await loadRules();
    } catch (error) {
        console.error('Failed to remove domain:', error);
    }
}

async function addDomain(type) {
    const input = document.getElementById('domain-input');
    const domain = input.value.trim();

    if (!domain) return;

    try {
        const endpoint = type === 'block' ? 'block' : 'allow';
        const response = await fetch(`${API_URL}/rules/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });

        if (response.ok) {
            input.value = '';
            await loadRules();
        }
    } catch (error) {
        console.error('Failed to add domain:', error);
    }
}

async function testDomain() {
    const input = document.getElementById('test-input');
    const resultDiv = document.getElementById('test-result');
    const domain = input.value.trim();

    if (!domain) return;

    try {
        const response = await fetch(`${API_URL}/test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });

        const result = await response.json();

        resultDiv.style.display = 'block';
        if (result.isBlocked) {
            resultDiv.className = 'blocked';
            resultDiv.textContent = `${domain} is BLOCKED`;
        } else {
            resultDiv.className = 'allowed';
            resultDiv.textContent = `${domain} is ALLOWED`;
        }
    } catch (error) {
        console.error('Failed to test domain:', error);
    }
}

async function toggleCategory(category) {
    try {
        await fetch(`${API_URL}/rules/category/${category}`, {
            method: 'POST'
        });
        await loadRules();
    } catch (error) {
        console.error('Failed to toggle category:', error);
    }
}

async function setMode(mode) {
    try {
        await fetch(`${API_URL}/rules/mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode })
        });
        currentMode = mode;
        await loadRules();
    } catch (error) {
        console.error('Failed to set mode:', error);
    }
}

async function loadActivityLog() {
    try {
        const response = await fetch(`${API_URL}/logs`);
        const logs = await response.json();

        const logContainer = document.getElementById('activity-log');
        logContainer.innerHTML = '';

        logs.slice(0, 50).forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${log.status.toLowerCase()}`;

            const time = new Date(log.timestamp).toLocaleTimeString();
            entry.innerHTML = `
                <span>${log.domain}</span>
                <span>
                    <span style="margin-right: 10px;">${log.status}</span>
                    <span class="log-time">${time}</span>
                </span>
            `;

            logContainer.appendChild(entry);
        });
    } catch (error) {
        console.error('Failed to load activity log:', error);
    }
}

async function getServerIP() {
    try {
        const response = await fetch('/api/server-info');
        const info = await response.json();
        document.getElementById('dns-ip').textContent = info.ip || 'Your Server IP';
    } catch (error) {
        const hostname = window.location.hostname;
        document.getElementById('dns-ip').textContent = hostname || 'Your Server IP';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    getServerIP();

    document.getElementById('block-btn').addEventListener('click', () => addDomain('block'));
    document.getElementById('allow-btn').addEventListener('click', () => addDomain('allow'));
    document.getElementById('test-btn').addEventListener('click', testDomain);

    document.getElementById('blacklist-mode').addEventListener('click', () => setMode('blacklist'));
    document.getElementById('whitelist-mode').addEventListener('click', () => setMode('whitelist'));

    document.querySelectorAll('.category-item input').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const category = e.target.parentElement.dataset.category;
            toggleCategory(category);
        });
    });

    document.getElementById('domain-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addDomain('block');
        }
    });

    document.getElementById('test-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            testDomain();
        }
    });

    setInterval(loadActivityLog, 5000);
});

window.removeDomain = removeDomain;