// Small curated list rather than a full IANA timezone picker library —
// V1 targets Nigerian barber shops, with a few neighboring zones for
// early cross-border users.
export const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "UTC",
];

export const NIGERIA_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

// Structured as {value, label} rather than a bare string array so more
// countries can be appended later without changing how the field renders —
// Nigeria is the only option for V1's launch market.
export const COUNTRIES = [{ value: "Nigeria", label: "Nigeria" }];
