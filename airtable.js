// netlify/functions/airtable.js
// Proxies all Airtable requests so the token never reaches the browser.
// Environment variables required (set in Netlify dashboard → Site → Environment variables):
//   AIRTABLE_TOKEN   — your Personal Access Token
//   AIRTABLE_BASE    — your base ID (e.g. appDVT20bEp9giK53)
//   AIRTABLE_TABLE   — table name (e.g. Submissions)
//   ALLOWED_ORIGIN   — your site URL for CORS (e.g. https://your-site.netlify.app)
//                      Use * during local dev only.

const AT_TOKEN = process.env.AIRTABLE_TOKEN;
const AT_BASE  = process.env.AIRTABLE_BASE;
const AT_TABLE = process.env.AIRTABLE_TABLE || 'Submissions';
const ORIGIN   = process.env.ALLOWED_ORIGIN || '*';

const AT_BASE_URL = `https://api.airtable.com/v0/${AT_BASE}/${encodeURIComponent(AT_TABLE)}`;

const CORS = {
  'Access-Control-Allow-Origin':  ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async (event) => {
  // Pre-flight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (!AT_TOKEN || !AT_BASE) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Server misconfiguration: missing env vars.' }),
    };
  }

  // Build the Airtable URL.
  // Query-string params (offset, filterByFormula, etc.) are forwarded as-is.
  const qs = event.queryStringParameters
    ? '?' + new URLSearchParams(event.queryStringParameters).toString()
    : '';

  // The record ID (for PATCH / DELETE) comes from the path:
  //   /.netlify/functions/airtable/recXXXXXXXXXX
  const pathParts = (event.path || '').split('/').filter(Boolean);
  const recordId  = pathParts[pathParts.length - 1];
  const isRecord  = recordId && recordId.startsWith('rec');
  const url       = isRecord ? `${AT_BASE_URL}/${recordId}${qs}` : `${AT_BASE_URL}${qs}`;

  const fetchOpts = {
    method:  event.httpMethod,
    headers: {
      Authorization:  `Bearer ${AT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (['POST', 'PATCH', 'PUT'].includes(event.httpMethod) && event.body) {
    fetchOpts.body = event.body;
  }

  try {
    const res  = await fetch(url, fetchOpts);
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: 'Upstream fetch failed', detail: err.message }),
    };
  }
};
