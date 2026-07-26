import {
  DEFAULT_LIMIT,
  clampPrice,
  compareChannels,
  matchesFilters,
  resultLabel,
} from "./catalog-core.js";

const form = document.querySelector("#filters");
const grid = document.querySelector("#channel-grid");
const cards = [...document.querySelectorAll(".channel-card")].map((element) => ({
  element,
  slug: element.dataset.slug,
  name: element.dataset.name,
  category: element.dataset.category,
  activity: element.dataset.activity,
  price: Number(element.dataset.price || 0),
  subscribers: Number(element.dataset.subscribers || 0),
  lastPost: Number(element.dataset.lastPost || 0),
  growth: Number(element.dataset.growth || 0),
  searchText: element.dataset.search || "",
}));
const resultSummary = document.querySelector("#result-summary");
const emptyState = document.querySelector("#empty-state");
const loadMore = document.querySelector("#load-more");
const activeFilters = document.querySelector("#active-filters");
const queryInput = document.querySelector("#query");
const categoryInput = document.querySelector("#category");
const activityInput = document.querySelector("#activity");
const maxPriceInput = document.querySelector("#max-price");
const sortInput = document.querySelector("#sort");
const growthInput = document.querySelector("#growth");
let visibleLimit = DEFAULT_LIMIT;

function readFilters() {
  return {
    query: queryInput.value.slice(0, 100),
    category: categoryInput.value,
    activity: activityInput.value,
    maxPrice: clampPrice(maxPriceInput.value),
    sort: sortInput.value,
    growth: growthInput.checked,
  };
}

function updateUrl(filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.activity) params.set("activity", filters.activity);
  if (filters.maxPrice !== null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort !== "recommended") params.set("sort", filters.sort);
  if (filters.growth) params.set("growth", "1");
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

function renderActiveFilters(filters) {
  const labels = [];
  if (filters.query) labels.push(`Поиск: ${filters.query}`);
  if (filters.category) labels.push(filters.category);
  if (filters.activity) {
    labels.push(activityInput.options[activityInput.selectedIndex].text);
  }
  if (filters.maxPrice !== null) labels.push(`До ${filters.maxPrice.toLocaleString("ru-RU")} ₽`);
  if (filters.growth) labels.push("С ростом");
  activeFilters.textContent = labels.length ? `Активные фильтры: ${labels.join(" · ")}` : "";
}

function applyFilters({ resetLimit = true } = {}) {
  if (resetLimit) visibleLimit = DEFAULT_LIMIT;
  const filters = readFilters();
  const matched = cards
    .filter((channel) => matchesFilters(channel, filters))
    .sort((a, b) => compareChannels(a, b, filters.sort));

  for (const card of cards) card.element.hidden = true;
  for (const [index, card] of matched.entries()) {
    grid.append(card.element);
    card.element.hidden = index >= visibleLimit;
  }

  resultSummary.textContent = `Найдено: ${resultLabel(matched.length)}`;
  emptyState.hidden = matched.length !== 0;
  loadMore.hidden = matched.length <= visibleLimit;
  renderActiveFilters(filters);
  updateUrl(filters);
}

function resetFilters() {
  form.reset();
  visibleLimit = DEFAULT_LIMIT;
  applyFilters();
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  queryInput.value = (params.get("q") || "").slice(0, 100);
  const category = params.get("category") || "";
  if ([...categoryInput.options].some((option) => option.value === category)) {
    categoryInput.value = category;
  }
  const activity = params.get("activity") || "";
  if ([...activityInput.options].some((option) => option.value === activity)) {
    activityInput.value = activity;
  }
  const maxPrice = clampPrice(params.get("maxPrice"));
  maxPriceInput.value = maxPrice === null ? "" : String(maxPrice);
  const sort = params.get("sort") || "recommended";
  if ([...sortInput.options].some((option) => option.value === sort)) {
    sortInput.value = sort;
  }
  growthInput.checked = params.get("growth") === "1";
}

form.addEventListener("input", () => applyFilters());
form.addEventListener("change", () => applyFilters());
form.addEventListener("reset", () => {
  setTimeout(resetFilters, 0);
});
document.querySelectorAll("[data-reset-filters]").forEach((button) => {
  button.addEventListener("click", resetFilters);
});
document.querySelectorAll("[data-category-chip]").forEach((button) => {
  button.addEventListener("click", () => {
    categoryInput.value = button.dataset.categoryChip;
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
    applyFilters();
  });
});
loadMore.addEventListener("click", () => {
  visibleLimit += DEFAULT_LIMIT;
  applyFilters({ resetLimit: false });
});

restoreFromUrl();
applyFilters();
