import test from "node:test";
import assert from "node:assert/strict";
import {
  clampPrice,
  compareChannels,
  defaultSortDirection,
  matchesFilters,
  normalizeText,
  resultLabel,
} from "../site/assets/catalog-core.js";
import {
  assessBoostyBlog,
  buildChannelSummary,
  findPublicContactKinds,
  inferClassification,
  sanitizePublicSummary,
  toPublicChannel,
} from "../scripts/lib/catalog.mjs";

const channels = [
  {
    name: "Python Lab",
    category: "Программирование",
    activity: "fresh",
    price: 300,
    subscribers: 1200,
    lastPost: 100,
    growth: 12,
    searchText: "Python Lab Django FastAPI",
  },
  {
    name: "DevOps Дом",
    category: "Администрирование / DevOps / сети",
    activity: "active",
    price: 150,
    subscribers: 300,
    lastPost: 90,
    growth: -2,
    searchText: "DevOps Дом Kubernetes Linux",
  },
];

test("normalizes Russian text and ё", () => {
  assert.equal(normalizeText("  Всё   о Python  "), "все о python");
});

test("clamps price input to a safe range", () => {
  assert.equal(clampPrice("250"), 250);
  assert.equal(clampPrice("-5"), 0);
  assert.equal(clampPrice("999999"), 500000);
  assert.equal(clampPrice("not-a-number"), null);
});

test("filters by search, topic, price and growth", () => {
  assert.equal(matchesFilters(channels[0], {
    query: "fastapi",
    category: "Программирование",
    activity: "fresh",
    maxPrice: 500,
    growth: true,
  }), true);
  assert.equal(matchesFilters(channels[1], {
    query: "kubernetes",
    category: "",
    activity: "",
    maxPrice: 200,
    growth: true,
  }), false);
});

test("sorts by subscriber count", () => {
  const sorted = [...channels].sort((a, b) => compareChannels(a, b, "subscribers"));
  assert.equal(sorted[0].name, "Python Lab");
});

test("reverses a table column when direction changes", () => {
  const descending = [...channels].sort((a, b) => compareChannels(a, b, "price", "desc"));
  assert.equal(descending[0].name, "Python Lab");
  assert.equal(defaultSortDirection("price"), "asc");
  assert.equal(defaultSortDirection("growth"), "desc");
});

test("sorts table rows by category and growth", () => {
  const byCategory = [...channels].sort((a, b) => compareChannels(a, b, "category", "asc"));
  const byGrowth = [...channels].sort((a, b) => compareChannels(a, b, "growth", "desc"));
  assert.equal(byCategory[0].name, "DevOps Дом");
  assert.equal(byGrowth[0].name, "Python Lab");
});

test("uses Russian plural forms", () => {
  assert.equal(resultLabel(1), "1 канал");
  assert.equal(resultLabel(3), "3 канала");
  assert.equal(resultLabel(12), "12 каналов");
  assert.equal(resultLabel(227), "227 каналов");
});

test("creates a public summary without external links", () => {
  const summary = buildChannelSummary({
    description: "Рассказываю о React и Node.js. Telegram-канал: https://t.me/example",
    title: "Frontend-разработка",
    focus: "JavaScript / TypeScript",
  });
  assert.equal(summary, "Рассказываю о React и Node.js.");
  assert.ok(summary.length <= 420);
  assert.ok(!summary.includes("http"));
});

test("falls back to title and focus when a Boosty description is missing", () => {
  assert.equal(
    buildChannelSummary({ title: "Практический DevOps", focus: "DevOps / Kubernetes / Docker" }),
    "Практический DevOps. Основные темы: DevOps / Kubernetes / Docker.",
  );
});

test("removes high-confidence contact details from public summaries", () => {
  const source = [
    "Рассказываю о системном дизайне.",
    "Сотрудничество: ivan.petrov+boosty@example.ru.",
    "Telegram: @author_name.",
    "Тел.: +7 (999) 123-45-67.",
    "Я в t.me/author_name.",
    "По вопросам пишите в личные сообщения.",
  ].join(" ");
  const summary = sanitizePublicSummary(source);
  assert.equal(findPublicContactKinds(summary).length, 0);
  assert.match(summary, /системном дизайне/u);
  assert.ok(!summary.includes("author_name"));
  assert.ok(!summary.includes("999"));
});

test("preserves names, technology syntax and non-contact social mentions", () => {
  const source = [
    "Меня зовут Алексей Иванов.",
    "Пишу о Python, ASP.NET, Node.js, C++17 и Telegram API.",
    "Показываю @dataclass, @Injectable и @media.",
    "Материалы за 2024–2026 годы и примеры 192.168.1.1.",
    "Доступ в закрытый Telegram-чат входит в подписку.",
    "Сотрудничество разработчиков и дизайнеров разбираю на примерах.",
  ].join(" ");
  assert.equal(sanitizePublicSummary(source), source);
});

test("sanitizer is idempotent and cleans dangling punctuation", () => {
  const once = sanitizePublicSummary(
    "Канал о Go. YouTube-канал: [@author_name] (https://example.ru). Сотрудничество — hello@example.ru",
  );
  assert.equal(sanitizePublicSummary(once), once);
  assert.equal(findPublicContactKinds(once).length, 0);
  assert.ok(!/\[\s*\]|\(\s*\)/u.test(once));
});

test("preflights a Russian IT profile without fetching paid content", () => {
  const assessment = assessBoostyBlog({
    owner: { name: "Алексей Иванов" },
    title: "Практический DevOps",
    description: [{ content: JSON.stringify(["Kubernetes, Docker, Linux и Terraform."]) }],
    count: { posts: 18 },
    hasAdultContent: false,
  });
  assert.equal(assessment.hasPosts, true);
  assert.equal(assessment.isRussian, true);
  assert.equal(assessment.hasAdultContent, false);
  assert.ok(assessment.relevanceScore >= 3);
});

test("sanitizes public title and latest-post title while preserving creator name", () => {
  const channel = toPublicChannel({
    slug: "alexey",
    name: "Алексей Иванов",
    title: "Автор тг @alexey_dev — https://example.ru",
    lastPostTitle: "Вопросы: hello@example.ru",
    category: "Программирование",
    focus: "Python",
    summary: "Практические материалы по Python и FastAPI.",
    tiers: [{ name: "Подписка", priceRub: 100, promoPriceRub: null }],
    minPriceRub: 100,
    maxPriceRub: 100,
    postsCount: 1,
    checkedAt: "2026-07-26",
  });
  assert.equal(channel.name, "Алексей Иванов");
  assert.equal(findPublicContactKinds(`${channel.title} ${channel.lastPostTitle}`).length, 0);
  assert.ok(!channel.title.includes("alexey_dev"));
});

test("classifies adjacent 3D and digital-production channels explicitly", () => {
  const classification = inferClassification(
    "Уроки Blender, 3D-моделирование, ZBrush, CAD и подготовка моделей к 3D-печати".toLowerCase(),
  );
  assert.equal(classification.category, "3D / CAD / цифровое производство");
  assert.match(classification.focus, /3D \/ Blender \/ CAD/u);
});

test("does not classify ordinary words containing short ASCII technology terms", () => {
  const classification = inferClassification(
    "digital community reaction interest trust capital camera academy patriot",
  );
  assert.deepEqual(classification.categoryScores, []);
});

test("classifies standalone C#, C++, .NET and ASP.NET technology terms", () => {
  const dotnet = inferClassification("Разработка backend на C#, .NET и ASP.NET".toLowerCase());
  const cpp = inferClassification("Системное программирование на C++".toLowerCase());

  assert.equal(dotnet.category, "Программирование");
  assert.match(dotnet.focus, /C# \/ \.NET/u);
  assert.ok(dotnet.categoryScores.some((item) => item.category === "Программирование"));
  assert.equal(cpp.category, "Программирование");
  assert.match(cpp.focus, /Go \/ Rust \/ C\+\+/u);
  assert.ok(cpp.categoryScores.some((item) => item.category === "Программирование"));
});

test("removes bare URLs, domain paths and cryptocurrency payment addresses", () => {
  const source = [
    "Канал о Python и инфраструктуре.",
    "Сайт: example.ru.",
    "Документация: docs.example.com/guides/start.",
    "GitHub: github.com/example/project.",
    "Ethereum: 0xA981e26e7621C078f868c6bc83faF6bDf7e1139f.",
    "Bitcoin: 1EWgmWpCzweyhDvTNjmMYC2ATpoNfegpDk.",
  ].join(" ");
  const summary = sanitizePublicSummary(source);

  assert.match(summary, /Python и инфраструктуре/u);
  assert.equal(findPublicContactKinds(summary).length, 0);
  assert.ok(!summary.includes("example.ru"));
  assert.ok(!summary.includes("docs.example.com"));
  assert.ok(!summary.includes("github.com"));
  assert.ok(!summary.includes("0xA981"));
  assert.ok(!summary.includes("1EWgm"));
});

test("preserves dotted technology names that are not public links", () => {
  const source = "Разрабатываю на ASP.NET, Node.js, Next.js и автоматизирую процессы в n8n.io.";
  assert.equal(sanitizePublicSummary(source), source);
  assert.deepEqual(findPublicContactKinds(source), []);
});

test("removes labeled contact identifiers without an at-sign and support card numbers", () => {
  const source = [
    "Канал о Kubernetes.",
    "Telegram: author_name.",
    "Для связи: ivan.petrov.",
    "Telegram - second_name.",
    "Для связи - petr.sidorov.",
    "Поддержать: 4276 1234 5678 9012.",
  ].join(" ");
  const summary = sanitizePublicSummary(source);

  assert.equal(summary, "Канал о Kubernetes.");
  assert.deepEqual(findPublicContactKinds(summary), []);
});

test("cleans trailing contact labels left after removing links", () => {
  assert.equal(
    sanitizePublicSummary("Практические материалы по Java и Kotlin. Канал в Телеграм"),
    "Практические материалы по Java и Kotlin.",
  );
  assert.equal(
    sanitizePublicSummary("Проекты с исходным кодом:"),
    "Проекты с исходным кодом",
  );
});
