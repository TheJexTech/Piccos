export type StaffActionState = { error: string | null };

export const initialStaffActionState: StaffActionState = { error: null };

export type StaffMember = {
  id: string;
  display_name: string;
  station_id: string | null;
  status: "active" | "inactive";
  joined_at: string;
};
