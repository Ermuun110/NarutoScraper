import axios from 'axios';
import crypto from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { HTTP } from '../config.js';

const PLATFORM = 'Mercari';
const SEARCH_API = 'https://api.mercari.jp/v2/entities:search';

// Mercari's web API requires a DPoP proof: an ES256-signed JWT carrying an
// ephemeral public key (jwk) plus the request method/URL. No login needed for
// guest search — the keypair is generated fresh each call.
async function makeDpop(url, method) {
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const jwk = await exportJWK(publicKey);

  return new SignJWT({
    htu: url, // target URL, no query string
    htm: method, // HTTP method
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk })
    .setIssuedAt()
    .sign(privateKey);
}

export async function scrapeMercari(keyword) {
  const dpop = await makeDpop(SEARCH_API, 'POST');

  const headers = {
    ...HTTP.headers,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    DPoP: dpop,
    'X-Platform': 'web',
    Origin: 'https://jp.mercari.com',
    Referer: 'https://jp.mercari.com/',
  };

  const body = {
    userId: '',
    pageSize: 60,
    searchSessionId: crypto.randomUUID(),
    indexRouting: 'INDEX_ROUTING_UNSPECIFIED',
    thumbnailTypes: [],
    searchCondition: {
      keyword,
      excludeKeyword: '',
      sort: 'SORT_CREATED_TIME',
      order: 'ORDER_DESC',
      status: ['STATUS_ON_SALE'],
    },
    defaultDatabaseId: '',
    serviceFrom: 'suruga',
  };

  const res = await axios.post(SEARCH_API, body, { ...HTTP, headers });
  const items = res.data?.items || [];

  // status filter already excludes sold; re-check per item to be safe.
  const onSale = items.filter((it) => {
    const s = String(it.status || '').toUpperCase();
    return s === '' || s.includes('ON_SALE');
  });

  return onSale.map((it) => ({
    platform: PLATFORM,
    id: it.id,
    title: it.name,
    price: it.price != null ? Number(it.price) : null,
    url: `https://jp.mercari.com/item/${it.id}`,
    imageUrl: Array.isArray(it.thumbnails) ? it.thumbnails[0] : it.thumbnails,
  }));
}
