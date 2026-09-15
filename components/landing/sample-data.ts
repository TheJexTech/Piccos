// Fictional sample data for the marketing site's product showcases only.
// Nothing here is a real query or a real business's numbers — this page
// is public and unauthenticated, so it can never read real Supabase data.
// Every figure exists purely to make the UI mockups readable.

export const sampleOutlets = [
  { id: "vi", name: "Victoria Island" },
  { id: "lekki", name: "Lekki Phase 1" },
  { id: "ikeja", name: "Ikeja" },
];

export const sampleMetrics = {
  totalRevenue: "₦482,500",
  serviceRevenue: "₦398,000",
  productSales: "₦84,500",
  estimatedProfit: "₦311,200",
};

export const sampleTrend = [
  { label: "1", value: 18 },
  { label: "2", value: 22 },
  { label: "3", value: 15 },
  { label: "4", value: 28 },
  { label: "5", value: 31 },
  { label: "6", value: 24 },
  { label: "7", value: 35 },
  { label: "8", value: 29 },
  { label: "9", value: 40 },
  { label: "10", value: 33 },
  { label: "11", value: 45 },
  { label: "12", value: 38 },
  { label: "13", value: 50 },
  { label: "14", value: 42 },
];

export const sampleStaff = [
  { name: "Tunde A.", total: 128000 },
  { name: "Chidi O.", total: 96500 },
  { name: "Femi K.", total: 84000 },
  { name: "Amaka N.", total: 71500 },
];

export const sampleServices = [
  { label: "Skin Fade", total: 142000 },
  { label: "Beard Trim", total: 88500 },
  { label: "Full Grooming", total: 76000 },
  { label: "Kids Cut", total: 41500 },
];

export const sampleProducts = [
  { name: "Pomade — Matte", stock: 42, status: "active" as const },
  { name: "Beard Oil", stock: 18, status: "active" as const },
  { name: "Clipper Blades", stock: 6, status: "active" as const },
  { name: "Shampoo", stock: 0, status: "inactive" as const },
];

export const sampleExpenseBreakdown = [
  { label: "Rent", total: 65000 },
  { label: "Supplies", total: 28500 },
  { label: "Utilities", total: 19000 },
];
