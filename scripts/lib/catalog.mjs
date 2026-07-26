const API_BASE = "https://api.boosty.to";
const BOOSTY_REQUEST_INTERVAL_MS = Math.max(100, Number(process.env.BOOSTY_REQUEST_INTERVAL_MS) || 250);
let nextBoostyRequestAt = 0;
let boostyBackoffUntil = 0;
let boostySchedulerTail = Promise.resolve();

export const CATEGORY_RULES = [
  {
    category: "Кибербезопасность",
    terms: ["кибербезопас", "информационн безопас", "cybersecurity", "pentest", "пентест", "ctf", "osint", "devsecops", "уязвим", "mitre", "hackthebox", "защита данных", "privacy", "grc", "isms"],
  },
  {
    category: "Администрирование / DevOps / сети",
    terms: ["devops", "sre", "sysadmin", "сисадмин", "системн админист", "kubernetes", "k8s", "docker", "linux", "proxmox", "truenas", "unraid", "ansible", "terraform", "zabbix", "prometheus", "grafana", "loki", "observability", "cisco", "mikrotik", "сетев", "network", "vpn", "nginx", "облак", "cloud", "ci/cd", "инфраструктур", "active directory", "windows server", "vmware", "ceph", "openstack", "powershell", "bash"],
  },
  {
    category: "Self-hosting / IoT / embedded",
    terms: ["self-host", "selfhost", "homelab", "домашн сервер", "home assistant", "умный дом", "smarthome", "zigbee", "mqtt", "arduino", "esp32", "esp8266", "embedded", "iot", "robot", "робототех", "stm32", "raspberry", "nas", "openwrt", "pfsense", "opnsense"],
  },
  {
    category: "ИИ / ML / Data Science",
    terms: ["искусственн интеллект", "нейросет", "machine learning", "машинн обуч", "deep learning", "data science", "stable diffusion", "comfyui", "midjourney", "llm", "chatgpt", "claude", "gpt", "flux", "rag", "ai-агент", "ai агент", "mcp", "генеративн", "computer vision", "nlp"],
  },
  {
    category: "Data / BI / базы данных",
    terms: ["data engineer", "data engineering", "airflow", "spark", "kafka", "etl", "dbt", "clickhouse", "postgres", "sql", "баз данных", "database", "dba", "power bi", "dax", "tableau", "excel", "power query", "power pivot", "google sheets", "google таблиц", "аналитик данных", "data governance", "dama", "хранилищ данных", "big data"],
  },
  {
    category: "Архитектура / системный анализ",
    terms: ["system design", "системн дизайн", "архитектур", "системн аналит", "solution architect", "микросервис", "highload", "распределенн систем", "ddd", "cqrs", "event sourcing", "togaf", "archimate", "api", "rest", "uml", "bpmn", "интеграц"],
  },
  {
    category: "QA / тестирование",
    terms: ["тестиров", "qa engineer", "qa ", "sdet", "автотест", "selenium", "playwright", "cypress", "appium", "jmeter", "postman", "testing", "quality assurance"],
  },
  {
    category: "Mobile",
    terms: ["android", "kotlin", "ios", "swift", "swiftui", "flutter", "dart", "react native", "мобильн разработ"],
  },
  {
    category: "Gamedev",
    terms: ["gamedev", "геймдев", "разработк игр", "unity", "unreal engine", "godot", "гейм-дизайн", "геймдизайн", "game development", "game developer", "blueprint", "моддинг", "моды для игр", "game mod", "foundry vtt"],
  },
  {
    category: "Frontend / Web / UI·UX",
    terms: ["frontend", "фронтенд", "react", "vue", "angular", "javascript", "typescript", "html", "css", "web-разработ", "веб-разработ", "product design", "ux/ui", "ui/ux", "ux research", "веб-дизайн", "дизайн интерфейс", "figma"],
  },
  {
    category: "1С / ERP / автоматизация",
    terms: ["программист 1с", "разработчик 1с", "аналитик 1с", "1с:", "1c ", "erp", "sap", "no-code", "nocode", "low-code", "lowcode", "n8n", "make.com", "zapier", "webflow", "tilda", "автоматизац процессов"],
  },
  {
    category: "IT-менеджмент / карьера",
    terms: ["team lead", "teamlead", "тимлид", "cto", "техлид", "руководител", "управлени разработ", "it-менедж", "product manager", "продуктов менедж", "technical writing", "техническ писател", "карьер в it", "собеседован", "оффер", "войти в it", "вкат в it"],
  },
  {
    category: "Программирование",
    terms: ["программир", "разработчик", "разработка по", "software", "developer", "backend", "бекенд", "бэкенд", "fullstack", "full-stack", "python", "django", "fastapi", "java", "spring", "c#", ".net", "c++", "golang", " go ", "rust", "php", "laravel", "ruby", "rails", "scala", "elixir", "haskell", "clojure", "delphi", "git", "алгоритм", "open source", "открыт код"],
  },
  {
    category: "3D / CAD / цифровое производство",
    terms: ["blender", "3d model", "3d-модел", "3д модел", "zbrush", "houdini", "cinema 4d", "3d print", "3d-печат", "3д печат", "cad", "cam", "autocad", "solidworks", "fusion 360", "чпу", "cnc"],
  },
  {
    category: "Электроника / hardware / DIY",
    terms: ["hardware", "компьютерн желез", "сборк пк", "электроник", "пайк", "ремонт компьютер", "ретрокомпьют", "retrocomput", "fpga", "pcb", "kicad"],
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
  ["3D / Blender / CAD", ["blender", "3d model", "3д модел", "zbrush", "houdini", "cad", "autocad", "solidworks", "3d print", "3д печат", "чпу", "cnc"]],
  ["Электроника / hardware", ["hardware", "электроник", "пайк", "fpga", "pcb", "kicad", "ретрокомпьют"]],
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

export const BOOSTY_POST_SEARCH_QUERIES = [
  "RAG LLM",
  "локальные LLM",
  "AI агенты MCP",
  "нейросети Python",
  "Stable Diffusion ComfyUI",
  "MLOps MLflow",
  "computer vision Python",
  "NLP Python",
  "LangChain разработка",
  "генеративный ИИ разработка",
  "Python FastAPI",
  "Python Django",
  "Java Spring Boot",
  "Kotlin Android",
  "C# ASP.NET",
  "C++ разработка",
  "Rust разработка",
  "Golang backend",
  "PHP Laravel",
  "Ruby Rails",
  "Node.js TypeScript",
  "React Next.js",
  "Vue Nuxt",
  "Angular TypeScript",
  "SwiftUI iOS",
  "Flutter Dart",
  "1С программирование",
  "Kubernetes DevOps",
  "Docker Linux",
  "Terraform Ansible",
  "GitLab CI CD",
  "Prometheus Grafana",
  "SRE observability",
  "Nginx Linux",
  "PostgreSQL DBA",
  "Kafka Data Engineering",
  "Airflow dbt",
  "ClickHouse аналитика",
  "Power BI DAX",
  "Mikrotik сети",
  "Cisco сети",
  "Proxmox homelab",
  "Home Assistant Zigbee",
  "OpenWrt WireGuard",
  "self-hosted сервер",
  "Windows Server Active Directory",
  "кибербезопасность пентест",
  "OSINT безопасность",
  "CTF cybersecurity",
  "reverse engineering malware",
  "DevSecOps безопасность",
  "bug bounty pentest",
  "архитектура микросервисов",
  "system design highload",
  "DDD CQRS",
  "event sourcing архитектура",
  "системный анализ BPMN",
  "API REST архитектура",
  "solution architect",
  "QA автоматизация",
  "Selenium Playwright",
  "Appium мобильное тестирование",
  "JMeter нагрузочное тестирование",
  "Postman API тестирование",
  "Unity C# разработка игр",
  "Unreal Engine разработка",
  "Godot разработка игр",
  "Blender 3D моделирование",
  "3D печать CAD",
  "Arduino ESP32",
  "STM32 embedded",
  "Raspberry Pi проект",
  "FPGA электроника",
  "робототехника программирование",
  "тимлид разработка",
  "собеседование backend разработчик",
  "карьера DevOps",
];

const ALL_RELEVANCE_TERMS = [...new Set(CATEGORY_RULES.flatMap((rule) => rule.terms))];
const RESERVED_SLUGS = new Set(["about", "app", "apply", "help", "privacy", "search", "terms"]);

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const TERM_PATTERN_CACHE = new Map();

function termMatches(text, term) {
  const haystack = String(text || "").toLocaleLowerCase("ru");
  const needle = String(term || "").toLocaleLowerCase("ru").trim();
  if (!needle) return false;
  if (/[а-яё]/iu.test(needle)) return haystack.includes(needle);

  let pattern = TERM_PATTERN_CACHE.get(needle);
  if (!pattern) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithWord = /^[\p{L}\p{N}_]/u.test(needle);
    const endsWithWord = /[\p{L}\p{N}_]$/u.test(needle);
    pattern = new RegExp(
      `${startsWithWord ? "(?<![\\p{L}\\p{N}_])" : ""}` +
      `${escaped}` +
      `${endsWithWord ? "(?![\\p{L}\\p{N}_])" : ""}`,
      "iu",
    );
    TERM_PATTERN_CACHE.set(needle, pattern);
  }
  return pattern.test(haystack);
}

export function countMatches(text, terms) {
  return terms.filter((term) => termMatches(text, term)).length;
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

const EMAIL_PATTERN = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu;
const EXPLICIT_URL_PATTERN = /\b(?:https?:\/\/|mailto:|tel:|tg:\/\/|www\.)[^\s)\]}>,]+/giu;
const SOCIAL_LINK_PATTERN = /\b(?:t(?:elegram)?\.me|vk\.com|vk\.me|wa\.me|api\.whatsapp\.com|discord\.gg|discord\.com\/invite|viber\.com)\/[^\s)\]}>,]+/giu;
const BARE_URL_PATTERN = /(?<![\p{L}\p{N}_@])(?:[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?\.)+(?:ru|com|org|net|io|dev|ai|pro|me|gg|рф)(?:\/[^\s)\]}>,]*)?/giu;
const CRYPTO_ADDRESS_PATTERN = /(?<![\p{L}\p{N}])(?:0x[a-f0-9]{40}|bc1[a-z0-9]{25,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})(?![\p{L}\p{N}])/giu;
const HANDLE_PATTERN = /@[\p{L}\p{N}_]{3,}/giu;
const PHONE_CANDIDATE_PATTERN = /(?:\+\s*)?\d[\d\s().-]{5,}\d/gu;
const CONTACT_CONTEXT_PATTERN = /(?:telegram|телеграм|(?:^|[^\p{L}\p{N}_])тг(?:$|[^\p{L}\p{N}_])|ютуб|youtube|вконтакте|\bvk\b|discord|whatsapp|ватсап|viber|вайбер|соцсет|аккаунт|профил|канал|сообществ)/iu;
const CONTACT_INTENT_PATTERN = /(?<![\p{L}\p{N}_])(?:напишите|пишите|пиши|свяжитесь|обращайтесь|задать\s+вопрос|по\s+вопросам|прежде\s+чем\s+написать|перед\s+тем,?\s+как\s+писать|before\s+writing|contact\s+me)(?![\p{L}\p{N}_])/iu;
const CONTACT_DESTINATION_PATTERN = /(?:личн(?:ые|ое|ых)\s+сообщени|личк|личку|(?:^|[^\p{L}\p{N}_])(?:лс|тг)(?:$|[^\p{L}\p{N}_])|telegram|телеграм|discord|whatsapp|ватсап|viber|вайбер|вконтакте|\bvk\b|почт|e-?mail|телефон|phone|тут|здесь|private\s+messages?)/iu;
const SOCIAL_PRESENCE_PATTERN = /(?:^|[^\p{L}\p{N}_])(?:я|мы)\s+(?:есть\s+)?в(?:$|[^\p{L}\p{N}_])/iu;
const PHONE_CONTEXT_PATTERN = /(?:тел(?:ефон)?\.?|phone|whatsapp|ватсап|viber|вайбер|звон|связ)/iu;
const CARD_CONTEXT_PATTERN = /(?:карт(?:а|у|ы|е)|card|сбер|перевод|поддерж(?:ать|ка|ите)?|донат|donat|donation|кошел[её]к|wallet)/iu;
const LABELED_CONTACT_IDENTIFIER_PATTERN = /(?<![\p{L}\p{N}_])(?:для\s+связи|контакты?|почт(?:а|е|у)?|e-?mail|telegram|телеграм|(?:^|[^\p{L}\p{N}_])тг|youtube|ютуб|вконтакте|(?:^|[^\p{L}\p{N}_])vk|discord|whatsapp|ватсап|viber|вайбер)\s*(?:-?канал)?\s*(?::|[—–]\s*|-\s+)\s*@?[\p{L}\p{N}_.-]{3,}/giu;
const LINK_PROMOTION_PATTERN = /(?:мой|мои|наш|наша|веду\s+блог|подписывай|канал|группа|социалк|сайт|github|gitlab|ютуб|youtube|telegram|телеграм|вконтакте|\bvk\b|discord|twitch|твич|patreon|патреон|linkedin|линкедин|instagram|инстаграм|записаться|консультац)/iu;
const TRAILING_CONTACT_BLOCK_PATTERN = /(?:^|\s)(?:(?:мой|мои|наш|наша|канал\s+в|группа|дорожная\s+карта|канал|чат)\s+)?(?:telegram|телеграм|тг|youtube|ютуб|vk|вконтакте|discord|github|gitlab|twitch|твич|patreon|патреон|linkedin|линкедин|instagram|инстаграм|сайт|социалки)(?:\s*[-—–:]\s*(?:telegram|телеграм|тг|youtube|ютуб|vk|вконтакте|discord|github|gitlab|twitch|твич|patreon|патреон|linkedin|линкедин|instagram|инстаграм|сайт|социалки))*\s*[-—–:]*$/giu;
const TECHNICAL_DOMAIN_TOKENS = new Set(["asp.net", "vb.net", "n8n.io"]);

function regexTest(pattern, value) {
  pattern.lastIndex = 0;
  const matches = pattern.test(value);
  pattern.lastIndex = 0;
  return matches;
}

function isTechnicalDomainToken(value) {
  return TECHNICAL_DOMAIN_TOKENS.has(String(value || "").toLocaleLowerCase("en").replace(/\/$/u, ""));
}

function hasSocialHandleContext(value, offset, handle) {
  const beforeWindow = value.slice(Math.max(0, offset - 72), offset);
  const afterWindow = value.slice(offset + handle.length, offset + handle.length + 32);
  const before = beforeWindow.slice(Math.max(
    beforeWindow.lastIndexOf("."),
    beforeWindow.lastIndexOf("!"),
    beforeWindow.lastIndexOf("?"),
    beforeWindow.lastIndexOf("\n"),
  ) + 1);
  const after = afterWindow.split(/[.!?\n]/u, 1)[0];
  return CONTACT_CONTEXT_PATTERN.test(`${before} ${after}`) ||
    /[\[(]\s*$/u.test(before) ||
    /^\s*[\])]/u.test(after);
}

function phoneCandidateKind(value, offset, candidate) {
  const digits = candidate.replace(/\D/g, "");
  if (candidate.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return "phone";
  if (digits.length === 11 && /^[78]/u.test(digits)) return "phone";

  const context = value.slice(Math.max(0, offset - 36), offset + candidate.length + 36);
  if (digits.length >= 7 && digits.length <= 15 && PHONE_CONTEXT_PATTERN.test(context)) return "phone";
  if (digits.length >= 13 && digits.length <= 19 && CARD_CONTEXT_PATTERN.test(context)) return "payment-number";
  return null;
}

function removeContactInstructionSegments(value) {
  return value.split(/(?<=[.!?])\s+|\n+/u).map((segment) => {
    const hasIntent = CONTACT_INTENT_PATTERN.test(segment);
    const hasDestination = CONTACT_DESTINATION_PATTERN.test(segment) ||
      regexTest(SOCIAL_LINK_PATTERN, segment) ||
      regexTest(EXPLICIT_URL_PATTERN, segment);
    const isSocialPresence = SOCIAL_PRESENCE_PATTERN.test(segment) &&
      (regexTest(SOCIAL_LINK_PATTERN, segment) || regexTest(EXPLICIT_URL_PATTERN, segment));
    const hasPublicLink = regexTest(SOCIAL_LINK_PATTERN, segment) ||
      regexTest(EXPLICIT_URL_PATTERN, segment) ||
      [...segment.matchAll(BARE_URL_PATTERN)].some((match) => !isTechnicalDomainToken(match[0]));
    const promotesExternalLink = hasPublicLink && LINK_PROMOTION_PATTERN.test(segment);
    return (hasIntent && hasDestination) || isSocialPresence || promotesExternalLink ? " " : segment;
  }).join(" ");
}

export function findPublicContactKinds(value) {
  const text = String(value || "");
  const kinds = new Set();
  if (regexTest(EMAIL_PATTERN, text)) kinds.add("email");
  if (regexTest(EXPLICIT_URL_PATTERN, text)) kinds.add("url");
  if (regexTest(SOCIAL_LINK_PATTERN, text)) kinds.add("social-link");
  for (const match of text.matchAll(BARE_URL_PATTERN)) {
    if (!isTechnicalDomainToken(match[0])) kinds.add("bare-url");
  }
  if (regexTest(CRYPTO_ADDRESS_PATTERN, text)) kinds.add("payment-address");
  if (regexTest(LABELED_CONTACT_IDENTIFIER_PATTERN, text)) kinds.add("contact-identifier");
  if (CONTACT_INTENT_PATTERN.test(text) && CONTACT_DESTINATION_PATTERN.test(text)) {
    kinds.add("contact-instruction");
  }

  for (const match of text.matchAll(HANDLE_PATTERN)) {
    if (hasSocialHandleContext(text, match.index, match[0])) kinds.add("social-handle");
  }
  for (const match of text.matchAll(PHONE_CANDIDATE_PATTERN)) {
    const kind = phoneCandidateKind(text, match.index, match[0]);
    if (kind) kinds.add(kind);
  }
  return [...kinds].sort();
}

export function sanitizePublicSummary(value) {
  let text = String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#160;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "‹")
    .replaceAll("&gt;", "›");
  text = removeContactInstructionSegments(text);
  text = text
    .replace(LABELED_CONTACT_IDENTIFIER_PATTERN, " ")
    .replace(EMAIL_PATTERN, " ")
    .replace(EXPLICIT_URL_PATTERN, " ")
    .replace(SOCIAL_LINK_PATTERN, " ")
    .replace(BARE_URL_PATTERN, (url) => isTechnicalDomainToken(url) ? url : " ")
    .replace(CRYPTO_ADDRESS_PATTERN, " ")
    .replace(HANDLE_PATTERN, (handle, offset, source) =>
      hasSocialHandleContext(source, offset, handle) ? " " : handle
    )
    .replace(PHONE_CANDIDATE_PATTERN, (candidate, offset, source) =>
      phoneCandidateKind(source, offset, candidate) ? " " : candidate
    )
    .replace(
      /(?:мой\s+сайт|мои\s+ссылки|видео|чат|анонсы|telegram|телеграм|youtube|ютуб|вконтакте|vk|discord|сайт|соцсети)\s*(?:-?канал)?\s*:\s*/giu,
      " ",
    )
    .replace(
      /(?:основной\s+youtube|больше\s+ссылок(?:\s+тут)?)[\s\S]*$/giu,
      " ",
    )
    .replace(/(?:^|\s)(?:сотрудничество|для\s+связи|контакты?|поддержать|донат|перевод)\s*[:—–-]+\s*(?=$|[.!?])/giu, " ")
    .replace(/(?:^|([.!?])\s+)(?:я|мы)\s+(?:есть\s+)?в\s*(?=$|[.!?])/giu, "$1 ")
    .replace(TRAILING_CONTACT_BLOCK_PATTERN, " ")
    .replace(/[«“"]\s*[»”"]/gu, " ")
    .replace(/\[\s*\]|\(\s*\)/gu, " ")
    .replace(/\(\s*[,;]\s*/gu, "(")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([.!?])(?:\s*[.!?])+/g, "$1")
    .replace(/\s+и\.$/giu, ".")
    .replace(/[,;:—–-]+\s*$/gu, "")
    .replace(/\s+([)\]])/g, "$1")
    .trim();
  return text;
}

export function buildChannelSummary({
  description = "",
  title = "",
  focus = "",
  category = "Программирование",
} = {}) {
  const clean = sanitizePublicSummary;
  const shorten = (value, limit = 420) => {
    if (value.length <= limit) return value;
    const excerpt = value.slice(0, limit + 1);
    const sentenceEnd = Math.max(
      excerpt.lastIndexOf(". "),
      excerpt.lastIndexOf("! "),
      excerpt.lastIndexOf("? "),
    );
    if (sentenceEnd >= Math.min(180, Math.floor(limit * 0.55)) && sentenceEnd < limit) {
      return excerpt.slice(0, sentenceEnd + 1).trim();
    }
    const wordEnd = excerpt.lastIndexOf(" ");
    const end = wordEnd > 0 ? Math.min(wordEnd, limit - 1) : limit - 1;
    return `${excerpt.slice(0, end).trim()}…`;
  };

  const cleanedDescription = clean(description);
  if (cleanedDescription.length >= 24) return shorten(cleanedDescription);

  const cleanedTitle = clean(title).replace(/[.!?]+$/, "");
  const cleanedFocus = clean(focus || category).replace(/[.!?]+$/, "");
  if (cleanedTitle && normalizeComparable(cleanedTitle) !== normalizeComparable(cleanedFocus)) {
    return shorten(`${cleanedTitle}. Основные темы: ${cleanedFocus}.`);
  }
  return shorten(`Канал посвящён следующим темам: ${cleanedFocus || category}.`);
}

function normalizeComparable(value) {
  return String(value || "")
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
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

async function reserveBoostyRequestSlot() {
  let releaseTurn;
  const turn = new Promise((resolve) => {
    releaseTurn = resolve;
  });
  const previousTurn = boostySchedulerTail;
  boostySchedulerTail = turn;
  await previousTurn;
  try {
    while (true) {
      const waitUntil = Math.max(nextBoostyRequestAt, boostyBackoffUntil);
      const waitMs = waitUntil - Date.now();
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      nextBoostyRequestAt = Date.now() + BOOSTY_REQUEST_INTERVAL_MS;
      return;
    }
  } finally {
    releaseTurn();
  }
}

export async function fetchBoostyJson(url) {
  const parsedUrl = new URL(url);
  if (parsedUrl.origin !== API_BASE) throw new Error(`Unexpected Boosty API origin: ${parsedUrl.origin}`);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await reserveBoostyRequestSlot();

    try {
      const response = await fetch(parsedUrl, {
        signal: AbortSignal.timeout(20_000),
        headers: {
          accept: "application/json",
          "accept-language": "ru-RU,ru;q=0.9,en;q=0.6",
          "user-agent": "BoostyITCatalog/1.0 (+https://github.com/BelyaevAD/boosty-it-catalog)",
        },
      });
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`HTTP ${response.status} for ${parsedUrl}`);
      }

      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds = Number(retryAfterHeader);
      const retryAfterDate = retryAfterHeader && !Number.isFinite(retryAfterSeconds)
        ? Date.parse(retryAfterHeader)
        : Number.NaN;
      const retryAfterMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1_000
        : Number.isFinite(retryAfterDate)
          ? Math.max(0, retryAfterDate - Date.now())
          : 0;
      const exponentialBackoff = response.status === 429
        ? Math.min(60_000, 10_000 * 2 ** attempt)
        : Math.min(15_000, 1_500 * 2 ** attempt);
      const waitMs = Math.max(retryAfterMs, exponentialBackoff);
      if (response.status === 429) boostyBackoffUntil = Math.max(boostyBackoffUntil, Date.now() + waitMs);
    } catch (error) {
      if (!/fetch|timeout|aborted/i.test(String(error?.message || error)) || attempt === 5) throw error;
    }
    if (attempt < 5) {
      const waitUntil = Math.max(
        boostyBackoffUntil,
        Date.now() + Math.min(15_000, 1_500 * 2 ** attempt),
      );
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitUntil - Date.now())));
    }
  }
  throw new Error(`Retries exhausted for ${parsedUrl}`);
}

function validBoostySlug(value) {
  const slug = String(value || "").toLowerCase();
  if (!/^[a-z0-9_.-]{1,120}$/.test(slug)) {
    throw new Error(`Invalid Boosty slug: ${slug}`);
  }
  return slug;
}

export async function fetchBoostyBlog(slug) {
  const safeSlug = validBoostySlug(slug);
  return fetchBoostyJson(`${API_BASE}/v1/blog/${encodeURIComponent(safeSlug)}`);
}

export function assessBoostyBlog(blog) {
  const descriptionText = parseRichText(blog?.description || []);
  const combinedText = [
    blog?.owner?.name,
    blog?.title,
    descriptionText,
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").toLowerCase();
  const language = languageMetrics(combinedText);
  return {
    descriptionText,
    combinedText,
    relevanceScore: countMatches(combinedText, ALL_RELEVANCE_TERMS),
    language,
    isRussian: language.cyrillic >= 12 && language.cyrillicShare >= 0.12,
    hasPosts: Number(blog?.count?.posts ?? 0) > 0,
    notBanned: !/banned|заблокирован/i.test(`${blog?.owner?.name || ""} ${blog?.title || ""}`),
    hasAdultContent: Boolean(blog?.hasAdultContent || blog?.flags?.hasAdultContent),
  };
}

export async function fetchBoostyChannel(seed, previous, checkedAt) {
  const slug = validBoostySlug(seed.slug);

  const blog = seed.blog || await fetchBoostyBlog(slug);
  const [levelsResult, postsResult] = await Promise.all([
    fetchBoostyJson(`${API_BASE}/v1/blog/${encodeURIComponent(slug)}/subscription_level/?show_free_level=true&sort_by=on_time&offset=0&limit=50&order=gt`),
    fetchBoostyJson(`${API_BASE}/v1/blog/${encodeURIComponent(slug)}/post/?limit=20`),
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
  const profileAssessment = assessBoostyBlog(blog);
  const descriptionText = profileAssessment.descriptionText;
  const recentPostTitles = posts.slice(0, 8).map((post) => post.title || "").filter(Boolean);
  const combinedText = [
    blog.owner?.name,
    blog.title,
    descriptionText,
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
  const hasAdultContent = profileAssessment.hasAdultContent;

  return {
    slug: blog.blogUrl || slug,
    name: blog.owner?.name || blog.blogUrl || slug,
    title: blog.title || "",
    boostyUrl: `https://boosty.to/${blog.blogUrl || slug}`,
    category: classification.category,
    focus: classification.focus,
    reason: `Профильный русскоязычный канал: ${classification.focus}.`,
    summary: buildChannelSummary({
      description: descriptionText,
      title: blog.title,
      focus: classification.focus,
      category: classification.category,
    }),
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
    profileRelevanceScore: profileAssessment.relevanceScore,
    isRussian,
    hasPosts,
    hasPaidLevels: tiers.length > 0,
    hasAdultContent,
    notBanned,
    qualifies: isRussian &&
      relevanceScore >= 2 &&
      profileAssessment.relevanceScore >= 1 &&
      hasPosts &&
      tiers.length > 0 &&
      !hasAdultContent &&
      notBanned,
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
    name: sanitizePublicSummary(tier.name || "Подписка").slice(0, 160) || "Подписка",
    priceRub: Number(tier.priceRub),
    promoPriceRub: Number.isFinite(tier.promoPriceRub) ? Number(tier.promoPriceRub) : null,
  }));
  return {
    slug: String(row.slug).toLowerCase(),
    name: String(row.name || row.slug).slice(0, 180),
    title: sanitizePublicSummary(row.title).slice(0, 220),
    boostyUrl: `https://boosty.to/${String(row.slug).toLowerCase()}`,
    category: String(row.category || "Программирование"),
    focus: String(row.focus || row.category || "Программирование").slice(0, 320),
    reason: String(row.reason || "").slice(0, 360),
    summary: buildChannelSummary({
      description: row.summary || row.description,
      title: row.title,
      focus: row.focus,
      category: row.category,
    }),
    subscribers: Math.max(0, Number(row.subscribers) || 0),
    postsCount: Math.max(0, Number(row.postsCount) || 0),
    lastPostAt: row.lastPostAt || null,
    lastPostTitle: sanitizePublicSummary(row.lastPostTitle).slice(0, 300),
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
