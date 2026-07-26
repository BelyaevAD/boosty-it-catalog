export const DEFAULT_LIMIT = 24;

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
  return Math.min(100_000, Math.max(0, Math.round(price)));
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

export function compareChannels(a, b, sort = "recommended") {
  if (sort === "subscribers") {
    return b.subscribers - a.subscribers || a.name.localeCompare(b.name, "ru");
  }
  if (sort === "recent") {
    return b.lastPost - a.lastPost || b.subscribers - a.subscribers;
  }
  if (sort === "price") {
    return a.price - b.price || b.subscribers - a.subscribers;
  }
  if (sort === "name") {
    return a.name.localeCompare(b.name, "ru");
  }
  const activityWeight = { fresh: 4, active: 3, rare: 2, archive: 1, unknown: 0 };
  return (
    (activityWeight[b.activity] || 0) - (activityWeight[a.activity] || 0) ||
    Math.log10(b.subscribers + 1) - Math.log10(a.subscribers + 1) ||
    a.price - b.price ||
    a.name.localeCompare(b.name, "ru")
  );
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
