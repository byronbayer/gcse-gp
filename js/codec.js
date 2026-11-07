// Packs a result object into a short URL-safe string (deflate + base64url) and back.
const toB64u = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64u = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const pipe = async (bytes, Stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))).arrayBuffer());

export async function encodeResult(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream !== 'undefined') {
    try { return 'z' + toB64u(await pipe(bytes, CompressionStream)); } catch { /* fall through */ }
  }
  return 'j' + toB64u(bytes);
}

export async function decodeResult(code) {
  code = decodeURIComponent(code.trim());
  const kind = code[0], bytes = fromB64u(code.slice(1));
  const raw = kind === 'z' ? await pipe(bytes, DecompressionStream) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}
