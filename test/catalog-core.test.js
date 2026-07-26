import test from "node:test";
import assert from "node:assert/strict";
import {
  clampPrice,
  compareChannels,
  matchesFilters,
  normalizeText,
  resultLabel,
} from "../site/assets/catalog-core.js";

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
  assert.equal(clampPrice("999999"), 100000);
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

test("uses Russian plural forms", () => {
  assert.equal(resultLabel(1), "1 канал");
  assert.equal(resultLabel(3), "3 канала");
  assert.equal(resultLabel(12), "12 каналов");
  assert.equal(resultLabel(227), "227 каналов");
});
