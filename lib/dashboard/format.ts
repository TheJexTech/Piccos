// businesses.currency is free text (M3's setup form doesn't restrict it
// to real ISO codes), so Intl.NumberFormat can throw for an invalid
// value — fall back to a plain number rather than crashing the page.
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}
