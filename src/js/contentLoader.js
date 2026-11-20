import {
  CONTENT_ENDPOINTS,
  HERO_MEDIA,
  HOME_QUOTES,
  ALL_QUOTES,
  GALLERY_PHOTOS,
  INITIAL_BLOG_POSTS,
} from './data.js';

const CACHE_KEY = 'portfolio_remote_cache_v1';

const cachedContent = {
  homeQuotes: [...HOME_QUOTES],
  allQuotes: [...ALL_QUOTES],
  galleryPhotos: [...GALLERY_PHOTOS],
  blogPosts: [...INITIAL_BLOG_POSTS],
  portraitUrl: (CONTENT_ENDPOINTS?.portraitUrl || '').trim() || HERO_MEDIA.portrait,
};

let loadPromise = null;

function hasRemoteEndpoints() {
  return (
    Boolean(CONTENT_ENDPOINTS?.quotesUrl?.trim()) ||
    Boolean(CONTENT_ENDPOINTS?.galleryUrl?.trim()) ||
    Boolean(CONTENT_ENDPOINTS?.journalUrl?.trim())
  );
}

function isValidQuoteItem(item) {
  return Boolean(item && typeof item === 'object' && typeof item.text === 'string' && item.text.trim());
}

function isValidPhotoItem(item) {
  return Boolean(
    item &&
      typeof item === 'object' &&
      typeof item.src === 'string' &&
      item.src.trim() &&
      typeof item.title === 'string'
  );
}

function isValidBlogItem(item) {
  return Boolean(
    item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      Array.isArray(item.paragraphs)
  );
}

function hydrateFromLocalCache() {
  if (!hasRemoteEndpoints()) {
    try {
      window.localStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore storage access restrictions
    }
    return;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    if (Array.isArray(parsed.homeQuotes) && parsed.homeQuotes.every(isValidQuoteItem) && parsed.homeQuotes.length > 0) {
      cachedContent.homeQuotes = parsed.homeQuotes;
    }
    if (Array.isArray(parsed.allQuotes) && parsed.allQuotes.every(isValidQuoteItem) && parsed.allQuotes.length > 0) {
      cachedContent.allQuotes = parsed.allQuotes;
    }
    if (Array.isArray(parsed.galleryPhotos) && parsed.galleryPhotos.every(isValidPhotoItem) && parsed.galleryPhotos.length > 0) {
      cachedContent.galleryPhotos = parsed.galleryPhotos;
    }
    if (Array.isArray(parsed.blogPosts) && parsed.blogPosts.every(isValidBlogItem) && parsed.blogPosts.length > 0) {
      cachedContent.blogPosts = parsed.blogPosts;
    }
  } catch {
    // Ignore corrupt local cache
  }
}

function persistLocalCache() {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        homeQuotes: cachedContent.homeQuotes,
        allQuotes: cachedContent.allQuotes,
        galleryPhotos: cachedContent.galleryPhotos,
        blogPosts: cachedContent.blogPosts,
      })
    );
  } catch {
    // Ignore storage quota or private mode failures
  }
}

hydrateFromLocalCache();

function withCacheWindow(url) {
  const minuteBucket = Math.floor(Date.now() / 60000);
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${minuteBucket}`;
}

function loadScriptData(url, globalKey, timeoutMs = 2800) {
  return new Promise((resolve) => {
    let settled = false;
    const script = document.createElement('script');
    script.async = true;
    script.src = withCacheWindow(url);

    const finish = (val) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(val);
    };

    const timer = window.setTimeout(() => finish(null), timeoutMs);

    script.onload = () => {
      const payload = window[globalKey];
      finish(payload ?? null);
    };
    script.onerror = () => finish(null);
    document.head.appendChild(script);
  });
}

async function fetchJsonData(url, timeoutMs = 2800) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(withCacheWindow(url), {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function resolveEndpoint(url, globalKey) {
  const cleanUrl = typeof url === 'string' ? url.trim() : '';
  if (!cleanUrl) return null;
  if (cleanUrl.toLowerCase().split('?')[0].endsWith('.js')) {
    return loadScriptData(cleanUrl, globalKey);
  }
  return fetchJsonData(cleanUrl);
}

export function getLoadedContent() {
  return cachedContent;
}

export function getHeroPortrait() {
  return cachedContent.portraitUrl || HERO_MEDIA.portrait;
}

export async function loadPortfolioContent({ onUpdate, initialBudgetMs = 350 } = {}) {
  if (!hasRemoteEndpoints()) {
    return cachedContent;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const prevSnapshot = JSON.stringify({
        homeQuotes: cachedContent.homeQuotes,
        allQuotes: cachedContent.allQuotes,
        galleryPhotos: cachedContent.galleryPhotos,
        blogPosts: cachedContent.blogPosts,
      });

      const [quotesData, galleryData, journalData] = await Promise.all([
        resolveEndpoint(CONTENT_ENDPOINTS.quotesUrl, '__PORTFOLIO_QUOTES__'),
        resolveEndpoint(CONTENT_ENDPOINTS.galleryUrl, '__PORTFOLIO_GALLERY__'),
        resolveEndpoint(CONTENT_ENDPOINTS.journalUrl, '__PORTFOLIO_JOURNAL__'),
      ]);

      if (quotesData) {
        if (Array.isArray(quotesData)) {
          const valid = quotesData.filter(isValidQuoteItem);
          if (valid.length > 0) {
            cachedContent.allQuotes = valid;
            cachedContent.homeQuotes = valid.slice(0, 4);
          }
        } else if (typeof quotesData === 'object') {
          const validHome = Array.isArray(quotesData.homeQuotes)
            ? quotesData.homeQuotes.filter(isValidQuoteItem)
            : [];
          const validAll = Array.isArray(quotesData.allQuotes)
            ? quotesData.allQuotes.filter(isValidQuoteItem)
            : [];
          if (validHome.length > 0) cachedContent.homeQuotes = validHome;
          if (validAll.length > 0) cachedContent.allQuotes = validAll;
        }
      }

      if (Array.isArray(galleryData)) {
        const validPhotos = galleryData.filter(isValidPhotoItem);
        if (validPhotos.length > 0) {
          cachedContent.galleryPhotos = validPhotos;
        }
      }

      if (Array.isArray(journalData)) {
        const validPosts = journalData.filter(isValidBlogItem);
        if (validPosts.length > 0) {
          cachedContent.blogPosts = validPosts;
        }
      }

      const nextSnapshot = JSON.stringify({
        homeQuotes: cachedContent.homeQuotes,
        allQuotes: cachedContent.allQuotes,
        galleryPhotos: cachedContent.galleryPhotos,
        blogPosts: cachedContent.blogPosts,
      });

      if (nextSnapshot !== prevSnapshot) {
        persistLocalCache();
        return { content: cachedContent, changed: true };
      }

      persistLocalCache();
      return { content: cachedContent, changed: false };
    })();
  }

  // Non-blocking stale-while-revalidate race so slow edges never stall first paint
  let timedOut = false;
  const result = await Promise.race([
    loadPromise,
    new Promise((resolve) =>
      window.setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, initialBudgetMs)
    ),
  ]);

  if (timedOut && typeof onUpdate === 'function') {
    loadPromise.then((res) => {
      if (res?.changed) {
        onUpdate(res.content);
      }
    });
  }

  return result?.content || cachedContent;
}
