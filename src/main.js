import { Actor, log } from 'apify';

// Some public APIs refuse requests that identify themselves only as Node's default "node" user agent (data.cms.gov
// started doing so in October 2026), so every request says which tool is asking and where to find it.
const USER_AGENT = 'fcc-consumer-complaint-tracker/0.1 (+https://apify.com/m_ctim/fcc-consumer-complaint-tracker)';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { state, issueType, daysBack = 30, maxResults = 50 } = input;

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const COMPLAINT_SEARCH_EVENT = 'complaint-search';

const API_URL = 'https://opendata.fcc.gov/resource/sr6c-syda.json';

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
        } catch (err) {
            lastError = err.name === 'AbortError' ? new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`) : err;
            if (attempt < MAX_ATTEMPTS) {
                await sleep(1000 * 2 ** (attempt - 1));
                continue;
            }
            throw lastError;
        } finally {
            clearTimeout(timeoutId);
        }
        if (res.ok) return res;
        if (!TRANSIENT_STATUSES.has(res.status)) {
            const body = await res.text().catch(() => '');
            throw new Error(`FCC open data request failed: ${res.status} ${res.statusText} ${body.slice(0, 300)}`.trim());
        }
        lastError = new Error(`FCC open data request failed: ${res.status} ${res.statusText}`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

function isoDate(d) {
    return d.toISOString().slice(0, 19);
}

const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

const params = new URLSearchParams({
    '$limit': String(Math.min(maxResults, 1000)),
    '$order': 'ticket_created DESC',
    '$where': `ticket_created > '${isoDate(cutoff)}'`,
});
if (state) params.set('state', state.toUpperCase());
if (issueType) params.set('issue_type', issueType);

log.info('Searching FCC consumer complaints', { state: state || '(any)', issueType: issueType || '(any)', daysBack });

const res = await fetchWithRetry(`${API_URL}?${params.toString()}`);
const results = await res.json();

for (const r of results) {
    await Actor.pushData({
        complaintId: r.id ?? null,
        ticketCreated: r.ticket_created ?? null,
        issueType: r.issue_type ?? null,
        issue: r.issue ?? null,
        method: r.method ?? null,
        callerIdNumber: r.caller_id_number || null,
        advertiserPhoneNumber: r.advertiser_business_phone_number || null,
        city: r.city ?? null,
        state: r.state ?? null,
        zip: r.zip ?? null,
        location: r.location_1?.coordinates ?? null,
    });
}

await Actor.charge({ eventName: COMPLAINT_SEARCH_EVENT });

log.info(`Found ${results.length} complaint record(s)`);

await Actor.exit();
