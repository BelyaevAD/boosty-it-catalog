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
import { buildChannelSummary } from "../scripts/lib/catalog.mjs";

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
