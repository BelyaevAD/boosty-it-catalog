import fs from "node:fs/promises";
import path from "node:path";
import { toPublicChannel } from "./lib/catalog.mjs";

const root = path.resolve(import.meta.dirname, "..");
const researchPath = path.join(root, "work", "boosty_expanded_research.json");
const allPath = path.join(root, "work", "boosty_expanded_all.json");
const checkedAt = "2026-07-26";

const [researchRaw, allRaw] = await Promise.all([
  fs.readFile(researchPath, "utf8"),
  fs.readFile(allPath, "utf8"),
]);
const research = JSON.parse(researchRaw);
const all = JSON.parse(allRaw);

const channels = research
  .map(toPublicChannel)
  .sort((a, b) => a.name.localeCompare(b.name, "ru") || a.slug.localeCompare(b.slug));

const candidates = all
  .map((row) => ({
    slug: String(row.slug).toLowerCase(),
    name: String(row.name || row.slug).slice(0, 180),
    boostyUrl: `https://boosty.to/${String(row.slug).toLowerCase()}`,
    discoverySource: String(row.discoverySource || "Первичное исследование"),
    discoveryQueries: [...new Set((row.discoveryQueries || []).map(String))].sort((a, b) => a.localeCompare(b, "ru")),
    reviewStatus: row.qualifies
      ? "published"
      : row.fetchError
        ? "fetch-error"
        : row.manualExcluded
          ? "excluded"
          : "unqualified",
    fetchError: row.fetchError || null,
    firstSeenAt: checkedAt,
    lastCheckedAt: checkedAt,
  }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

const meta = {
  schemaVersion: 1,
  title: "Русскоязычные IT-каналы на Boosty",
  checkedAt,
  channelCount: channels.length,
  generatedBy: "Первичное исследование каталога Boosty",
};

const history = {
  schemaVersion: 1,
  checkedAt,
  channels: channels.map((channel) => ({
    slug: channel.slug,
    subscribers: channel.subscribers,
    minPriceRub: channel.minPriceRub,
    minPromoPriceRub: channel.minPromoPriceRub,
    lastPostAt: channel.lastPostAt,
  })),
};

await fs.mkdir(path.join(root, "data", "raw"), { recursive: true });
await fs.mkdir(path.join(root, "data", "history"), { recursive: true });
await Promise.all([
  fs.writeFile(
    path.join(root, "data", "channels.json"),
    `${JSON.stringify({ meta, channels }, null, 2)}\n`,
  ),
  fs.writeFile(
    path.join(root, "data", "raw", "boosty-candidates.json"),
    `${JSON.stringify({
      meta: {
        schemaVersion: 1,
        checkedAt,
        candidateCount: candidates.length,
        note: "Полный список найденных кандидатов до окончательной тематической фильтрации.",
      },
      candidates,
    }, null, 2)}\n`,
  ),
  fs.writeFile(
    path.join(root, "data", "history", `${checkedAt}.json`),
    `${JSON.stringify(history, null, 2)}\n`,
  ),
]);

console.log(`Prepared ${channels.length} public channels and ${candidates.length} raw candidates.`);
