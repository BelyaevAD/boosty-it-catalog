import fs from "node:fs/promises";
import path from "node:path";
import {
  DISCOVERY_QUERIES,
  extractBoostySlugs,
  fetchBoostyChannel,
  localIsoDate,
  mapWithConcurrency,
  toPublicChannel,
  unique,
} from "./lib/catalog.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "data", "channels.json");
const rawPath = path.join(root, "data", "raw", "boosty-candidates.json");
const historyDir = path.join(root, "data", "history");
const reportPath = path.join(root, "data", "latest-update.json");
const checkedAt = process.env.CATALOG_DATE || localIsoDate();
const githubToken = process.env.GITHUB_TOKEN || "";

async function fetchText(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: {
          accept: options.accept || "text/plain, application/xml;q=0.9, */*;q=0.5",
          "accept-language": "ru-RU,ru;q=0.9,en;q=0.6",
          "user-agent": "BoostyITCatalog/1.0 (+https://github.com/)",
          ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
          ...(options.token ? { "x-github-api-version": "2022-11-28" } : {}),
        },
      });
      if (response.ok) return response.text();
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1)));
  }
  throw new Error(`Unable to fetch ${url}`);
}

async function discoverFromBing(query) {
  const url = `https://www.bing.com/search?format=rss&setlang=ru&q=${encodeURIComponent(query)}`;
  const rss = await fetchText(url, { accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8" });
  return extractBoostySlugs(rss);
}

async function discoverFromGitHub() {
  if (!githubToken) return [];
  const queries = [
    '"boosty.to/" программирование extension:md',
    '"boosty.to/" devops extension:md',
    '"boosty.to/" нейросети extension:md',
  ];
  const codeUrls = [];
  for (const query of queries) {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=20`;
    try {
      const response = JSON.parse(await fetchText(url, {
        token: githubToken,
        accept: "application/vnd.github+json",
      }));
      codeUrls.push(...(response.items || []).map((item) => item.url));
    } catch (error) {
      console.warn(`GitHub discovery skipped for "${query}": ${error.message}`);
    }
  }

  const contents = await mapWithConcurrency(unique(codeUrls).slice(0, 50), 3, async (url) => {
    const payload = JSON.parse(await fetchText(url, {
      token: githubToken,
      accept: "application/vnd.github+json",
    }));
    if (payload.encoding !== "base64" || !payload.content) return "";
    return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString("utf8");
  });
  return unique(contents.flatMap((value) => extractBoostySlugs(value)));
}

async function discoverCandidates() {
  const discovered = new Map();
  const results = await mapWithConcurrency(DISCOVERY_QUERIES, 3, async (query) => {
    try {
      return { query, slugs: await discoverFromBing(query) };
    } catch (error) {
      console.warn(`Search discovery skipped for "${query}": ${error.message}`);
      return { query, slugs: [] };
    }
  });
  for (const result of results) {
    for (const slug of result.slugs || []) {
      const queries = discovered.get(slug) || [];
      discovered.set(slug, unique([...queries, result.query]));
    }
  }

  for (const slug of await discoverFromGitHub()) {
    const queries = discovered.get(slug) || [];
    discovered.set(slug, unique([...queries, "GitHub code search: Boosty IT links"]));
  }
  return discovered;
}

const [{ meta: previousMeta, channels: previousChannels }, rawCatalog] = await Promise.all([
  fs.readFile(dataPath, "utf8").then(JSON.parse),
  fs.readFile(rawPath, "utf8").then(JSON.parse),
]);
const previousBySlug = new Map(previousChannels.map((channel) => [channel.slug, channel]));
const rawBySlug = new Map(rawCatalog.candidates.map((candidate) => [candidate.slug, candidate]));
const discovered = await discoverCandidates();
const newlyDiscovered = [...discovered.keys()].filter((slug) => !rawBySlug.has(slug));

console.log(`Refreshing ${previousChannels.length} published channels; ${newlyDiscovered.length} new candidates found.`);

const refreshResults = await mapWithConcurrency(previousChannels, 3, async (channel) => {
  const refreshed = await fetchBoostyChannel({ slug: channel.slug }, channel, checkedAt);
  return { kind: "published", previous: channel, refreshed };
});
const newResults = await mapWithConcurrency(newlyDiscovered.map((slug) => ({ slug })), 3, async ({ slug }) => {
  const refreshed = await fetchBoostyChannel({ slug }, null, checkedAt);
  return { kind: "new", slug, refreshed };
});

const published = [];
const errors = [];
const removed = [];
for (const result of refreshResults) {
  if (result.fetchError) {
    errors.push({ slug: result.slug, error: result.fetchError });
    published.push(toPublicChannel(result));
    continue;
  }
  const { refreshed, previous } = result;
  if (refreshed.isRussian && refreshed.hasPosts && refreshed.hasPaidLevels && refreshed.notBanned) {
    published.push(toPublicChannel(refreshed));
  } else {
    removed.push(previous.slug);
  }
}

const added = [];
for (const result of newResults) {
  const slug = result.slug;
  const queries = discovered.get(slug) || [];
  if (result.fetchError) {
    errors.push({ slug, error: result.fetchError });
    rawBySlug.set(slug, {
      slug,
      name: slug,
      boostyUrl: `https://boosty.to/${slug}`,
      discoverySource: "Еженедельный веб-поиск",
      discoveryQueries: queries,
      reviewStatus: "fetch-error",
      fetchError: result.fetchError,
      firstSeenAt: checkedAt,
      lastCheckedAt: checkedAt,
    });
    continue;
  }

  const channel = result.refreshed;
  const qualifiesForAutomaticPublication = channel.qualifies && channel.relevanceScore >= 3;
  rawBySlug.set(slug, {
    slug,
    name: channel.name,
    boostyUrl: channel.boostyUrl,
    discoverySource: "Еженедельный веб-поиск",
    discoveryQueries: queries,
    reviewStatus: qualifiesForAutomaticPublication ? "published" : "unqualified",
    fetchError: null,
    firstSeenAt: checkedAt,
    lastCheckedAt: checkedAt,
  });
  if (qualifiesForAutomaticPublication) {
    published.push(toPublicChannel(channel));
    added.push(slug);
  }
}

const uniquePublished = [...new Map(published.map((channel) => [channel.slug, channel])).values()]
  .sort((a, b) => a.name.localeCompare(b.name, "ru") || a.slug.localeCompare(b.slug));
for (const channel of uniquePublished) {
  const existing = rawBySlug.get(channel.slug);
  rawBySlug.set(channel.slug, {
    slug: channel.slug,
    name: channel.name,
    boostyUrl: channel.boostyUrl,
    discoverySource: existing?.discoverySource || "Текущий каталог",
    discoveryQueries: unique([
      ...(existing?.discoveryQueries || []),
      ...(discovered.get(channel.slug) || []),
    ]).sort((a, b) => a.localeCompare(b, "ru")),
    reviewStatus: "published",
    fetchError: null,
    firstSeenAt: existing?.firstSeenAt || checkedAt,
    lastCheckedAt: checkedAt,
  });
}
for (const slug of removed) {
  const existing = rawBySlug.get(slug);
  if (existing) {
    rawBySlug.set(slug, {
      ...existing,
      reviewStatus: "removed",
      lastCheckedAt: checkedAt,
    });
  }
}

const candidates = [...rawBySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
const nextCatalog = {
  meta: {
    ...previousMeta,
    checkedAt,
    channelCount: uniquePublished.length,
    generatedBy: "Еженедельное автоматическое обновление",
  },
  channels: uniquePublished,
};
const snapshot = {
  schemaVersion: 1,
  checkedAt,
  channels: uniquePublished.map((channel) => ({
    slug: channel.slug,
    subscribers: channel.subscribers,
    minPriceRub: channel.minPriceRub,
    minPromoPriceRub: channel.minPromoPriceRub,
    lastPostAt: channel.lastPostAt,
  })),
};
const report = {
  schemaVersion: 1,
  checkedAt,
  previousChannelCount: previousChannels.length,
  channelCount: uniquePublished.length,
  candidateCount: candidates.length,
  discoveredCount: newlyDiscovered.length,
  added,
  removed,
  errors,
};

await fs.mkdir(historyDir, { recursive: true });
await Promise.all([
  fs.writeFile(dataPath, `${JSON.stringify(nextCatalog, null, 2)}\n`),
  fs.writeFile(rawPath, `${JSON.stringify({
    meta: {
      ...rawCatalog.meta,
      checkedAt,
      candidateCount: candidates.length,
    },
    candidates,
  }, null, 2)}\n`),
  fs.writeFile(path.join(historyDir, `${checkedAt}.json`), `${JSON.stringify(snapshot, null, 2)}\n`),
  fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
]);

console.log(JSON.stringify(report, null, 2));
