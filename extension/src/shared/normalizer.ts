// Use regex to strip HTML tags (Service Worker compatible)
const htmlToText = (html: string): string => {
  // Remove script and style tags with their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  return text;
};

const normalizeWhitespace = (input: string): string =>
  input
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeFrontForHash = (html: string): string => {
  const text = htmlToText(html);
  const lower = text.toLocaleLowerCase();
  const normalized = normalizeWhitespace(lower);
  return normalized.normalize('NFKC');
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

export const hashNormalizedFront = async (normalized: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest).slice(0, 12);
};

export const computeFrontHash = async (frontHtml: string): Promise<{ normalized: string; hash: string }> => {
  const normalized = normalizeFrontForHash(frontHtml);
  const hash = await hashNormalizedFront(normalized);
  return { normalized, hash };
};
