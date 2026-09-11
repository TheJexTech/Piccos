export type StationActionState = { error: string | null };

export const initialStationActionState: StationActionState = { error: null };

export type Station = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive" | "maintenance";
};
