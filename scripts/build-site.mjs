import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { activityStatus } from "./lib/catalog.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dataPath = path.join(root, "data", "channels.json");
const siteSource = path.join(root, "site");
const output = path.join(root, "dist");
const siteUrl = normalizeBaseUrl(process.env.SITE_URL || "http://127.0.0.1:4173/");
const repositoryUrl = process.env.REPOSITORY_URL || "https://github.com/BelyaevAD/boosty-it-catalog";
const issueUrl = `${repositoryUrl}/issues/new?template=new-channel.yml`;
const locale = "ru-RU";

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("SITE_URL must use http or https.");
  }
  url.hash = "";
  url.search = "";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
  return url.toString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("base64");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(locale);
}

function formatDate(value, options = {}) {
  if (!value) return "нет данных";
  const date = new Date(value.length === 10 ? `${value}T12:00:00+03:00` : value);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: options.short ? "short" : "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(date);
}

function effectivePrice(channel) {
  const promo = Number(channel.minPromoPriceRub);
  const list = Number(channel.minPriceRub);
  return Number.isFinite(promo) && promo > 0 ? Math.min(promo, list || promo) : list;
}

function formatPrice(channel) {
  const value = effectivePrice(channel);
  return Number.isFinite(value) && value > 0 ? `${formatNumber(value)} ₽` : "уточнить";
}

function tierPrice(tier) {
  const promo = Number(tier.promoPriceRub);
  const list = Number(tier.priceRub);
  if (Number.isFinite(promo) && promo > 0 && promo < list) {
    return `${formatNumber(promo)} ₽ вместо ${formatNumber(list)} ₽`;
  }
  return `${formatNumber(list)} ₽`;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function safeSlug(value) {
  const slug = String(value || "").toLowerCase();
  if (!/^[a-z0-9_.-]{1,120}$/.test(slug)) throw new Error(`Unsafe slug: ${slug}`);
  return slug;
}

function channelCard(channel, checkedAt) {
  const activity = activityStatus(channel.lastPostAt, checkedAt);
  const price = effectivePrice(channel);
  const lastPostTimestamp = channel.lastPostAt ? Date.parse(channel.lastPostAt) : 0;
  const searchText = [
    channel.name,
    channel.title,
    channel.summary,
    channel.category,
    channel.focus,
    channel.lastPostTitle,
  ].filter(Boolean).join(" ");
  const statusHint = activity.days === null
    ? "Дата последней публикации неизвестна"
    : `${activity.days.toLocaleString(locale)} дн. с последней публикации`;
  const promo = Number(channel.minPromoPriceRub);
  const hasPromo = Number.isFinite(promo) && promo > 0 && promo < Number(channel.minPriceRub);
  const slug = safeSlug(channel.slug);
  return `
          <article
            class="channel-card"
            data-slug="${escapeHtml(slug)}"
            data-name="${escapeHtml(channel.name)}"
            data-category="${escapeHtml(channel.category)}"
            data-activity="${activity.id}"
            data-price="${Number.isFinite(price) ? price : 100000}"
            data-subscribers="${channel.subscribers}"
            data-last-post="${lastPostTimestamp}"
            data-growth="${channel.growthSinceSnapshot || 0}"
            data-search="${escapeHtml(searchText)}"
          >
            <div class="card-topline">
              <span class="card-category">${escapeHtml(channel.category)}</span>
              <span class="status status-${activity.id}" title="${escapeHtml(statusHint)}">${escapeHtml(activity.label)}</span>
            </div>
            <h3>
              <a href="./channels/${encodeURIComponent(slug)}/" data-open-channel="${escapeHtml(slug)}">${escapeHtml(channel.name)}</a>
            </h3>
            <p class="card-focus">${escapeHtml(channel.focus || channel.title || channel.category)}</p>
            <dl class="card-metrics">
              <div>
                <dt>Подписчиков</dt>
                <dd>${formatNumber(channel.subscribers)}</dd>
              </div>
              <div>
                <dt>Последний пост</dt>
                <dd>${escapeHtml(formatDate(channel.lastPostAt, { short: true }))}</dd>
              </div>
            </dl>
            <div class="card-footer">
              <span class="price">
                <strong>от ${escapeHtml(formatPrice(channel))}</strong>
                <small>${hasPromo ? "промо-цена" : "в месяц"}</small>
              </span>
              <span class="card-actions">
                <a class="card-detail-link" href="./channels/${encodeURIComponent(slug)}/" data-open-channel="${escapeHtml(slug)}">Подробнее</a>
                <a class="card-link" href="${escapeHtml(channel.boostyUrl)}" target="_blank" rel="noopener noreferrer">Boosty ↗</a>
              </span>
            </div>
          </article>`;
}

function tierLabel(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} тарифов`;
  if (last === 1) return `${count} тариф`;
  if (last >= 2 && last <= 4) return `${count} тарифа`;
  return `${count} тарифов`;
}

function focusTags(focus) {
  return String(focus || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");
}

function channelDetailTemplate(channel, checkedAt) {
  const activity = activityStatus(channel.lastPostAt, checkedAt);
  const slug = safeSlug(channel.slug);
  const growth = Number(channel.growthSinceSnapshot);
  const growthText = !Number.isFinite(growth)
    ? "нет снимка"
    : growth === 0
      ? "без изменений"
      : `${growth > 0 ? "+" : ""}${formatNumber(growth)}`;
  const tiers = (channel.tiers || []).length
    ? channel.tiers.map((tier) => `
                <li>
                  <span>${escapeHtml(tier.name || "Подписка")}</span>
                  <strong>${escapeHtml(tierPrice(tier))}</strong>
                </li>`).join("")
    : "<li><span>Тарифы не найдены</span><strong>—</strong></li>";
  const recentPost = channel.lastPostTitle
    ? `<div>
        <dt>Последний материал</dt>
        <dd>${escapeHtml(channel.lastPostTitle)}</dd>
      </div>`
    : "";

  return `
          <template data-channel-slug="${escapeHtml(slug)}">
            <article class="dialog-channel">
              <div class="dialog-channel-topline">
                <span class="card-category">${escapeHtml(channel.category)}</span>
                <span class="status status-${activity.id}">${escapeHtml(activity.label)}</span>
              </div>
              <h2 id="dialog-title-${escapeHtml(slug)}">${escapeHtml(channel.name)}</h2>
              <p class="dialog-summary">${escapeHtml(channel.summary || channel.title || channel.focus)}</p>
              <div class="focus-tags" aria-label="Темы канала">${focusTags(channel.focus)}</div>

              <dl class="detail-stats detail-stats-dialog">
                <div><dt>Подписчиков</dt><dd>${formatNumber(channel.subscribers)}</dd></div>
                <div><dt>Постов</dt><dd>${formatNumber(channel.postsCount)}</dd></div>
                <div><dt>Подписка от</dt><dd>${escapeHtml(formatPrice(channel))}</dd></div>
                <div><dt>Рост к снимку</dt><dd>${escapeHtml(growthText)}</dd></div>
              </dl>

              <dl class="dialog-context">
                <div>
                  <dt>Последняя публикация</dt>
                  <dd>${escapeHtml(formatDate(channel.lastPostAt))}</dd>
                </div>
                ${recentPost}
              </dl>

              <h3>Уровни подписки</h3>
              <ul class="tier-list tier-list-dialog">${tiers}</ul>

              <div class="dialog-actions">
                <a class="button button-primary" href="${escapeHtml(channel.boostyUrl)}" target="_blank" rel="noopener noreferrer">Перейти на Boosty ↗</a>
                <a class="button button-secondary" href="./channels/${encodeURIComponent(slug)}/">Открыть отдельную страницу</a>
              </div>
              <p class="channel-detail-note">
                Описание подготовлено на основе профиля Boosty и тематики публикаций.
                Данные проверены ${escapeHtml(formatDate(checkedAt))}
              </p>
            </article>
          </template>`;
}

function channelRow(channel, checkedAt) {
  const activity = activityStatus(channel.lastPostAt, checkedAt);
  const slug = safeSlug(channel.slug);
  const growth = Number(channel.growthSinceSnapshot);
  const growthText = Number.isFinite(growth)
    ? `${growth > 0 ? "+" : ""}${formatNumber(growth)}`
    : "—";
  const growthClass = growth > 0 ? "is-positive" : growth < 0 ? "is-negative" : "";
  const price = formatPrice(channel);
  const tierRange = channel.maxPriceRub > channel.minPriceRub
    ? `${tierLabel(channel.tierCount)} · до ${formatNumber(channel.maxPriceRub)} ₽`
    : tierLabel(channel.tierCount);
  return `
              <tr class="channel-row" data-slug="${escapeHtml(slug)}">
                <td class="table-name">
                  <span class="table-name-line">
                    <a href="./channels/${encodeURIComponent(slug)}/" data-open-channel="${escapeHtml(slug)}">${escapeHtml(channel.name)}</a>
                    <a
                      class="table-boosty-mini"
                      href="${escapeHtml(channel.boostyUrl)}"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Открыть ${escapeHtml(channel.name)} на Boosty"
                      title="Открыть на Boosty"
                    >Boosty ↗</a>
                  </span>
                </td>
                <td><span class="table-category">${escapeHtml(channel.category)}</span></td>
                <td class="table-focus">${escapeHtml(channel.focus || channel.title || channel.category)}</td>
                <td class="table-number">${formatNumber(channel.subscribers)}</td>
                <td>
                  ${channel.lastPostAt
                    ? `<time datetime="${escapeHtml(channel.lastPostAt)}">${escapeHtml(formatDate(channel.lastPostAt, { short: true }))}</time>`
                    : "—"}
                </td>
                <td><span class="status status-${activity.id}">${escapeHtml(activity.label)}</span></td>
                <td class="table-number">${escapeHtml(price)}</td>
                <td class="table-tiers">${escapeHtml(tierRange)}</td>
                <td class="table-number table-growth ${growthClass}">${escapeHtml(growthText)}</td>
              </tr>`;
}

function categoryEntries(channels) {
  const counts = new Map();
  for (const channel of channels) {
    counts.set(channel.category, (counts.get(channel.category) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale));
}

function itemListJsonLd(channels, checkedAt) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl,
        name: "Boosty IT Каталог",
        inLanguage: "ru",
        description: "Публичный каталог русскоязычных IT-каналов с платной подпиской на Boosty.",
      },
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}#catalog`,
        url: siteUrl,
        name: "Русскоязычные IT-каналы на Boosty",
        isPartOf: { "@id": `${siteUrl}#website` },
        dateModified: checkedAt,
        inLanguage: "ru",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: channels.length,
          itemListElement: channels.map((channel, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: channel.name,
            url: `${siteUrl}channels/${encodeURIComponent(safeSlug(channel.slug))}/`,
          })),
        },
      },
      {
        "@type": "Dataset",
        name: "Каталог русскоязычных IT-каналов на Boosty",
        description: "Названия, тематики, публичные счётчики, цены подписки и активность каналов.",
        url: `${repositoryUrl}/tree/main/data`,
        dateModified: checkedAt,
        inLanguage: "ru",
        license: `${repositoryUrl}/blob/main/DATA_LICENSE.md`,
        distribution: {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${repositoryUrl}/raw/main/data/channels.json`,
        },
      },
    ],
  };
}

function channelPage(channel, checkedAt) {
  const slug = safeSlug(channel.slug);
  const canonical = `${siteUrl}channels/${encodeURIComponent(slug)}/`;
  const activity = activityStatus(channel.lastPostAt, checkedAt);
  const summary = channel.summary || channel.title || channel.focus;
  const description = `${channel.name}: ${summary} Подписка от ${formatPrice(channel)}, ${formatNumber(channel.subscribers)} подписчиков.`;
  const tiers = (channel.tiers || []).length
    ? channel.tiers.map((tier) => `
              <li>
                <span>${escapeHtml(tier.name || "Подписка")}</span>
                <strong>${escapeHtml(tierPrice(tier))}</strong>
              </li>`).join("")
    : "<li><span>Тарифы не найдены</span><strong>—</strong></li>";
  const jsonLd = safeJson({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${channel.name} — IT-канал на Boosty`,
    url: canonical,
    description,
    inLanguage: "ru",
    dateModified: checkedAt,
    isPartOf: { "@type": "WebSite", name: "Boosty IT Каталог", url: siteUrl },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl },
        { "@type": "ListItem", position: 2, name: channel.name, item: canonical },
      ],
    },
  });
  const hash = sha256(jsonLd);
  const upgrade = siteUrl.startsWith("https:") ? "upgrade-insecure-requests" : "";

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#092538">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self' 'sha256-${hash}'; style-src 'self'; ${upgrade}">
    <title>${escapeHtml(channel.name)} — ${escapeHtml(channel.category)} | Boosty IT Каталог</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="../../assets/styles.css">
    <meta property="og:type" content="article">
    <meta property="og:locale" content="ru_RU">
    <meta property="og:title" content="${escapeHtml(channel.name)} — Boosty IT Каталог">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(`${siteUrl}assets/og-cover.png`)}">
    <script type="application/ld+json">${jsonLd}</script>
  </head>
  <body class="channel-page-body">
    <header class="channel-page-header">
      <div class="site-header">
        <a class="brand" href="../../">
          <span class="brand-mark" aria-hidden="true">B/IT</span>
          <span>Boosty IT Каталог</span>
        </a>
        <nav class="header-nav"><a href="../../#catalog">Все каналы</a></nav>
      </div>
    </header>
    <main class="channel-page">
      <nav class="breadcrumbs" aria-label="Хлебные крошки">
        <a href="../../">Каталог</a> / ${escapeHtml(channel.name)}
      </nav>
      <article class="channel-detail">
        <span class="card-category">${escapeHtml(channel.category)}</span>
        <h1>${escapeHtml(channel.name)}</h1>
        <section class="channel-summary-block" aria-labelledby="channel-about">
          <h2 id="channel-about">О канале</h2>
          <p class="channel-summary">${escapeHtml(summary)}</p>
          <div class="focus-tags" aria-label="Темы канала">${focusTags(channel.focus)}</div>
        </section>
        <dl class="detail-stats">
          <div><dt>Подписчиков</dt><dd>${formatNumber(channel.subscribers)}</dd></div>
          <div><dt>Постов</dt><dd>${formatNumber(channel.postsCount)}</dd></div>
          <div><dt>Подписка от</dt><dd>${escapeHtml(formatPrice(channel))}</dd></div>
          <div><dt>Активность</dt><dd>${escapeHtml(activity.label)}</dd></div>
        </dl>
        <h2>Уровни подписки</h2>
        <ul class="tier-list">${tiers}</ul>
        <a class="button button-primary" href="${escapeHtml(channel.boostyUrl)}" target="_blank" rel="noopener noreferrer">Перейти на Boosty ↗</a>
        <p class="channel-detail-note">
          Последняя публикация — ${escapeHtml(formatDate(channel.lastPostAt))}<br>
          Данные проверены ${escapeHtml(formatDate(checkedAt))}
          Каталог не связан с Boosty; условия подписки уточняйте у автора.
        </p>
      </article>
    </main>
  </body>
</html>
`;
}

const { meta, channels } = JSON.parse(await fs.readFile(dataPath, "utf8"));
if (!Array.isArray(channels) || channels.length < 200) {
  throw new Error("At least 200 channels are required before building the public catalog.");
}

const checkedAt = meta.checkedAt;
const sortedChannels = [...channels].sort((a, b) =>
  b.subscribers - a.subscribers || a.name.localeCompare(b.name, locale)
);
const categories = categoryEntries(channels);
const activeCount = channels.filter((channel) => {
  const activity = activityStatus(channel.lastPostAt, checkedAt);
  return activity.id === "fresh" || activity.id === "active";
}).length;
const totalSubscribers = channels.reduce((sum, channel) => sum + channel.subscribers, 0);
const medianPrice = median(channels.map(effectivePrice));
const description = `${channels.length} проверенных русскоязычных IT-каналов на Boosty: ИИ, программирование, DevOps, self-hosting, архитектура, безопасность и другие темы.`;
const jsonLd = safeJson(itemListJsonLd(sortedChannels, checkedAt));
const cspHash = sha256(jsonLd);
const categoryOptions = [...categories]
  .sort((a, b) => a[0].localeCompare(b[0], locale))
  .map(([category, count]) => `<option value="${escapeHtml(category)}">${escapeHtml(category)} · ${count}</option>`)
  .join("\n              ");
const categoryChips = categories
  .slice(0, 8)
  .map(([category, count]) => `<button class="topic-chip" type="button" data-category-chip="${escapeHtml(category)}">${escapeHtml(category)} <span aria-label="${count} каналов">· ${count}</span></button>`)
  .join("\n          ");

const template = await fs.readFile(path.join(siteSource, "index.template.html"), "utf8");
const indexHtml = template
  .replaceAll("__SITE_URL__", escapeHtml(siteUrl))
  .replaceAll("__REPOSITORY_URL__", escapeHtml(repositoryUrl))
  .replaceAll("__ISSUE_URL__", escapeHtml(issueUrl))
  .replaceAll("__DESCRIPTION__", escapeHtml(description))
  .replaceAll("__CHECKED_AT__", escapeHtml(checkedAt))
  .replaceAll("__CHECKED_AT_HUMAN__", escapeHtml(formatDate(checkedAt)))
  .replaceAll("__CHANNEL_COUNT__", formatNumber(channels.length))
  .replaceAll("__ACTIVE_COUNT__", formatNumber(activeCount))
  .replaceAll("__MEDIAN_PRICE__", formatNumber(medianPrice))
  .replaceAll("__TOTAL_SUBSCRIBERS__", formatNumber(totalSubscribers))
  .replaceAll("__CATEGORY_OPTIONS__", categoryOptions)
  .replaceAll("__CATEGORY_CHIPS__", categoryChips)
  .replaceAll("__CHANNEL_CARDS__", sortedChannels.map((channel) => channelCard(channel, checkedAt)).join("\n"))
  .replaceAll("__CHANNEL_DETAILS__", sortedChannels.map((channel) => channelDetailTemplate(channel, checkedAt)).join("\n"))
  .replaceAll("__CHANNEL_ROWS__", sortedChannels.map((channel) => channelRow(channel, checkedAt)).join("\n"))
  .replaceAll("__JSON_LD__", jsonLd)
  .replaceAll("__CSP_HASH__", `sha256-${cspHash}`)
  .replaceAll("__CSP_UPGRADE__", siteUrl.startsWith("https:") ? "upgrade-insecure-requests" : "");

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.cp(path.join(siteSource, "assets"), path.join(output, "assets"), { recursive: true });
await Promise.all([
  fs.copyFile(path.join(siteSource, "site.webmanifest"), path.join(output, "site.webmanifest")),
  fs.copyFile(dataPath, path.join(output, "data.json")),
  fs.writeFile(path.join(output, "index.html"), indexHtml),
]);

for (const channel of channels) {
  const directory = path.join(output, "channels", safeSlug(channel.slug));
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, "index.html"), channelPage(channel, checkedAt));
}

const sitemapUrls = [
  { loc: siteUrl, priority: "1.0", changefreq: "weekly" },
  ...channels.map((channel) => ({
    loc: `${siteUrl}channels/${encodeURIComponent(safeSlug(channel.slug))}/`,
    priority: "0.7",
    changefreq: "weekly",
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map((entry) => `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>
    <lastmod>${checkedAt}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`;
const feedItems = [...channels]
  .sort((a, b) => Date.parse(b.lastPostAt || 0) - Date.parse(a.lastPostAt || 0))
  .slice(0, 30)
  .map((channel) => `    <item>
      <title>${escapeHtml(channel.name)} — ${escapeHtml(channel.category)}</title>
      <link>${siteUrl}channels/${encodeURIComponent(safeSlug(channel.slug))}/</link>
      <guid isPermaLink="true">${siteUrl}channels/${encodeURIComponent(safeSlug(channel.slug))}/</guid>
      <description>${escapeHtml(channel.focus)}</description>
      <pubDate>${new Date(channel.lastPostAt || `${checkedAt}T00:00:00Z`).toUTCString()}</pubDate>
    </item>`)
  .join("\n");
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Boosty IT Каталог</title>
    <link>${siteUrl}</link>
    <description>${escapeHtml(description)}</description>
    <language>ru</language>
    <lastBuildDate>${new Date(`${checkedAt}T12:00:00Z`).toUTCString()}</lastBuildDate>
${feedItems}
  </channel>
</rss>
`;
const notFound = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="3; url=${escapeHtml(siteUrl)}"><title>Страница не найдена · Boosty IT Каталог</title>
<link rel="stylesheet" href="${escapeHtml(`${siteUrl}assets/styles.css`)}"></head>
<body class="channel-page-body"><main class="channel-page"><article class="channel-detail">
<p class="eyebrow eyebrow-dark">404</p><h1>Страница не найдена</h1><p class="card-focus">Через несколько секунд вы вернётесь в каталог.</p>
<a class="button button-primary" href="${escapeHtml(siteUrl)}">Открыть каталог</a>
</article></main></body></html>`;

await Promise.all([
  fs.writeFile(path.join(output, "sitemap.xml"), sitemap),
  fs.writeFile(path.join(output, "robots.txt"), robots),
  fs.writeFile(path.join(output, "feed.xml"), feed),
  fs.writeFile(path.join(output, "404.html"), notFound),
  fs.writeFile(path.join(output, ".nojekyll"), ""),
]);

console.log(`Built ${channels.length} channel pages in ${output}`);
