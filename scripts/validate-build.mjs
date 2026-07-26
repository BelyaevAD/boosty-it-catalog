import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "dist");
const catalog = JSON.parse(await fs.readFile(path.join(root, "data", "channels.json"), "utf8"));
const index = await fs.readFile(path.join(output, "index.html"), "utf8");
const sitemap = await fs.readFile(path.join(output, "sitemap.xml"), "utf8");
const robots = await fs.readFile(path.join(output, "robots.txt"), "utf8");

assert.ok(index.includes("<title>Boosty IT Каталог"), "Missing page title.");
assert.ok(index.includes('application/ld+json'), "Missing structured data.");
assert.ok(index.includes(`data-slug=`), "Channel cards were not rendered.");
assert.equal((index.match(/class="channel-card"/g) || []).length, catalog.channels.length, "Rendered card count mismatch.");
assert.ok(!index.includes("__SITE_URL__"), "Unresolved site URL placeholder.");
assert.ok(!index.includes("__CHANNEL_CARDS__"), "Unresolved cards placeholder.");
assert.ok(!index.includes("__CHANNEL_DETAILS__"), "Unresolved channel details placeholder.");
assert.ok(!index.includes("__CHANNEL_ROWS__"), "Unresolved table rows placeholder.");
assert.equal((index.match(/class="channel-row"/g) || []).length, catalog.channels.length, "Rendered table row count mismatch.");
assert.equal((index.match(/<template data-channel-slug=/g) || []).length, catalog.channels.length, "Rendered modal template count mismatch.");
assert.equal((index.match(/class="table-boosty-mini"/g) || []).length, catalog.channels.length, "Inline Boosty link count mismatch.");
assert.equal((index.match(/scope="row" data-label="Канал"/g) || []).length, catalog.channels.length, "Table row headers are missing.");
assert.equal((index.match(/<col class="col-/g) || []).length, 5, "The comparison table must use five compact columns.");
assert.ok(index.includes('class="card-grid" id="channel-grid" hidden'), "Cards must be hidden on initial render.");
assert.ok(index.includes('class="table-shell" id="channel-table-view"'), "Table must be visible on initial render.");
assert.ok(index.includes('id="channel-dialog"'), "Channel details dialog is missing.");
assert.ok(!index.includes('<th scope="col">Boosty</th>'), "Standalone Boosty table column must not be rendered.");
assert.ok(!index.includes("'unsafe-inline'"), "CSP must not allow inline scripts.");
assert.ok(!index.includes("externalLinks"), "External link data leaked into the public page.");
assert.ok(!index.includes("Методика"), "Methodology content leaked into the public page.");
assert.equal((sitemap.match(/<url>/g) || []).length, catalog.channels.length + 1, "Sitemap URL count mismatch.");
assert.ok(robots.includes("Sitemap:"), "robots.txt must reference the sitemap.");

for (const channel of catalog.channels) {
  const page = path.join(output, "channels", channel.slug, "index.html");
  const stat = await fs.stat(page);
  assert.ok(stat.isFile(), `Missing channel page for ${channel.slug}`);
}

console.log(`Validated static site with ${catalog.channels.length} detail pages.`);
