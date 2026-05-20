const express = require('express');
const path = require('path');
const cheerio = require('cheerio');

const app = express();
const port = process.env.PORT || 3000;
const root = path.resolve(__dirname);

app.use(express.static(root, { extensions: ['html'] }));

app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  let url;
  try {
    url = new URL(targetUrl);
  } catch (error) {
    return res.status(400).send('Invalid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return res.status(400).send('Only HTTP and HTTPS URLs are supported');
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || '';
    const responseHeaders = {};
    const strippedHeaders = [
      'content-security-policy',
      'x-frame-options',
      'strict-transport-security',
      'x-content-type-options',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'cross-origin-resource-policy',
      'permissions-policy',
      'document-policy',
      'origin-trial',
      'report-to',
      'reporting-endpoints',
      'expect-ct',
      'referrer-policy',
      'x-permitted-cross-domain-policies',
      'x-download-options',
      'x-content-security-policy',
      'x-webkit-csp',
    ];
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (!strippedHeaders.includes(lower)) {
        responseHeaders[name] = value;
      }
    });
    Object.entries(responseHeaders).forEach(([name, value]) => res.setHeader(name, value));

    if (contentType.includes('text/html')) {
      const html = await response.text();
      // Detect common GitHub Pages placeholder pages and return a clearer message
      const ghPagesPlaceholder = /github pages site here|There (isn(?:'|’)t|isn't) a GitHub Pages site here|There is no GitHub Pages site here|If you're seeing this page|No such app/i;
      if (ghPagesPlaceholder.test(html)) {
        const message = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site unavailable</title></head><body style="font-family:system-ui,Segoe UI,Arial;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#07030a;color:#fff"><div style="max-width:680px;padding:24px;border-radius:12px;background:rgba(0,0,0,0.6);text-align:center;"><h2>Site not available</h2><p>The requested site appears to be a GitHub Pages placeholder or is not configured. Try checking the URL or opening externally.</p></div></body></html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(404).send(message);
      }
      const proxied = rewriteHtml(html, url);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(proxied);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error('Proxy fetch error:', error.message);
    return res.status(502).send('Unable to load page via proxy.');
  }
});

function rewriteHtml(html, baseUrl) {
  const $ = cheerio.load(html, { decodeEntities: false });

  $('base').remove();

  // Remove Content-Security-Policy meta tags which often block script execution or framing
  $('meta[http-equiv="Content-Security-Policy"]').remove();
  $('meta[http-equiv="content-security-policy"]').remove();
  $('meta[name="content-security-policy"]').remove();
  $('meta[name="Content-Security-Policy"]').remove();

  // Generic removal for any meta tags that reference content-security-policy
  $('meta').each((_, el) => {
    const httpEquiv = ($(el).attr('http-equiv') || '').toLowerCase();
    const name = ($(el).attr('name') || '').toLowerCase();
    if (httpEquiv.includes('content-security-policy') || name.includes('content-security-policy')) {
      $(el).remove();
    }
  });

  // Remove nonce attributes on scripts/styles to avoid blocking injected helpers
  $('[nonce]').each((_, el) => $(el).removeAttr('nonce'));
  $('script').each((_, el) => $(el).removeAttr('nonce'));

  // Remove sandbox on nested iframes which can prevent functionality
  $('iframe[sandbox]').each((_, el) => $(el).removeAttr('sandbox'));

  const attributeMap = ['href', 'src', 'action', 'poster', 'data-src'];
  attributeMap.forEach((attr) => {
    $(`[${attr}]`).each((_, element) => {
      const current = $(element).attr(attr);
      const proxied = toProxyUrl(current, baseUrl);
      if (proxied) {
        $(element).attr(attr, proxied);
      }
    });
  });

  $('[srcset]').each((_, element) => {
    const raw = $(element).attr('srcset');
    if (!raw) return;
    const rewritten = raw
      .split(',')
      .map((entry) => {
        const [urlPart, descriptor] = entry.trim().split(/\s+/, 2);
        const proxied = toProxyUrl(urlPart, baseUrl);
        return proxied ? [proxied, descriptor].filter(Boolean).join(' ') : entry.trim();
      })
      .join(', ');
    $(element).attr('srcset', rewritten);
  });

  $('meta[http-equiv="refresh"]').each((_, element) => {
    const content = $(element).attr('content');
    if (content) {
      const [delay, target] = content.split(';').map((part) => part.trim());
      if (target && target.toLowerCase().startsWith('url=')) {
        const urlValue = target.slice(4);
        const proxied = toProxyUrl(urlValue, baseUrl);
        if (proxied) {
          $(element).attr('content', `${delay};url=${proxied}`);
        }
      }
    }
  });

  // Inject a small helper script that notifies the parent window when the proxied page is ready.
  // This helps the client detect pages that still fail to behave inside the iframe.
  try {
    $('body').append('<script>try{window.parent.postMessage({moonProxyReady:true,title:document.title},"*");}catch(e){};<\/script>');
  } catch (e) {
    // ignore injection errors
  }

  return $.html();
}

function toProxyUrl(value, baseUrl) {
  if (!value || value.startsWith('javascript:') || value.startsWith('data:') || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('#')) {
    return null;
  }

  let resolved;
  try {
    resolved = new URL(value, baseUrl).toString();
  } catch (error) {
    return null;
  }

  if (resolved.startsWith(baseUrl.origin + '/proxy')) {
    return resolved;
  }

  return `/proxy?url=${encodeURIComponent(resolved)}`;
}

app.listen(port, () => {
  console.log(`Moon Proxy server running on http://localhost:${port}`);
});
