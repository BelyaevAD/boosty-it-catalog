export const DEFAULT_LIMIT = 24;
export const MAX_PRICE = 500_000;
export const DEFAULT_SORT_DIRECTIONS = Object.freeze({
  recommended: "desc",
  subscribers: "desc",
  recent: "desc",
  activity: "desc",
  price: "asc",
  name: "asc",
  category: "asc",
  growth: "desc",
});

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ")
    .trim();
}

export function clampPrice(value) {
  if (value === "" || value === null || value === undefined) return null;
  const price = Number(value);
  if (!Number.isFinite(price)) return null;
  return Math.min(MAX_PRICE, Math.max(0, Math.round(price)));
}

export function matchesFilters(channel, filters) {
  const query = normalizeText(filters.query);
  if (query && !normalizeText(channel.searchText).includes(query)) return false;
  if (filters.category && channel.category !== filters.category) return false;
  if (filters.activity && channel.activity !== filters.activity) return false;
  const maxPrice = clampPrice(filters.maxPrice);
  if (maxPrice !== null && channel.price > maxPrice) return false;
  if (filters.growth && channel.growth <= 0) return false;
  return true;
}

export function defaultSortDirection(sort) {
  return DEFAULT_SORT_DIRECTIONS[sort] || "asc";
}

export function compareChannels(a, b, sort = "recommended", direction = defaultSortDirection(sort)) {
  let comparison;
  if (sort === "subscribers") {
    comparison = b.subscribers - a.subscribers || a.name.localeCompare(b.name, "ru");
  } else if (sort === "recent") {
    comparison = b.lastPost - a.lastPost || b.subscribers - a.subscribers;
  } else if (sort === "activity") {
    const activityWeight = { fresh: 4, active: 3, rare: 2, archive: 1, unknown: 0 };
    comparison = (activityWeight[b.activity] || 0) - (activityWeight[a.activity] || 0) ||
      b.lastPost - a.lastPost;
  } else if (sort === "price") {
    comparison = a.price - b.price || b.subscribers - a.subscribers;
  } else if (sort === "name") {
    comparison = a.name.localeCompare(b.name, "ru");
  } else if (sort === "category") {
    comparison = a.category.localeCompare(b.category, "ru") || a.name.localeCompare(b.name, "ru");
  } else if (sort === "growth") {
    comparison = b.growth - a.growth || b.subscribers - a.subscribers;
  } else {
    const activityWeight = { fresh: 4, active: 3, rare: 2, archive: 1, unknown: 0 };
    comparison = (
      (activityWeight[b.activity] || 0) - (activityWeight[a.activity] || 0) ||
      Math.log10(b.subscribers + 1) - Math.log10(a.subscribers + 1) ||
      a.price - b.price ||
      a.name.localeCompare(b.name, "ru")
    );
  }
  return direction === defaultSortDirection(sort) ? comparison : -comparison;
}

export function resultLabel(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun = lastTwo >= 11 && lastTwo <= 14
    ? "каналов"
    : last === 1
      ? "канал"
      : last >= 2 && last <= 4
        ? "канала"
        : "каналов";
  return `${count.toLocaleString("ru-RU")} ${noun}`;
}
