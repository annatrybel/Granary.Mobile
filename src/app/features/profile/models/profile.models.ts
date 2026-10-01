export interface UserProfileDto {
  id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  householdMembersCount?: number;
  dietPreference?: string;
  language?: string;
  unitSystem?: string;
  expiryNotifications?: boolean;
  darkMode?: boolean;
}

export interface HouseholdMember {
  initials: string;
  colorBg: string;
}