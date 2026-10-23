export type AdminUserRole = 'owner' | 'member' | 'individual';
export type AdminUserStatus = 'active' | 'blocked';

export interface AdminUser {
  id: string;
  initials: string;
  fullName: string;
  email: string;
  householdName: string | null;
  householdMembersCount: number;
  role: AdminUserRole;
  pantryItemsCount: number | null; 
  registrationDate: string;
  status: AdminUserStatus;
}

export interface AdminUserKpis {
  totalUsers: number;
  monthlyGrowth: number;
  totalHouseholds: number;
  avgMembersPerHousehold: number;
  activePantries: number;
  activityPercentage: number;
  blockedAccounts: number;
}