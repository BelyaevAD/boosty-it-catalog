import fs from "node:fs/promises";
import path from "node:path";
import {
  assessBoostyBlog,
  BOOSTY_POST_SEARCH_QUERIES,
  DISCOVERY_QUERIES,
  extractBoostySlugs,
  fetchBoostyBlog,
  fetchBoostyChannel,
  fetchBoostyJson,
  localIsoDate,
  mapWithConcurrency,
  toPublicChannel,
  unique,
} from "./lib/catalog.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "data", "channels.json");
const rawPath = path.join(root, "data", "raw", "boosty-candidates.json");
const exclusionsPath = path.join(root, "data", "manual-exclusions.json");
const historyDir = path.join(root, "data", "history");
const reportPath = path.join(root, "data", "latest-update.json");
const checkedAt = process.env.CATALOG_DATE || localIsoDate();
const githubToken = process.env.GITHUB_TOKEN || "";
const repositoryUrl = "https://github.com/BelyaevAD/boosty-it-catalog";

function integerEnvironment(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer.`);
  return Math.min(max, Math.max(min, parsed));
}

const maxCandidateChecks = String(process.env.DISCOVERY_MAX_CHECKS || "").toLowerCase() === "all"
  ? Number.POSITIVE_INFINITY
  : integerEnvironment("DISCOVERY_MAX_CHECKS", 250, { min: 1 });
const commonCrawlMaxPages = integerEnvironment("COMMON_CRAWL_MAX_PAGES", 5, { min: 0 });
const boostySearchMaxPages = integerEnvironment("BOOSTY_SEARCH_MAX_PAGES", 2, { min: 1 });
const boostySearchMaxQueries = integerEnvironment("BOOSTY_SEARCH_MAX_QUERIES", 36, { min: 1 });
const boostySearchPageSize = integerEnvironment("BOOSTY_SEARCH_PAGE_SIZE", 20, { min: 1, max: 40 });
const recheckAll = process.env.RECHECK_ALL === "1";
const discoverySeedsOnly = process.env.DISCOVERY_SEEDS_ONLY === "1";
const skipPublishedRefresh = process.env.SKIP_PUBLISHED_REFRESH === "1";
const preserveLatestReport = process.env.PRESERVE_LATEST_REPORT === "1";
const explicitSeedSlugs = unique(
  String(process.env.DISCOVERY_SEED_SLUGS || "")
    .split(/[\s,;]+/u)
    .map((value) => value.toLowerCase())
    .filter((value) => /^[a-z0-9_.-]{1,120}$/.test(value)),
);
const explicitSeedSet = new Set(explicitSeedSlugs);

async function fetchText(url, options = {}) {
  const parsedUrl = new URL(url);
  if (options.token && parsedUrl.origin !== "https://api.github.com") {
    throw new Error(`Refusing to send a GitHub token to ${parsedUrl.origin}.`);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(parsedUrl, {
        redirect: options.token ? "error" : "follow",
        signal: AbortSignal.timeout(options.timeoutMs || 20_000),
        headers: {
          accept: options.accept || "text/plain, application/xml;q=0.9, */*;q=0.5",
          "accept-language": "ru-RU,ru;q=0.9,en;q=0.6",
          "user-agent": `BoostyITCatalog/1.0 (+${repositoryUrl})`,
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
    const parsedUrl = new URL(url);
    if (
      parsedUrl.origin !== "https://api.github.com" ||
      !/^\/repositories\/\d+\/contents\//u.test(parsedUrl.pathname)
    ) {
      throw new Error(`Unexpected GitHub content URL: ${parsedUrl}`);
    }
    const payload = JSON.parse(await fetchText(url, {
      token: githubToken,
      accept: "application/vnd.github+json",
    }));
    if (payload.encoding !== "base64" || !payload.content) return "";
    return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString("utf8");
  });
  const failedContentReads = contents.filter((value) => typeof value !== "string");
  if (failedContentReads.length) {
    console.warn(`GitHub discovery could not read ${failedContentReads.length} search result files.`);
  }
  return unique(
    contents
      .filter((value) => typeof value === "string")
      .flatMap((value) => extractBoostySlugs(value)),
  );
}

async function discoverFromBoostyCatalog() {
  const rootResponse = await fetchBoostyJson("https://api.boosty.to/v1/catalog/");
  const categories = (rootResponse.data?.categories || [])
    .map((category) => category.mnemonic)
    .filter((value) => /^[a-z_]{1,80}$/.test(value));
  const authors = [];

  for (const mnemonic of categories) {
    let offset = 0;
    for (let page = 0; page < 10; page += 1) {
      const url = new URL(`https://api.boosty.to/v1/catalog/category/${mnemonic}/`);
      url.searchParams.set("limit", "100");
      url.searchParams.set("offset", String(offset));
      const response = await fetchBoostyJson(url);
      for (const author of response.data?.authors || []) {
        if (
          !author.hasAdultContent &&
          !author.flags?.hasAdultContent &&
          /^[a-z0-9_.-]{1,120}$/i.test(author.blogUrl || "")
        ) {
          authors.push({ ...author, catalogCategory: mnemonic });
        }
      }
      if (response.data?.isLast || response.data?.offset === null || response.data?.offset === undefined) break;
      offset = response.data.offset;
    }
  }
  return [...new Map(authors.map((author) => [author.blogUrl.toLowerCase(), author])).values()];
}

async function discoverFromBoostyPostSearch() {
  const requestedCount = Math.min(boostySearchMaxQueries, BOOSTY_POST_SEARCH_QUERIES.length);
  const weekNumber = Math.floor(Date.parse(`${checkedAt}T00:00:00Z`) / (7 * 86_400_000));
  const start = boostySearchMaxQueries >= BOOSTY_POST_SEARCH_QUERIES.length
    ? 0
    : (weekNumber * requestedCount) % BOOSTY_POST_SEARCH_QUERIES.length;
  const selectedQueries = Array.from({ length: requestedCount }, (_, index) =>
    BOOSTY_POST_SEARCH_QUERIES[(start + index) % BOOSTY_POST_SEARCH_QUERIES.length]
  );
  const results = await mapWithConcurrency(selectedQueries, 3, async (query) => {
    const matches = [];
    let offset = "";
    for (let page = 0; page < boostySearchMaxPages; page += 1) {
      const url = new URL("https://api.boosty.to/v1/search/blog/post/");
      url.searchParams.set("search_query", query);
      url.searchParams.set("limit", String(boostySearchPageSize));
      if (offset) url.searchParams.set("offset", offset);
      const response = await fetchBoostyJson(url);
      for (const item of response.data?.searchPosts || []) {
        const blog = item.blog;
        if (
          !blog?.hasAdultContent &&
          !blog?.flags?.hasAdultContent &&
          /^[a-z0-9_.-]{1,120}$/i.test(blog?.blogUrl || "")
        ) {
          const evidenceText = [
            blog.owner?.name,
            blog.title,
            item.post?.title,
            item.headline?.title,
            item.headline?.teaser,
            item.headline?.data,
          ].filter(Boolean).map((value) =>
            typeof value === "string" ? value : JSON.stringify(value)
          ).join(" ");
          matches.push({
            slug: blog.blogUrl.toLowerCase(),
            name: blog.owner?.name || blog.blogUrl,
            title: blog.title || item.post?.title || "",
            query,
            russian: /[А-Яа-яЁё]{6,}/u.test(evidenceText),
            hasPaidLevels: blog.flags?.hasSubscriptionLevels === true,
          });
        }
      }
      if (response.extra?.isLast || !response.extra?.offset) break;
      offset = response.extra.offset;
    }
    return matches;
  });
  const failedQueries = results.filter((result) => !Array.isArray(result));
  if (failedQueries.length) {
    console.warn(`Boosty post discovery failed for ${failedQueries.length}/${selectedQueries.length} queries.`);
  }
  return results.filter(Array.isArray).flat();
}

async function discoverFromCommonCrawl(previousCollectionId = null, previousProgress = null) {
  if (commonCrawlMaxPages === 0) {
    return {
      completedCollectionId: previousCollectionId,
      progress: previousProgress,
      sourceCollectionId: previousProgress?.collectionId || null,
      slugs: [],
      skipped: true,
    };
  }
  const collections = JSON.parse(await fetchText("https://index.commoncrawl.org/collinfo.json", {
    accept: "application/json",
  }));
  const latestCollection = collections.find((item) =>
    /^CC-MAIN-\d{4}-\d+$/u.test(item.id || "") &&
    /^https:\/\/index\.commoncrawl\.org\/CC-MAIN-\d{4}-\d+-index$/u.test(item["cdx-api"] || "")
  );
  const resumableCollection = previousProgress?.collectionId
    ? collections.find((item) =>
      item.id === previousProgress.collectionId &&
      /^CC-MAIN-\d{4}-\d+$/u.test(item.id || "") &&
      /^https:\/\/index\.commoncrawl\.org\/CC-MAIN-\d{4}-\d+-index$/u.test(item["cdx-api"] || "")
    )
    : null;
  const collection = resumableCollection || latestCollection;
  if (!collection) throw new Error("A current Common Crawl index was not found.");
  if (collection.id === previousCollectionId) {
    return {
      completedCollectionId: collection.id,
      progress: null,
      sourceCollectionId: collection.id,
      slugs: [],
      skipped: true,
    };
  }

  const createUrl = (extra = {}) => {
    const url = new URL(collection["cdx-api"]);
    url.searchParams.set("url", "boosty.to/*");
    url.searchParams.set("output", "json");
    url.searchParams.append("filter", "status:200");
    url.searchParams.append("filter", "mime:text/html");
    url.searchParams.append("filter", "languages:rus");
    url.searchParams.set("collapse", "urlkey");
    url.searchParams.set("pageSize", "1");
    for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, String(value));
    return url;
  };

  const pageInfo = JSON.parse(await fetchText(createUrl({ showNumPages: "true" }), {
    accept: "application/json",
    timeoutMs: 60_000,
  }));
  const totalPages = Math.max(0, Number(pageInfo.pages) || 0);
  let nextPage = previousProgress?.collectionId === collection.id
    ? Math.min(totalPages, Math.max(0, Number(previousProgress.nextPage) || 0))
    : 0;
  const stopPage = Math.min(totalPages, nextPage + commonCrawlMaxPages);
  const slugs = [];
  let fetchError = null;
  while (nextPage < stopPage) {
    let content;
    try {
      content = await fetchText(createUrl({ page: nextPage }), {
        accept: "application/x-ndjson, application/json",
        timeoutMs: 60_000,
      });
    } catch (error) {
      fetchError = String(error?.message || error);
      break;
    }
    for (const line of content.split(/\r?\n/u)) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        slugs.push(...extractBoostySlugs(record.url || ""));
      } catch {
        // Ignore a malformed index record; other records remain useful.
      }
    }
    nextPage += 1;
  }
  const completed = nextPage >= totalPages;
  return {
    completedCollectionId: completed ? collection.id : previousCollectionId,
    progress: completed ? null : {
      collectionId: collection.id,
      nextPage,
      totalPages,
    },
    sourceCollectionId: collection.id,
    slugs: unique(slugs),
    skipped: false,
    fetchError,
  };
}

function addDiscovery(discovered, slug, evidence, preview = {}) {
  const safeSlug = String(slug || "").toLowerCase();
  if (!/^[a-z0-9_.-]{1,120}$/.test(safeSlug)) return;
  const existing = discovered.get(safeSlug) || { evidence: [], preview: {}, hints: {} };
  discovered.set(safeSlug, {
    evidence: unique([...existing.evidence, evidence]),
    preview: {
      name: existing.preview.name || preview.name || "",
      title: existing.preview.title || preview.title || "",
    },
    hints: {
      russian: existing.hints.russian || preview.russian === true,
      officialTech: existing.hints.officialTech || preview.officialTech === true,
      targetedPost: existing.hints.targetedPost || preview.targetedPost === true,
      hasPaidLevels: existing.hints.hasPaidLevels || preview.hasPaidLevels === true,
    },
  });
}

async function discoverCandidates(rawMeta = {}) {
  const discovered = new Map();
  let commonCrawlCollectionId = rawMeta.lastCommonCrawlCollectionId || null;
  let commonCrawlProgress = rawMeta.commonCrawlProgress || null;
  for (const slug of explicitSeedSlugs) {
    addDiscovery(discovered, slug, "Явная очередь проверки", {
      targetedPost: true,
    });
  }
  if (discoverySeedsOnly) return { discovered, commonCrawlCollectionId, commonCrawlProgress };
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
      addDiscovery(discovered, slug, result.query, { russian: true });
    }
  }

  for (const slug of await discoverFromGitHub()) {
    addDiscovery(discovered, slug, "GitHub code search: Boosty IT links");
  }

  try {
    for (const author of await discoverFromBoostyCatalog()) {
      addDiscovery(discovered, author.blogUrl, `Официальный каталог Boosty: ${author.catalogCategory}`, {
        name: author.name,
        title: author.title,
        officialTech: author.catalogCategory === "tech",
      });
    }
  } catch (error) {
    console.warn(`Boosty catalog discovery skipped: ${error.message}`);
  }

  try {
    for (const match of await discoverFromBoostyPostSearch()) {
      addDiscovery(discovered, match.slug, `Поиск по постам Boosty: ${match.query}`, {
        name: match.name,
        title: match.title,
        russian: match.russian,
        targetedPost: true,
        hasPaidLevels: match.hasPaidLevels,
      });
    }
  } catch (error) {
    console.warn(`Boosty post discovery skipped: ${error.message}`);
  }

  try {
    const commonCrawl = await discoverFromCommonCrawl(commonCrawlCollectionId, commonCrawlProgress);
    commonCrawlCollectionId = commonCrawl.completedCollectionId || commonCrawlCollectionId;
    commonCrawlProgress = commonCrawl.progress;
    if (commonCrawl.fetchError) {
      console.warn(`Common Crawl page ${commonCrawl.progress?.nextPage ?? "unknown"} will be retried: ${commonCrawl.fetchError}`);
    }
    for (const slug of commonCrawl.slugs) {
      addDiscovery(discovered, slug, `Common Crawl: ${commonCrawl.sourceCollectionId}`, { russian: true });
    }
  } catch (error) {
    console.warn(`Common Crawl discovery skipped: ${error.message}`);
  }
  return { discovered, commonCrawlCollectionId, commonCrawlProgress };
}

const [{ meta: previousMeta, channels: previousChannels }, rawCatalog, manualExclusions] = await Promise.all([
  fs.readFile(dataPath, "utf8").then(JSON.parse),
  fs.readFile(rawPath, "utf8").then(JSON.parse),
  fs.readFile(exclusionsPath, "utf8").then(JSON.parse),
]);
const exclusionBySlug = new Map((manualExclusions.exclusions || []).map((entry) => [entry.slug, entry]));
const previousPublishedSlugSet = new Set(previousChannels.map((channel) => channel.slug));
const rawBySlug = new Map(rawCatalog.candidates.map((candidate) => [candidate.slug, candidate]));
const rawSlugsBeforeDiscovery = new Set(rawBySlug.keys());
const {
  discovered,
  commonCrawlCollectionId,
  commonCrawlProgress,
} = await discoverCandidates(rawCatalog.meta);
const newlyDiscovered = [...discovered.keys()].filter((slug) => !rawBySlug.has(slug));

function discoverySource(evidence = []) {
  if (evidence.some((item) => item.startsWith("Официальный каталог Boosty"))) return "Официальный каталог Boosty";
  if (evidence.some((item) => item.startsWith("Common Crawl"))) return "Common Crawl";
  if (evidence.some((item) => item.startsWith("GitHub"))) return "GitHub";
  return "Еженедельный веб-поиск";
}

function daysSince(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.parse(`${checkedAt}T23:59:59+03:00`) - Date.parse(value)) / 86_400_000));
}

function candidateIsDue(candidate) {
  if (candidate.reviewStatus === "pending") return true;
  if (recheckAll && ["fetch-error", "unqualified", "removed"].includes(candidate.reviewStatus)) return true;
  if (candidate.reviewStatus === "fetch-error") return daysSince(candidate.lastCheckedAt) >= 7;
  if (candidate.reviewStatus === "removed") return daysSince(candidate.lastCheckedAt) >= 28;
  if (candidate.reviewStatus === "unqualified") return daysSince(candidate.lastCheckedAt) >= 90;
  return false;
}

function isTerminalNotFound(error) {
  return /^HTTP (?:404|410)\b/u.test(String(error || ""));
}

for (const [slug, info] of discovered) {
  const existing = rawBySlug.get(slug);
  const existingEvidence = existing?.discoveryQueries || [];
  const newEvidence = info.evidence.filter((item) => !existingEvidence.includes(item));
  const shouldReopen = existing &&
    !exclusionBySlug.has(slug) &&
    existing.reviewStatus !== "published" &&
    newEvidence.some((item) =>
      item.startsWith("Поиск по постам Boosty:") ||
      item === "Официальный каталог Boosty: tech" ||
      item === "Явная очередь проверки"
    );
  const evidence = unique([
    ...existingEvidence,
    ...info.evidence,
  ]).sort((a, b) => a.localeCompare(b, "ru"));
  rawBySlug.set(slug, {
    ...existing,
    slug,
    name: existing?.name || info.preview.name || slug,
    boostyUrl: `https://boosty.to/${slug}`,
    discoverySource: existing?.discoverySource || discoverySource(evidence),
    discoveryQueries: evidence,
    reviewStatus: shouldReopen ? "pending" : existing?.reviewStatus || "pending",
    reviewReason: shouldReopen ? null : existing?.reviewReason,
    fetchError: shouldReopen ? null : existing?.fetchError || null,
    firstSeenAt: existing?.firstSeenAt || checkedAt,
    lastSeenAt: checkedAt,
  });
}

for (const [slug, exclusion] of exclusionBySlug) {
  const existing = rawBySlug.get(slug) || {
    slug,
    name: slug,
    boostyUrl: `https://boosty.to/${slug}`,
    discoverySource: "Кураторская проверка",
    discoveryQueries: [],
    firstSeenAt: exclusion.reviewedAt || checkedAt,
    lastSeenAt: exclusion.reviewedAt || checkedAt,
  };
  rawBySlug.set(slug, {
    ...existing,
    reviewStatus: "excluded",
    reviewReason: exclusion.reason,
    fetchError: null,
    lastCheckedAt: exclusion.reviewedAt || existing.lastCheckedAt || checkedAt,
  });
}

const candidateQueue = [...rawBySlug.values()]
  .filter((candidate) =>
    !exclusionBySlug.has(candidate.slug) &&
    !previousPublishedSlugSet.has(candidate.slug) &&
    (discoverySeedsOnly
      ? explicitSeedSet.has(candidate.slug) && candidate.reviewStatus !== "published"
      : candidateIsDue(candidate))
  )
  .sort((a, b) => {
    const aInfo = discovered.get(a.slug);
    const bInfo = discovered.get(b.slug);
    const priority = (candidate, info) =>
      (candidate.reviewStatus === "fetch-error" ? 30 : 0) +
      (info?.hints?.officialTech ? 20 : 0) +
      (info?.hints?.hasPaidLevels ? 15 : 0) +
      (rawSlugsBeforeDiscovery.has(candidate.slug) ? 10 : 0) +
      (info?.hints?.russian ? 5 : 0);
    return priority(b, bInfo) - priority(a, aInfo) || a.slug.localeCompare(b.slug);
  })
  .slice(0, maxCandidateChecks);

console.log(
  `Refreshing ${previousChannels.length} published channels; ` +
  `${newlyDiscovered.length} new candidates found; ${candidateQueue.length} candidates selected.`,
);

let preflightCompleted = 0;
const preflightResults = await mapWithConcurrency(candidateQueue.map((candidate) => ({
  slug: candidate.slug,
  existing: candidate,
  info: discovered.get(candidate.slug) || { evidence: candidate.discoveryQueries || [], hints: {} },
})), 8, async (seed) => {
  try {
    const blog = await fetchBoostyBlog(seed.slug);
    return { ...seed, blog, assessment: assessBoostyBlog(blog) };
  } finally {
    preflightCompleted += 1;
    if (preflightCompleted % 250 === 0 || preflightCompleted === candidateQueue.length) {
      console.log(`Preflighted ${preflightCompleted}/${candidateQueue.length} candidates.`);
    }
  }
});

const errors = [];
let terminalNotFoundCount = 0;
const eligibleForFullCheck = [];
let prefilteredCount = 0;
for (const result of preflightResults) {
  const existing = rawBySlug.get(result.slug) || result.existing;
  if (result.fetchError) {
    const terminal = isTerminalNotFound(result.fetchError);
    if (terminal) terminalNotFoundCount += 1;
    else errors.push({ slug: result.slug, error: result.fetchError });
    rawBySlug.set(result.slug, {
      ...existing,
      reviewStatus: terminal ? "unqualified" : "fetch-error",
      reviewReason: terminal ? "not-found" : existing?.reviewReason,
      fetchError: terminal ? null : result.fetchError,
      lastCheckedAt: checkedAt,
    });
    continue;
  }

  const { assessment } = result;
  const trustedDiscovery = result.info?.hints?.officialTech ||
    result.info?.hints?.targetedPost ||
    (rawSlugsBeforeDiscovery.has(result.slug) && existing.reviewStatus !== "pending");
  const hasLanguageEvidence = assessment.isRussian || result.info?.hints?.russian;
  const hasTopicEvidence = assessment.relevanceScore >= 1 || trustedDiscovery;
  if (
    assessment.hasPosts &&
    assessment.notBanned &&
    !assessment.hasAdultContent &&
    hasLanguageEvidence &&
    hasTopicEvidence
  ) {
    eligibleForFullCheck.push(result);
    continue;
  }

  prefilteredCount += 1;
  const reason = !assessment.hasPosts
    ? "no-posts"
    : assessment.hasAdultContent
      ? "adult-content"
      : !assessment.notBanned
        ? "blocked"
        : !hasLanguageEvidence
          ? "language"
          : "topic";
  rawBySlug.set(result.slug, {
    ...existing,
    name: result.blog.owner?.name || existing.name || result.slug,
    reviewStatus: "unqualified",
    reviewReason: reason,
    profileRelevanceScore: assessment.relevanceScore,
    fetchError: null,
    lastCheckedAt: checkedAt,
  });
}

let fullCheckCompleted = 0;
const candidateResults = await mapWithConcurrency(eligibleForFullCheck, 3, async (result) => {
  try {
    const refreshed = await fetchBoostyChannel({ slug: result.slug, blog: result.blog }, null, checkedAt);
    return {
      kind: "candidate",
      slug: result.slug,
      profileRelevanceScore: result.assessment.relevanceScore,
      refreshed,
    };
  } finally {
    fullCheckCompleted += 1;
    if (fullCheckCompleted % 100 === 0 || fullCheckCompleted === eligibleForFullCheck.length) {
      console.log(`Fully checked ${fullCheckCompleted}/${eligibleForFullCheck.length} candidates.`);
    }
  }
});

const refreshablePublishedChannels = previousChannels
  .filter((channel) => !exclusionBySlug.has(channel.slug));
let publishedRefreshCompleted = 0;
const refreshResults = skipPublishedRefresh
  ? []
  : await mapWithConcurrency(
    refreshablePublishedChannels,
    3,
    async (channel) => {
      try {
        const refreshed = await fetchBoostyChannel({ slug: channel.slug }, channel, checkedAt);
        return { kind: "published", previous: channel, refreshed };
      } finally {
        publishedRefreshCompleted += 1;
        if (
          publishedRefreshCompleted % 100 === 0 ||
          publishedRefreshCompleted === refreshablePublishedChannels.length
        ) {
          console.log(
            `Refreshed ${publishedRefreshCompleted}/${refreshablePublishedChannels.length} published channels.`,
          );
        }
      }
    },
  );

const published = skipPublishedRefresh
  ? previousChannels
    .filter((channel) => !exclusionBySlug.has(channel.slug))
    .map((channel) => toPublicChannel(channel))
  : [];
const removed = previousChannels
  .filter((channel) => exclusionBySlug.has(channel.slug))
  .map((channel) => channel.slug);
const terminalRemovedSlugs = new Set();
const publishedRefreshErrors = new Map();
for (const result of refreshResults) {
  if (result.fetchError) {
    if (isTerminalNotFound(result.fetchError)) {
      terminalNotFoundCount += 1;
      terminalRemovedSlugs.add(result.slug);
      removed.push(result.slug);
    } else {
      errors.push({ slug: result.slug, error: result.fetchError });
      publishedRefreshErrors.set(result.slug, result.fetchError);
      published.push(toPublicChannel(result));
    }
    continue;
  }
  const { refreshed, previous } = result;
  if (
    refreshed.isRussian &&
    refreshed.hasPosts &&
    refreshed.hasPaidLevels &&
    !refreshed.hasAdultContent &&
    refreshed.notBanned
  ) {
    published.push(toPublicChannel(refreshed));
  } else {
    removed.push(previous.slug);
  }
}

const added = [];
for (const result of candidateResults) {
  const slug = result.slug;
  const existing = rawBySlug.get(slug);
  const queries = unique([
    ...(existing?.discoveryQueries || []),
    ...(discovered.get(slug)?.evidence || []),
  ]).sort((a, b) => a.localeCompare(b, "ru"));
  if (result.fetchError) {
    const terminal = isTerminalNotFound(result.fetchError);
    if (terminal) terminalNotFoundCount += 1;
    else errors.push({ slug, error: result.fetchError });
    rawBySlug.set(slug, {
      ...existing,
      slug,
      name: existing?.name || slug,
      boostyUrl: `https://boosty.to/${slug}`,
      discoverySource: existing?.discoverySource || discoverySource(queries),
      discoveryQueries: queries,
      reviewStatus: terminal ? "unqualified" : "fetch-error",
      reviewReason: terminal ? "not-found" : existing?.reviewReason,
      fetchError: terminal ? null : result.fetchError,
      firstSeenAt: existing?.firstSeenAt || checkedAt,
      lastCheckedAt: checkedAt,
    });
    continue;
  }

  const channel = result.refreshed;
  const qualifiesForAutomaticPublication = channel.qualifies && channel.relevanceScore >= 3;
  rawBySlug.set(slug, {
    ...existing,
    slug,
    name: channel.name,
    boostyUrl: channel.boostyUrl,
    discoverySource: existing?.discoverySource || discoverySource(queries),
    discoveryQueries: queries,
    reviewStatus: qualifiesForAutomaticPublication ? "published" : "unqualified",
    reviewReason: qualifiesForAutomaticPublication ? null : "full-check",
    profileRelevanceScore: result.profileRelevanceScore,
    relevanceScore: channel.relevanceScore,
    fetchError: null,
    firstSeenAt: existing?.firstSeenAt || checkedAt,
    lastCheckedAt: checkedAt,
  });
  if (qualifiesForAutomaticPublication) {
    published.push(toPublicChannel(channel));
    added.push(slug);
  }
}

const uniquePublished = [...new Map(published.map((channel) => [channel.slug, channel])).values()]
  .filter((channel) => !exclusionBySlug.has(channel.slug))
  .sort((a, b) => a.name.localeCompare(b.name, "ru") || a.slug.localeCompare(b.slug));
for (const channel of uniquePublished) {
  const existing = rawBySlug.get(channel.slug);
  const refreshError = publishedRefreshErrors.get(channel.slug);
  rawBySlug.set(channel.slug, {
    ...existing,
    slug: channel.slug,
    name: channel.name,
    boostyUrl: channel.boostyUrl,
    discoverySource: existing?.discoverySource || "Текущий каталог",
    discoveryQueries: unique([
      ...(existing?.discoveryQueries || []),
      ...(discovered.get(channel.slug)?.evidence || []),
    ]).sort((a, b) => a.localeCompare(b, "ru")),
    reviewStatus: refreshError ? "fetch-error" : "published",
    reviewReason: refreshError ? existing?.reviewReason : null,
    fetchError: refreshError || null,
    firstSeenAt: existing?.firstSeenAt || checkedAt,
    lastCheckedAt: checkedAt,
  });
}
for (const slug of removed) {
  const existing = rawBySlug.get(slug);
  if (existing) {
    const exclusion = exclusionBySlug.get(slug);
    rawBySlug.set(slug, {
      ...existing,
      reviewStatus: exclusion ? "excluded" : "removed",
      reviewReason: exclusion?.reason || (terminalRemovedSlugs.has(slug) ? "not-found" : existing.reviewReason),
      fetchError: null,
      lastCheckedAt: exclusion?.reviewedAt || checkedAt,
    });
  }
}

const candidates = [...rawBySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
const publishedRefreshErrorCount = publishedRefreshErrors.size;
const refreshablePublishedCount = refreshablePublishedChannels.length;
if (
  !skipPublishedRefresh &&
  refreshablePublishedCount > 0 &&
  publishedRefreshErrorCount / refreshablePublishedCount > 0.1
) {
  throw new Error(
    `Published refresh error gate: ${publishedRefreshErrorCount}/${refreshablePublishedCount} channels failed. ` +
    "No catalog files were written.",
  );
}
const metricsCheckedAt = skipPublishedRefresh ? previousMeta.checkedAt : checkedAt;
const nextCatalog = {
  meta: {
    ...previousMeta,
    checkedAt: metricsCheckedAt,
    generatedAt: checkedAt,
    channelCount: uniquePublished.length,
    generatedBy: "Еженедельное автоматическое обновление",
  },
  channels: uniquePublished,
};
const snapshot = {
  schemaVersion: 1,
  checkedAt: metricsCheckedAt,
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
  metricsCheckedAt,
  previousChannelCount: previousChannels.length,
  channelCount: uniquePublished.length,
  candidateCount: candidates.length,
  discoveredCount: newlyDiscovered.length,
  checkedCandidateCount: candidateQueue.length,
  prefilteredCount,
  pendingCount: candidates.filter((candidate) => candidate.reviewStatus === "pending").length,
  totalOutstandingFetchErrors: candidates.filter((candidate) => candidate.reviewStatus === "fetch-error").length,
  manualExclusionCount: exclusionBySlug.size,
  terminalNotFoundCount,
  added,
  removed,
  errors,
};

await fs.mkdir(historyDir, { recursive: true });
const writes = [
  fs.writeFile(dataPath, `${JSON.stringify(nextCatalog, null, 2)}\n`),
  fs.writeFile(rawPath, `${JSON.stringify({
    meta: {
      ...rawCatalog.meta,
      checkedAt,
      candidateCount: candidates.length,
      lastCommonCrawlCollectionId: commonCrawlCollectionId || rawCatalog.meta.lastCommonCrawlCollectionId || null,
      commonCrawlProgress,
    },
    candidates,
  }, null, 2)}\n`),
  fs.writeFile(path.join(historyDir, `${checkedAt}.json`), `${JSON.stringify(snapshot, null, 2)}\n`),
];
if (!preserveLatestReport) {
  writes.push(fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`));
}
await Promise.all(writes);

console.log(JSON.stringify(report, null, 2));
