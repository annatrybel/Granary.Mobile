export interface UserProfileDto {
  id: string;
  userName?: string;
  name?: string;
  email: string;
  avatarUrl?: string | null;
  darkMode?: boolean;
  language?: string;
  dietPreference?: string;
  expiryNotifications?: boolean;
}

export interface UpdateProfileResponseDto {
  avatarUrl?: string | null;
}

export interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  colorBg?: string;
  isOwner?: boolean;
}