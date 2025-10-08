import type { PreparedCard } from './dedupe';
import type { MediaPolicy } from '@messaging/schemas';

export interface MediaDownload {
  sourceUrl: string;
  filename: string;
  contentType?: string;
  data?: string;
  status: 'stored' | 'skipped' | 'failed';
  error?: string;
}

export interface ProcessedCard {
  card: PreparedCard;
  assets: MediaDownload[];
}

const DATA_URL_REGEX = /^data:/i;
const EXTENSION_FROM_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg'
};

// Use regex instead of DOMParser (not available in Service Worker)
const IMG_SRC_REGEX = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;

const toBase64 = (buffer: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));

const guessExtension = (sourceUrl: string, contentType?: string) => {
  if (contentType && EXTENSION_FROM_TYPE[contentType]) {
    return EXTENSION_FROM_TYPE[contentType];
  }
  try {
    const url = new URL(sourceUrl, 'https://example.com');
    const path = url.pathname;
    const ext = path.split('.').pop();
    if (ext && ext.length <= 5) {
      return ext.toLowerCase();
    }
  } catch {
    // Invalid URL, fallback to png
  }
  return 'png';
};

const buildFilename = (hash: string, index: number, ext: string) => `qa_clip_${hash}_${index}.${ext}`;

const collectImageSources = (html: string): string[] => {
  const sources = new Set<string>();
  let match: RegExpExecArray | null;
  
  // Reset regex lastIndex
  IMG_SRC_REGEX.lastIndex = 0;
  
  while ((match = IMG_SRC_REGEX.exec(html)) !== null) {
    const src = match[1];
    if (src) {
      sources.add(src);
    }
  }
  
  return Array.from(sources);
};

const rewriteSources = (html: string, replacements: Record<string, string>) => {
  let result = html;
  
  // Replace each source URL with its replacement
  Object.entries(replacements).forEach(([oldSrc, newSrc]) => {
    // Escape special regex characters in the source URL
    const escapedSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match src="oldUrl" or src='oldUrl'
    const regex = new RegExp(`(<img[^>]+src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    result = result.replace(regex, `$1${newSrc}$2`);
  });
  
  return result;
};

const downloadBinary = async (url: string, signal: AbortSignal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') ?? undefined;
  const buffer = await response.arrayBuffer();
  return { buffer, contentType };
};

export class MediaDownloader {
  constructor(private maxConcurrent = 3) {}

  async processCard(card: PreparedCard, policy?: MediaPolicy): Promise<ProcessedCard> {
    const images = [
      ...collectImageSources(card.frontHtml),
      ...collectImageSources(card.backHtml)
    ];

    if (!images.length) {
      return { card, assets: [] };
    }

    const uniqueImages = Array.from(new Set(images));
    const replacements: Record<string, string> = {};
    const assets: MediaDownload[] = [];

    let active = 0;
    let index = 0;

    const downloadNext = async (): Promise<void> => {
      if (index >= uniqueImages.length) {
        return;
      }
      if (active >= (policy?.concurrency ?? this.maxConcurrent)) {
        return;
      }

      const sourceUrl = uniqueImages[index];
      index += 1;
      active += 1;

      const controller = new AbortController();
      const { signal } = controller;

      const finalize = () => {
        active -= 1;
      };

      try {
        if (DATA_URL_REGEX.test(sourceUrl)) {
          const inlineIndex = assets.length;
          const filename = buildFilename(card.hash ?? 'inline', inlineIndex, 'png');
          replacements[sourceUrl] = filename;
          assets.push({
            sourceUrl,
            filename,
            status: 'stored',
            data: sourceUrl.split(',')[1],
            contentType: sourceUrl.substring(5, sourceUrl.indexOf(';'))
          });
        } else if (policy?.downloadExternal === false && /^https?:/i.test(sourceUrl)) {
          assets.push({ sourceUrl, filename: sourceUrl, status: 'skipped', error: 'External downloads disabled' });
        } else {
          const { buffer, contentType } = await downloadBinary(sourceUrl, signal);
          const ext = guessExtension(sourceUrl, contentType);
          const filename = buildFilename(card.hash ?? 'media', assets.length, ext);
          replacements[sourceUrl] = filename;
          assets.push({
            sourceUrl,
            filename,
            data: toBase64(buffer),
            contentType,
            status: 'stored'
          });
        }
      } catch (error) {
        assets.push({
          sourceUrl,
          filename: sourceUrl,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        finalize();
        await downloadNext();
      }
    };

    const initial = Math.min(policy?.concurrency ?? this.maxConcurrent, uniqueImages.length);
    await Promise.all(Array.from({ length: initial }, () => downloadNext()));

    const updatedFront = rewriteSources(card.frontHtml, replacements);
    const updatedBack = rewriteSources(card.backHtml, replacements);

    return {
      card: { ...card, frontHtml: updatedFront, backHtml: updatedBack },
      assets
    };
  }
}
