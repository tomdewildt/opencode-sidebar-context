const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCost(dollars: number): string {
  return currency.format(dollars);
}

export function formatPercent(percent: number): string {
  return `${Math.round(percent)}%`;
}

export function formatTokens(count: number): string {
  return count.toLocaleString();
}
