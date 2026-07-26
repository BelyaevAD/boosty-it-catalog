const API_BASE = "https://api.boosty.to";

export const CATEGORY_RULES = [
  {
    category: "Кибербезопасность",
    terms: ["кибербезопас", "информационн безопас", "cybersecurity", "pentest", "пентест", "ctf", "osint", "devsecops", "уязвим", "mitre", "hackthebox", "защита данных", "privacy", "grc", "isms"],
  },
  {
    category: "Администрирование / DevOps / сети",
    terms: ["devops", "sre", "sysadmin", "сисадмин", "системн админист", "kubernetes", "k8s", "docker", "linux", "proxmox", "truenas", "unraid", "ansible", "terraform", "zabbix", "prometheus", "grafana", "cisco", "mikrotik", "сетев", "network", "vpn", "nginx", "облак", "cloud", "ci/cd", "инфраструктур"],
  },
  {
    category: "Self-hosting / IoT / embedded",
    terms: ["self-host", "selfhost", "homelab", "домашн сервер", "home assistant", "умный дом", "smarthome", "zigbee", "mqtt", "arduino", "esp32", "esp8266", "embedded", "iot", "robot", "робототех", "stm32", "raspberry", "nas"],
  },
  {
    category: "ИИ / ML / Data Science",
    terms: ["искусственн интеллект", "нейросет", "machine learning", "машинн обуч", "deep learning", "data science", "stable diffusion", "comfyui", "midjourney", "llm", "chatgpt", "claude", "gpt", "flux", "rag", "ai-агент", "ai агент", "mcp", "генеративн", "computer vision", "nlp"],
  },
  {
    category: "Data / BI / базы данных",
    terms: ["data engineer", "data engineering", "airflow", "spark", "kafka", "etl", "clickhouse", "postgres", "sql", "баз данных", "database", "dba", "power bi", "dax", "аналитик данных", "data governance", "dama", "хранилищ данных", "big data"],
  },
  {
    category: "Архитектура / системный анализ",
    terms: ["system design", "системн дизайн", "архитектур", "системн аналит", "solution architect", "микросервис", "highload", "распределенн систем", "api", "rest", "uml", "bpmn", "интеграц"],
  },
  {
    category: "QA / тестирование",
    terms: ["тестиров", "qa engineer", "qa ", "sdet", "автотест", "selenium", "playwright", "postman", "testing", "quality assurance"],
  },
  {
    category: "Mobile",
    terms: ["android", "kotlin", "ios", "swift", "swiftui", "flutter", "dart", "react native", "мобильн разработ"],
  },
  {
    category: "Gamedev",
    terms: ["gamedev", "геймдев", "разработк игр", "unity", "unreal engine", "godot", "гейм-дизайн", "геймдизайн", "game development", "game developer", "blueprint"],
  },
  {
    category: "Frontend / Web / UI·UX",
    terms: ["frontend", "фронтенд", "react", "vue", "angular", "javascript", "typescript", "html", "css", "web-разработ", "веб-разработ", "product design", "ux/ui", "ui/ux", "дизайн интерфейс", "figma"],
  },
  {
    category: "1С / ERP / автоматизация",
    terms: ["программист 1с", "разработчик 1с", "аналитик 1с", "1с:", "1c ", "erp", "sap", "no-code", "nocode", "low-code", "lowcode", "автоматизац процессов"],
  },
  {
    category: "IT-менеджмент / карьера",
    terms: ["team lead", "teamlead", "тимлид", "cto", "техлид", "руководител", "управлени разработ", "it-менедж", "product manager", "продуктов менедж", "карьер в it", "собеседован", "оффер", "войти в it", "вкат в it"],
  },
  {
    category: "Программирование",
    terms: ["программир", "разработчик", "разработка по", "software", "developer", "backend", "бекенд", "бэкенд", "fullstack", "full-stack", "python", "django", "fastapi", "java", "spring", "c#", ".net", "c++", "golang", " go ", "rust", "php", "laravel", "git", "алгоритм", "open source", "открыт код"],
  },
];

export const FOCUS_TERMS = [
  ["ИИ/LLM", ["llm", "chatgpt", "claude", "gpt", "нейросет", "искусственн интеллект", "ai-агент", "mcp", "rag"]],
  ["Stable Diffusion / генеративная графика", ["stable diffusion", "comfyui", "midjourney", "flux", "генеративн"]],
  ["Python", ["python", "django", "fastapi", "pandas"]],
  ["Java / Kotlin / Spring", ["java", "kotlin", "spring"]],
  ["C# / .NET", ["c#", ".net", "asp.net"]],
  ["JavaScript / TypeScript", ["javascript", "typescript", "react", "vue", "angular", "node.js", "nestjs", "next.js"]],
  ["Go / Rust / C++", ["golang", " go ", "rust", "c++"]],
  ["DevOps / Kubernetes / Docker", ["devops", "kubernetes", "k8s", "docker", "sre", "terraform", "ansible"]],
  ["Linux / сети / администрирование", ["linux", "sysadmin", "сисадмин", "сетев", "network", "cisco", "mikrotik"]],
  ["Self-hosting / Home Assistant", ["self-host", "homelab", "домашн сервер", "home assistant", "proxmox", "nas"]],
  ["IoT / Arduino / embedded", ["arduino", "esp32", "zigbee", "mqtt", "iot", "embedded", "робототех"]],
  ["Кибербезопасность / OSINT", ["кибербезопас", "информационн безопас", "cybersecurity", "pentest", "ctf", "osint", "mitre"]],
  ["Data Engineering / BI", ["data engineer", "airflow", "spark", "kafka", "etl", "power bi", "dax", "data governance"]],
  ["SQL / базы данных", ["sql", "postgres", "баз данных", "database", "clickhouse"]],
  ["System Design / архитектура", ["system design", "архитектур", "микросервис", "highload", "распределенн систем"]],
  ["Системный анализ / API", ["системн аналит", "api", "rest", "uml", "bpmn", "интеграц"]],
  ["QA / автоматизация тестирования", ["qa ", "qa engineer", "тестиров", "автотест", "selenium", "playwright", "postman"]],
  ["Mobile", ["android", "ios", "swift", "flutter", "react native", "мобильн разработ"]],
  ["Gamedev", ["gamedev", "геймдев", "unity", "unreal engine", "godot", "геймдизайн"]],
  ["1С / ERP", ["программист 1с", "разработчик 1с", "аналитик 1с", "1с:", "erp", "sap"]],
  ["No-code / автоматизация", ["no-code", "nocode", "low-code", "lowcode", "автоматизац процессов"]],
  ["IT-карьера / собеседования", ["карьер в it", "собеседован", "оффер", "вкат в it", "войти в it"]],
];

export const DISCOVERY_QUERIES = [
  "site:boosty.to программирование разработка",
  "site:boosty.to Python разработчик",
  "site:boosty.to Java Kotlin Spring",
  "site:boosty.to JavaScript TypeScript frontend",
  "site:boosty.to DevOps Kubernetes Linux",
  "site:boosty.to системное администрирование сети",
  "site:boosty.to self-hosting homelab Home Assistant",
  "site:boosty.to кибербезопасность pentest OSINT",
  "site:boosty.to нейросети LLM машинное обучение",
  "site:boosty.to Data Engineering BI SQL",
  "site:boosty.to системный анализ архитектура",
  "site:boosty.to QA тестирование",
  "site:boosty.to Android iOS Flutter",
  "site:boosty.to gamedev Unity Unreal",
  "site:boosty.to 1С ERP автоматизация",
  "site:boosty.to UI UX Figma",
  "site:boosty.to IT менеджмент тимлид карьера",
];

const ALL_RELEVANCE_TERMS = [...new Set(CATEGORY_RULES.flatMap((rule) => rule.terms))];
const RESERVED_SLUGS = new Set(["about", "app", "apply", "help", "privacy", "search", "terms"]);

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function countMatches(text, terms) {
  return terms.filter((term) => text.includes(term)).length;
}

export function languageMetrics(text) {
  const cyrillic = (text.match(/[А-Яа-яЁё]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = cyrillic + latin;
  return {
    cyrillic,
    latin,
    cyrillicShare: total ? cyrillic / total : 0,
  };
}

export function inferClassification(text) {
  const ranked = CATEGORY_RULES
    .map((rule) => ({ category: rule.category, score: countMatches(text, rule.terms) }))
    .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category, "ru"));
  const category = ranked[0]?.score ? ranked[0].category : "Программирование";
  const focus = FOCUS_TERMS
    .filter(([, terms]) => countMatches(text, terms) > 0)
    .slice(0, 3)
    .map(([label]) => label);
  return {
    category,
    focus: focus.length ? focus.join("; ") : category,
    categoryScores: ranked.filter((item) => item.score > 0),
  };
}

export function parseRichText(blocks = []) {
  const parts = [];
  for (const block of blocks || []) {
    if (!block?.content) continue;
    try {
      const parsed = JSON.parse(block.content);
      if (Array.isArray(parsed) && parsed[0]) parts.push(String(parsed[0]));
      else if (typeof parsed === "string") parts.push(parsed);
    } catch {
      if (typeof block.content === "string") parts.push(block.content);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function currentPromoPrice(level, nowSeconds) {
  const active = (Array.isArray(level.promos) ? level.promos : []).filter((promo) =>
    !promo.isFinished &&
    (!promo.startTime || promo.startTime <= nowSeconds) &&
    (!promo.endTime || promo.endTime >= nowSeconds)
  );
  const prices = active
    .flatMap((promo) => [promo.discount, ...(promo.discounts || [])])
    .map((discount) => discount?.currencyPrices?.RUB ?? discount?.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function localIsoDate(timeZone = "Europe/Moscow", date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function activityStatus(lastPostAt, checkedAt) {
  if (!lastPostAt) return { id: "unknown", label: "Нет данных", days: null };
  const checked = new Date(`${checkedAt}T23:59:59+03:00`);
  const lastPost = new Date(lastPostAt);
  const days = Math.max(0, Math.floor((checked - lastPost) / 86400000));
  if (days <= 30) return { id: "fresh", label: "Свежий", days };
  if (days <= 90) return { id: "active", label: "Активный", days };
  if (days <= 365) return { id: "rare", label: "Редкий", days };
  return { id: "archive", label: "Архивный", days };
}

export function extractBoostySlugs(text) {
  const decoded = String(text)
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/");
  const slugs = [];
  const pattern = /https?:\/\/(?:www\.)?boosty\.to\/(?:about\/)?([a-zA-Z0-9_.-]+)/gi;
  for (const match of decoded.matchAll(pattern)) {
    const slug = match[1].toLowerCase();
    if (!RESERVED_SLUGS.has(slug)) slugs.push(slug);
  }
  return unique(slugs);
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        accept: "application/json",
        "accept-language": "ru-RU,ru;q=0.9,en;q=0.6",
        "user-agent": "BoostyITCatalog/1.0 (+https://github.com/)",
      },
    });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status)) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_200 * (attempt + 1)));
  }
  throw new Error(`Retries exhausted for ${url}`);
}

export async function fetchBoostyChannel(seed, previous, checkedAt) {
  const slug = String(seed.slug || "").toLowerCase();
  if (!/^[a-z0-9_.-]{1,120}$/.test(slug)) {
    throw new Error(`Invalid Boosty slug: ${slug}`);
  }

  const blog = await fetchJson(`${API_BASE}/v1/blog/${encodeURIComponent(slug)}`);
  const [levelsResult, postsResult] = await Promise.all([
    fetchJson(`${API_BASE}/v1/blog/${encodeURIComponent(slug)}/subscription_level/?show_free_level=true&sort_by=on_time&offset=0&limit=50&order=gt`),
    fetchJson(`${API_BASE}/v1/blog/${encodeURIComponent(slug)}/post/?limit=20`),
  ]);

  const nowSeconds = Math.floor(new Date(`${checkedAt}T23:59:59+03:00`).getTime() / 1000);
  const levels = (levelsResult.data || []).filter((level) =>
    Number(level.currencyPrices?.RUB ?? level.price) > 0 &&
    !level.deleted &&
    !level.isArchived &&
    !level.flags?.isArchived &&
    !level.isHidden &&
    !level.flags?.isHidden
  );
  const tiers = levels.map((level) => ({
    name: String(level.name || "").slice(0, 160),
    priceRub: Number(level.currencyPrices?.RUB ?? level.price),
    promoPriceRub: currentPromoPrice(level, nowSeconds),
  }));

  const posts = (postsResult.data || [])
    .filter((post) => post?.isPublished !== false && !post?.isDeleted)
    .sort((a, b) => (b.publishTime || b.createdAt || 0) - (a.publishTime || a.createdAt || 0));
  const lastPost = posts[0] || null;
  const descriptionText = parseRichText(blog.description || []);
  const recentPostTitles = posts.slice(0, 8).map((post) => post.title || "").filter(Boolean);
  const combinedText = [
    blog.owner?.name,
    blog.title,
    descriptionText,
    ...tiers.map((tier) => tier.name),
    ...recentPostTitles,
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").toLowerCase();

  const relevanceScore = countMatches(combinedText, ALL_RELEVANCE_TERMS);
  const language = languageMetrics(combinedText);
  const classification = inferClassification(combinedText);
  const subscribers = Number(blog.count?.subscribers ?? 0);
  const historicalSubscribers = Number.isFinite(previous?.subscribers) ? previous.subscribers : null;
  const growthSinceSnapshot = historicalSubscribers === null ? null : subscribers - historicalSubscribers;
  const listPrices = tiers.map((tier) => tier.priceRub).filter(Number.isFinite);
  const promoPrices = tiers.map((tier) => tier.promoPriceRub).filter(Number.isFinite);
  const isRussian = language.cyrillic >= 12 && language.cyrillicShare >= 0.12;
  const hasPosts = Number(blog.count?.posts ?? 0) > 0;
  const notBanned = !/banned|заблокирован/i.test(`${blog.owner?.name || ""} ${blog.title || ""}`);

  return {
    slug: blog.blogUrl || slug,
    name: blog.owner?.name || blog.blogUrl || slug,
    title: blog.title || "",
    boostyUrl: `https://boosty.to/${blog.blogUrl || slug}`,
    category: classification.category,
    focus: classification.focus,
    reason: `Профильный русскоязычный канал: ${classification.focus}.`,
    subscribers,
    postsCount: Number(blog.count?.posts ?? 0),
    lastPostAt: lastPost?.publishTime ? new Date(lastPost.publishTime * 1000).toISOString() : null,
    lastPostTitle: String(lastPost?.title || "").slice(0, 300),
    minPriceRub: listPrices.length ? Math.min(...listPrices) : null,
    maxPriceRub: listPrices.length ? Math.max(...listPrices) : null,
    minPromoPriceRub: promoPrices.length ? Math.min(...promoPrices) : null,
    tierCount: tiers.length,
    tiers,
    checkedAt,
    historicalSubscribers,
    growthSinceSnapshot,
    lastObservedGrowthDate: growthSinceSnapshot > 0 ? checkedAt : previous?.lastObservedGrowthDate || null,
    relevanceScore,
    isRussian,
    hasPosts,
    hasPaidLevels: tiers.length > 0,
    notBanned,
    qualifies: isRussian && relevanceScore >= 2 && hasPosts && tiers.length > 0 && notBanned,
  };
}

export async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        results[index] = {
          ...items[index],
          fetchError: String(error?.message || error),
        };
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return results;
}

export function toPublicChannel(row) {
  const tiers = (row.tiers || []).map((tier) => ({
    name: String(tier.name || "").slice(0, 160),
    priceRub: Number(tier.priceRub),
    promoPriceRub: Number.isFinite(tier.promoPriceRub) ? Number(tier.promoPriceRub) : null,
  }));
  return {
    slug: String(row.slug).toLowerCase(),
    name: String(row.name || row.slug).slice(0, 180),
    title: String(row.title || "").slice(0, 220),
    boostyUrl: `https://boosty.to/${String(row.slug).toLowerCase()}`,
    category: String(row.category || "Программирование"),
    focus: String(row.focus || row.category || "Программирование").slice(0, 320),
    reason: String(row.reason || "").slice(0, 360),
    subscribers: Math.max(0, Number(row.subscribers) || 0),
    postsCount: Math.max(0, Number(row.postsCount) || 0),
    lastPostAt: row.lastPostAt || null,
    lastPostTitle: String(row.lastPostTitle || "").slice(0, 300),
    minPriceRub: Number.isFinite(row.minPriceRub) ? Number(row.minPriceRub) : null,
    maxPriceRub: Number.isFinite(row.maxPriceRub) ? Number(row.maxPriceRub) : null,
    minPromoPriceRub: Number.isFinite(row.minPromoPriceRub) ? Number(row.minPromoPriceRub) : null,
    tierCount: tiers.length,
    tiers,
    checkedAt: row.checkedAt,
    historicalSubscribers: Number.isFinite(row.historicalSubscribers) ? Number(row.historicalSubscribers) : null,
    growthSinceSnapshot: Number.isFinite(row.growthSinceSnapshot) ? Number(row.growthSinceSnapshot) : null,
    lastObservedGrowthDate: row.lastObservedGrowthDate || null,
  };
}
