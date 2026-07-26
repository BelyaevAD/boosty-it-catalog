import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicCatalog = JSON.parse(await fs.readFile(path.join(root, "data", "channels.json"), "utf8"));
const rawCatalog = JSON.parse(await fs.readFile(path.join(root, "data", "raw", "boosty-candidates.json"), "utf8"));
const { meta, channels } = publicCatalog;

assert.equal(meta.schemaVersion, 1, "Unsupported public data schema.");
assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(meta.checkedAt), "checkedAt must be an ISO date.");
assert.ok(Array.isArray(channels), "channels must be an array.");
assert.ok(channels.length >= 200, "The public catalog must contain at least 200 channels.");
assert.equal(meta.channelCount, channels.length, "meta.channelCount must match channels.length.");

const slugs = new Set();
const urls = new Set();
for (const channel of channels) {
  assert.match(channel.slug, /^[a-z0-9_.-]{1,120}$/, `Unsafe slug: ${channel.slug}`);
  assert.ok(!slugs.has(channel.slug), `Duplicate slug: ${channel.slug}`);
  slugs.add(channel.slug);
  assert.equal(channel.boostyUrl, `https://boosty.to/${channel.slug}`, `Unexpected Boosty URL for ${channel.slug}`);
  assert.ok(!urls.has(channel.boostyUrl), `Duplicate URL: ${channel.boostyUrl}`);
  urls.add(channel.boostyUrl);
  assert.ok(channel.name && channel.name.length <= 180, `Invalid name for ${channel.slug}`);
  assert.ok(channel.category, `Missing category for ${channel.slug}`);
  assert.ok(channel.focus, `Missing focus for ${channel.slug}`);
  assert.ok(Number.isInteger(channel.subscribers) && channel.subscribers >= 0, `Invalid subscribers for ${channel.slug}`);
  assert.ok(Number.isInteger(channel.postsCount) && channel.postsCount > 0, `Invalid posts count for ${channel.slug}`);
  assert.ok(Number.isFinite(channel.minPriceRub) && channel.minPriceRub > 0, `Missing paid tier for ${channel.slug}`);
  assert.ok(Array.isArray(channel.tiers) && channel.tiers.length > 0, `Missing tiers for ${channel.slug}`);
  assert.ok(!Object.hasOwn(channel, "externalLinks"), `External links must not be published for ${channel.slug}`);
  assert.ok(!Object.hasOwn(channel, "description"), `Raw descriptions must not be published for ${channel.slug}`);
  assert.ok(!Object.hasOwn(channel, "discoveryQueries"), `Discovery methodology must not be published for ${channel.slug}`);
  if (channel.lastPostAt) {
    assert.ok(Number.isFinite(Date.parse(channel.lastPostAt)), `Invalid lastPostAt for ${channel.slug}`);
  }
}

assert.equal(rawCatalog.meta.schemaVersion, 1, "Unsupported raw data schema.");
assert.ok(rawCatalog.candidates.length >= channels.length, "Raw candidate list cannot be smaller than public catalog.");
assert.equal(rawCatalog.meta.candidateCount, rawCatalog.candidates.length, "Raw candidate count mismatch.");
const rawSlugs = new Set(rawCatalog.candidates.map((candidate) => candidate.slug));
for (const slug of slugs) {
  assert.ok(rawSlugs.has(slug), `Published channel missing from raw list: ${slug}`);
}

console.log(`Validated ${channels.length} public channels and ${rawCatalog.candidates.length} raw candidates.`);
