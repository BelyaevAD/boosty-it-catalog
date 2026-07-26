import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist");
const catalog = JSON.parse(await fs.readFile(path.join(root, "data", "channels.json"), "utf8"));
const index = await fs.readFile(path.join(output, "index.html"), "utf8");
const sitemap = await fs.readFile(path.join(output, "sitemap.xml"), "utf8");
const robots = await fs.readFile(path.join(output, "robots.txt"), "utf8");
const icons = await fs.readFile(path.join(output, "assets", "icons.svg"), "utf8");

assert.ok(index.includes("<title>Boosty IT Каталог"), "Missing page title.");
assert.ok(index.includes('application/ld+json'), "Missing structured data.");
assert.ok(index.includes(`data-slug=`), "Channel cards were not rendered.");
assert.equal((index.match(/class="channel-card"/g) || []).length, catalog.channels.length, "Rendered card count mismatch.");
assert.equal((index.match(/data-topics="/g) || []).length, catalog.channels.length, "Multi-topic card data mismatch.");
assert.ok(!index.includes("__SITE_URL__"), "Unresolved site URL placeholder.");
assert.ok(!index.includes("__CHANNEL_CARDS__"), "Unresolved cards placeholder.");
assert.ok(!index.includes("__CHANNEL_DETAILS__"), "Unresolved channel details placeholder.");
assert.ok(!index.includes("__CHANNEL_ROWS__"), "Unresolved table rows placeholder.");
assert.ok(!index.includes("__ASSET_VERSION__"), "Unresolved asset version placeholder.");
assert.match(index, /assets\/app\.js\?v=[a-f0-9]{12}/u, "Main script must be cache-versioned.");
assert.match(index, /assets\/icons\.svg\?v=[a-f0-9]{12}#icon-github/u, "Icon sprite must be cache-versioned.");
const builtApp = await fs.readFile(path.join(output, "assets", "app.js"), "utf8");
assert.match(
  builtApp,
  /catalog-core\.js\?v=[a-f0-9]{12}/u,
  "Core module import must be cache-versioned.",
);
assert.equal((index.match(/class="channel-row"/g) || []).length, catalog.channels.length, "Rendered table row count mismatch.");
assert.equal((index.match(/<template data-channel-slug=/g) || []).length, catalog.channels.length, "Rendered modal template count mismatch.");
assert.equal((index.match(/class="table-boosty-mini"/g) || []).length, catalog.channels.length, "Inline Boosty link count mismatch.");
const multiTopicCount = catalog.channels.filter((channel) => channel.topics.length > 1).length;
assert.equal((index.match(/class="topic-extra"/g) || []).length, multiTopicCount * 3, "Secondary topic badges mismatch.");
assert.equal(
  (index.match(/<span class="sr-only">\. Также:/g) || []).length,
  multiTopicCount * 3,
  "Secondary topic badges must include accessible text.",
);
assert.equal((index.match(/scope="row" data-label="Канал"/g) || []).length, catalog.channels.length, "Table row headers are missing.");
assert.equal((index.match(/<col class="col-/g) || []).length, 5, "The comparison table must use five compact columns.");
assert.ok(index.includes('class="card-grid" id="channel-grid" hidden'), "Cards must be hidden on initial render.");
assert.ok(index.includes('class="table-shell" id="channel-table-view"'), "Table must be visible on initial render.");
assert.ok(index.includes('id="channel-dialog"'), "Channel details dialog is missing.");
assert.ok(index.includes('class="github-support" id="support"'), "GitHub support callout is missing.");
assert.ok(index.includes("Поставить звезду"), "GitHub star call to action is missing.");
assert.ok(index.includes('class="github-widget-header"'), "Header star widget is missing.");
assert.ok(
  index.includes("https://ghbtns.com/github-btn.html?user=BelyaevAD&amp;repo=boosty-it-catalog&amp;type=star&amp;count=true&amp;size=large"),
  "The standard GitHub star widget is missing or misconfigured.",
);
assert.ok(
  index.includes("frame-src https://ghbtns.com/github-btn.html"),
  "CSP must allow only the selected GitHub widget document.",
);
assert.match(
  index,
  /<iframe\b(?=[^>]*\bsrc="https:\/\/ghbtns\.com\/github-btn\.html\?)(?=[^>]*\bsandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox")(?=[^>]*\breferrerpolicy="no-referrer")(?=[^>]*\bcredentialless)[^>]*>/iu,
  "The GitHub widget must be isolated and referrer-free.",
);
assert.equal((index.match(/<iframe\b/giu) || []).length, 1, "Only one audited third-party iframe is allowed.");
assert.ok(icons.includes('id="icon-star"'), "Star icon is missing from the local sprite.");
assert.ok(icons.includes('id="icon-github"'), "GitHub mark is missing from the local sprite.");
assert.ok(icons.includes('id="icon-grid"'), "Grid icon is missing from the local sprite.");
assert.ok(icons.includes('id="icon-table"'), "Table icon is missing from the local sprite.");
assert.ok(!index.includes('<th scope="col">Boosty</th>'), "Standalone Boosty table column must not be rendered.");
assert.ok(!index.includes("'unsafe-inline'"), "CSP must not allow inline scripts.");
assert.ok(!/<script\b[^>]+src=["']https?:\/\//iu.test(index), "Remote scripts must not be embedded in the parent page.");
assert.ok(!index.includes("externalLinks"), "External link data leaked into the public page.");
assert.ok(!index.includes("Методика"), "Methodology content leaked into the public page.");
assert.equal((sitemap.match(/<url>/g) || []).length, catalog.channels.length + 1, "Sitemap URL count mismatch.");
assert.ok(robots.includes("Sitemap:"), "robots.txt must reference the sitemap.");

for (const channel of catalog.channels) {
  const page = path.join(output, "channels", channel.slug, "index.html");
  const stat = await fs.stat(page);
  assert.ok(stat.isFile(), `Missing channel page for ${channel.slug}`);
}

for (const link of index.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/giu)) {
  assert.match(link[0], /\brel="[^"]*\bnoopener\b[^"]*"/iu, "External links must use noopener.");
  assert.match(link[0], /\brel="[^"]*\bnoreferrer\b[^"]*"/iu, "External links must use noreferrer.");
}

for (const icon of index.matchAll(/<svg\b[^>]*class="[^"]*\bicon\b[^"]*"[^>]*>/giu)) {
  assert.match(icon[0], /\baria-hidden="true"/iu, "Decorative interface icons must be hidden from assistive technology.");
  assert.match(icon[0], /\bfocusable="false"/iu, "Decorative interface icons must not receive focus.");
}

console.log(`Validated static site with ${catalog.channels.length} detail pages.`);
