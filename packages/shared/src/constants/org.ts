export const ORG_ROLES = ["ADMIN", "PUBLISHER", "MEMBER"] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  ADMIN: "Admin",
  PUBLISHER: "Publisher",
  MEMBER: "Member",
};

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  ADMIN: "Full control — manage members, settings, and skills",
  PUBLISHER: "Can publish and manage org skills",
  MEMBER: "Can view org skills and install them",
};

export const ORG_LIMITS = {
  MAX_MEMBERS: 500,
  MAX_PENDING_INVITES: 100,
  INVITE_EXPIRY_DAYS: 7,
  MAX_TEMPLATES: 50,
} as const;
