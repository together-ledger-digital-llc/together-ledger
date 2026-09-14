const APP_ORIGIN = 'https://app.together-ledger.com';
const REQUIRED_TEXT = 'Keep what matters,';
const maximumHomepageBytes = 256 * 1024;
const revisionPath = /^\/verify\/([0-9a-f]{40})$/i;

function json(body, status) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function containsRequiredText(response) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumHomepageBytes) return false;
  if (!response.body) return false;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maximumHomepageBytes) return false;
      text += decoder.decode(value, { stream: true });
      if (text.includes(REQUIRED_TEXT)) return true;
    }
    return (text + decoder.decode()).includes(REQUIRED_TEXT);
  } finally {
    reader.releaseLock();
  }
}

export function createAppReleaseProbe(fetchImpl = fetch) {
  return {
    async fetch(request) {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { allow: 'GET' } });

      const match = new URL(request.url).pathname.match(revisionPath);
      if (!match) return new Response(null, { status: 404 });

      const revision = match[1].toLowerCase();
      const markerUrl = new URL('/release.json', APP_ORIGIN);
      markerUrl.searchParams.set('revision', revision);

      try {
        const [markerResponse, homepageResponse] = await Promise.all([
          fetchImpl(markerUrl, { headers: { 'cache-control': 'no-cache' } }),
          fetchImpl(APP_ORIGIN, { headers: { 'cache-control': 'no-cache' } }),
        ]);
        if (!markerResponse.ok || !homepageResponse.ok) return json({ verified: false, revision }, 503);

        const marker = await markerResponse.json();
        if (marker.revision !== revision || !(await containsRequiredText(homepageResponse))) {
          return json({ verified: false, revision }, 503);
        }
        return json({ verified: true, revision }, 200);
      } catch {
        return json({ verified: false, revision }, 503);
      }
    },
  };
}

export default createAppReleaseProbe();
