import {
  DEFAULT_LIMIT,
  clampPrice,
  compareChannels,
  defaultSortDirection,
  matchesFilters,
  resultLabel,
} from "./catalog-core.js";

const ALLOWED_VIEWS = new Set(["cards", "table"]);
const ALLOWED_DIRECTIONS = new Set(["asc", "desc"]);
const form = document.querySelector("#filters");
const grid = document.querySelector("#channel-grid");
const tableView = document.querySelector("#channel-table-view");
const tableBody = document.querySelector("#channel-table-body");
const tableRows = new Map(
  [...document.querySelectorAll(".channel-row")].map((row) => [row.dataset.slug, row]),
);
const channels = [...document.querySelectorAll(".channel-card")].map((element) => ({
  cardElement: element,
  rowElement: tableRows.get(element.dataset.slug),
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
const loadMoreWrap = document.querySelector(".load-more-wrap");
const activeFilters = document.querySelector("#active-filters");
const queryInput = document.querySelector("#query");
const categoryInput = document.querySelector("#category");
const activityInput = document.querySelector("#activity");
const maxPriceInput = document.querySelector("#max-price");
const sortInput = document.querySelector("#sort");
const growthInput = document.querySelector("#growth");
const mobileFiltersToggle = document.querySelector(".mobile-filters-toggle");
const viewButtons = [...document.querySelectorAll("[data-view]")];
const sortButtons = [...document.querySelectorAll("[data-sort-key]")];
const categoryChips = [...document.querySelectorAll("[data-category-chip]")];
const topicChips = document.querySelector("#popular-topics");
const topicMoreButton = document.querySelector(".topic-more");
const sortAnnouncement = document.querySelector("#table-sort-announcement");
const channelDialog = document.querySelector("#channel-dialog");
const channelDialogContent = document.querySelector("#channel-dialog-content");
const channelTemplates = new Map(
  [...document.querySelectorAll("template[data-channel-slug]")]
    .map((template) => [template.dataset.channelSlug, template]),
);
let visibleLimit = DEFAULT_LIMIT;
let currentView = "table";
let sortDirection = defaultSortDirection(sortInput.value);
let lastDialogTrigger = null;

function readFilters() {
  return {
    query: queryInput.value.slice(0, 100),
    category: categoryInput.value,
    activity: activityInput.value,
    maxPrice: clampPrice(maxPriceInput.value),
    sort: sortInput.value,
    direction: sortDirection,
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
  if (filters.direction !== defaultSortDirection(filters.sort)) {
    params.set("direction", filters.direction);
  }
  if (filters.growth) params.set("growth", "1");
  if (currentView === "cards") params.set("view", "cards");
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

function renderActiveFilters(filters) {
  activeFilters.replaceChildren();
  const addChip = (label, clearFilter, focusTarget) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-chip";
    button.textContent = `${label} ×`;
    button.setAttribute("aria-label", `Убрать фильтр: ${label}`);
    button.addEventListener("click", () => {
      clearFilter();
      applyFilters();
      queueMicrotask(() => focusTarget?.focus());
    });
    activeFilters.append(button);
  };

  if (filters.query) {
    addChip(`Поиск: ${filters.query}`, () => { queryInput.value = ""; }, queryInput);
  }
  if (filters.category) {
    addChip(filters.category, () => { categoryInput.value = ""; }, categoryInput);
  }
  if (filters.activity) {
    const label = activityInput.options[activityInput.selectedIndex].text;
    addChip(label, () => { activityInput.value = ""; }, activityInput);
  }
  if (filters.maxPrice !== null) {
    addChip(
      `До ${filters.maxPrice.toLocaleString("ru-RU")} ₽`,
      () => { maxPriceInput.value = ""; },
      maxPriceInput,
    );
  }
  if (filters.growth) {
    addChip("С ростом аудитории", () => { growthInput.checked = false; }, growthInput);
  }
  if (activeFilters.childElementCount > 1) {
    const clearAll = document.createElement("button");
    clearAll.type = "button";
    clearAll.className = "filter-clear-all";
    clearAll.textContent = "Сбросить все";
    clearAll.addEventListener("click", resetFilters);
    activeFilters.append(clearAll);
  }
  activeFilters.hidden = activeFilters.childElementCount === 0;
}

function updateCategoryChips(category) {
  for (const chip of categoryChips) {
    const isActive = chip.dataset.categoryChip === category;
    chip.classList.toggle("is-active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  }
}

function updateMobileFiltersToggle(filters) {
  if (!mobileFiltersToggle) return;
  const activeCount = [
    filters.category,
    filters.activity,
    filters.maxPrice !== null,
    filters.growth,
  ].filter(Boolean).length;
  const expanded = form.classList.contains("is-expanded");
  mobileFiltersToggle.textContent = expanded
    ? "Скрыть фильтры"
    : activeCount
      ? `Фильтры · ${activeCount}`
      : "Фильтры";
  mobileFiltersToggle.setAttribute("aria-expanded", String(expanded));
}

function updateSortHeaders(filters) {
  const activeButton = sortButtons.find((button) => button.dataset.sortKey === filters.sort);
  for (const button of sortButtons) {
    const column = button.parentElement;
    const isActive = button.dataset.sortKey === filters.sort;
    if (isActive) {
      column.setAttribute("aria-sort", filters.direction === "asc" ? "ascending" : "descending");
    } else {
      column.removeAttribute("aria-sort");
    }
    const indicator = button.querySelector(".sort-indicator");
    if (indicator) {
      indicator.textContent = isActive ? (filters.direction === "asc" ? "↑" : "↓") : "↕";
    }
  }
  if (sortAnnouncement) {
    sortAnnouncement.textContent = activeButton
      ? `Таблица отсортирована: ${activeButton.textContent.replace(/[↕↑↓]/g, "").trim()}, ${
        filters.direction === "asc" ? "по возрастанию" : "по убыванию"
      }.`
      : "Таблица отсортирована по рекомендованному порядку.";
  }
}

function updateViewControls() {
  grid.hidden = currentView !== "cards";
  tableView.hidden = currentView !== "table";
  for (const button of viewButtons) {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function applyFilters({ resetLimit = true } = {}) {
  if (resetLimit) visibleLimit = DEFAULT_LIMIT;
  const filters = readFilters();
  const matched = channels
    .filter((channel) => matchesFilters(channel, filters))
    .sort((a, b) => compareChannels(a, b, filters.sort, filters.direction));

  for (const channel of channels) {
    channel.cardElement.hidden = true;
    if (channel.rowElement) channel.rowElement.hidden = true;
  }
  for (const [index, channel] of matched.entries()) {
    grid.append(channel.cardElement);
    channel.cardElement.hidden = index >= visibleLimit;
    if (channel.rowElement) {
      tableBody.append(channel.rowElement);
      channel.rowElement.hidden = index >= visibleLimit;
    }
  }

  resultSummary.textContent = `Найдено: ${resultLabel(matched.length)}`;
  emptyState.hidden = matched.length !== 0;
  const remaining = Math.max(0, matched.length - visibleLimit);
  loadMore.textContent = remaining
    ? `Показать ещё ${Math.min(DEFAULT_LIMIT, remaining).toLocaleString("ru-RU")}`
    : "Показать ещё";
  loadMore.hidden = remaining === 0;
  loadMoreWrap.hidden = remaining === 0;
  renderActiveFilters(filters);
  updateCategoryChips(filters.category);
  updateMobileFiltersToggle(filters);
  updateSortHeaders(filters);
  updateViewControls();
  updateUrl(filters);
}

function setView(view) {
  currentView = ALLOWED_VIEWS.has(view) ? view : "table";
  applyFilters({ resetLimit: false });
}

function resetFilters() {
  form.reset();
}

function openChannelDialog(slug, trigger) {
  const template = channelTemplates.get(slug);
  if (!template || !channelDialog?.showModal) return false;
  const fragment = template.content.cloneNode(true);
  const heading = fragment.querySelector("h2");
  channelDialogContent.replaceChildren(fragment);
  if (heading?.id) channelDialog.setAttribute("aria-labelledby", heading.id);
  lastDialogTrigger = trigger;
  channelDialog.showModal();
  channelDialog.querySelector("[data-close-dialog]")?.focus();
  return true;
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
  const direction = params.get("direction");
  sortDirection = ALLOWED_DIRECTIONS.has(direction)
    ? direction
    : defaultSortDirection(sortInput.value);
  growthInput.checked = params.get("growth") === "1";
  currentView = ALLOWED_VIEWS.has(params.get("view")) ? params.get("view") : "table";
}

form.addEventListener("input", (event) => {
  if (event.target !== sortInput) applyFilters();
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
});
form.addEventListener("change", (event) => {
  if (event.target === sortInput) {
    sortDirection = defaultSortDirection(sortInput.value);
  }
  applyFilters();
});
form.addEventListener("reset", () => {
  setTimeout(() => {
    sortDirection = defaultSortDirection(sortInput.value);
    visibleLimit = DEFAULT_LIMIT;
    applyFilters();
  }, 0);
});
document.querySelectorAll("[data-reset-filters]").forEach((button) => {
  button.addEventListener("click", resetFilters);
});
categoryChips.forEach((button) => {
  button.addEventListener("click", () => {
    categoryInput.value = categoryInput.value === button.dataset.categoryChip
      ? ""
      : button.dataset.categoryChip;
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
    applyFilters();
  });
});
topicMoreButton?.addEventListener("click", () => {
  const expanded = !topicChips.classList.contains("is-expanded");
  topicChips.classList.toggle("is-expanded", expanded);
  topicMoreButton.setAttribute("aria-expanded", String(expanded));
  topicMoreButton.textContent = expanded ? "Свернуть" : "Ещё темы";
});
mobileFiltersToggle?.addEventListener("click", () => {
  form.classList.toggle("is-expanded");
  updateMobileFiltersToggle(readFilters());
});
for (const button of viewButtons) {
  button.addEventListener("click", () => setView(button.dataset.view));
}
for (const button of sortButtons) {
  button.addEventListener("click", () => {
    const sortKey = button.dataset.sortKey;
    const isAllowed = [...sortInput.options].some((option) => option.value === sortKey);
    if (!isAllowed) return;
    if (sortInput.value === sortKey) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortInput.value = sortKey;
      sortDirection = defaultSortDirection(sortKey);
    }
    applyFilters({ resetLimit: false });
  });
}
loadMore.addEventListener("click", () => {
  visibleLimit += DEFAULT_LIMIT;
  applyFilters({ resetLimit: false });
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-open-channel]");
  if (!trigger) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (openChannelDialog(trigger.dataset.openChannel, trigger)) {
    event.preventDefault();
  }
});
document.querySelector("[data-close-dialog]")?.addEventListener("click", () => {
  channelDialog.close();
});
channelDialog?.addEventListener("click", (event) => {
  if (event.target === channelDialog) channelDialog.close();
});
channelDialog?.addEventListener("close", () => {
  channelDialogContent.replaceChildren();
  lastDialogTrigger?.focus();
  lastDialogTrigger = null;
});

restoreFromUrl();
applyFilters();
