import type { Database, Json } from "@/bff/core/supabase/database.types";

export type ProfileRecord = Database["public"]["Tables"]["profiles"]["Row"];
export type StudentProfileRecord = Database["public"]["Tables"]["student_profiles"]["Row"];
export type TrainerProfileRecord = Database["public"]["Tables"]["trainer_profiles"]["Row"];
export type StudentTrainerRelationshipRecord =
  Database["public"]["Tables"]["student_trainer_relationships"]["Row"];
export type RelationshipEventRecord =
  Database["public"]["Tables"]["student_trainer_relationship_events"]["Row"];

export type OnboardingRole = "student" | "trainer";

export type UpsertProfileInput = {
  id: string;
  fullName: string;
  email?: string;
};

export type StudentOnboardingInput = {
  fullName: string;
  birthDate?: string;
  sex?: string;
  weightKg?: number;
  heightCm?: number;
  trainingGoal?: string;
  trainingLevel?: string;
  trainingProfile?: string;
};

export type TrainerOnboardingInput = {
  professionalName: string;
  specialties: string[];
  studentCountRange: string;
  workModel: string;
  bio?: string;
};

export type TrainerStudentLinkInput = {
  studentName: string;
  studentEmail: string;
};

export type RoleSelectionInput = {
  role: OnboardingRole;
  fullName?: string;
};

export type UpsertStudentProfileInput = {
  userId: string;
  birthDate?: string;
  sex?: string;
  weightKg?: number;
  heightCm?: number;
  trainingGoal?: string;
  trainingLevel?: string;
  trainingProfile?: string;
  onboardingCompletedAt?: string | null;
};

export type UpsertTrainerProfileInput = {
  userId: string;
  displayName?: string;
  bio?: string;
  specialties?: string[];
  studentCountRange?: string;
  workModel?: string;
  inviteSlug?: string | null;
  activatedAt?: string | null;
};

export type CreateStudentTrainerRelationshipInput = {
  studentUserId: string;
  trainerUserId: string;
  status: StudentTrainerRelationshipRecord["status"];
  source: StudentTrainerRelationshipRecord["source"];
  visibilitySettings?: StudentTrainerRelationshipRecord["visibility_settings"];
  approvedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  billingEligibleFrom?: string | null;
};

/* ─── Relationship event log (append-only) ─── */

export type RelationshipEventType =
  | "invite_slug_generated"
  | "invite_link_opened"
  | "relationship_activated"
  | "relationship_removed_by_trainer"
  | "relationship_left_by_student"
  | "relationship_reactivated";

export type RelationshipEventActorRole = "trainer" | "student" | "system" | "anonymous";

export type RelationshipEventSource = "web" | "mobile" | "invite_link" | "system";

export type AppendRelationshipEventInput = {
  eventType: RelationshipEventType;
  trainerUserId: string;
  studentUserId?: string | null;
  relationshipId?: string | null;
  actorUserId?: string | null;
  actorRole: RelationshipEventActorRole;
  source: RelationshipEventSource;
  occurredAt?: string | null;
  metadata?: Record<string, Json>;
  idempotencyKey?: string | null;
};

export type CurrentUserIdentity = {
  userId: string;
  email?: string;
};

export type PrimaryRole = "student" | "trainer" | null;

export type MeNextStep =
  | "role_selection"
  | "student_onboarding"
  | "trainer_onboarding"
  | "student_home"
  | "trainer_home";

export type StudentStats = {
  assignedWorkoutCount: number;
  completedSessionCount: number;
};

export type MeResponse = {
  user: {
    id: string;
    email?: string;
  };
  profile: ProfileRecord | null;
  studentProfile: StudentProfileRecord | null;
  trainerProfile: TrainerProfileRecord | null;
  relationships: StudentTrainerRelationshipRecord[];
  isStudent: boolean;
  isTrainer: boolean;
  /** Additive flag for future admin UI gating only; real security is ensureAdmin. */
  isAdmin: boolean;
  primaryRole: PrimaryRole;
  studentOnboardingCompleted: boolean;
  trainerOnboardingCompleted: boolean;
  studentStats: StudentStats | null;
  nextStep: MeNextStep;
};

export type TrainerStudentLinkResponse = {
  me: MeResponse;
  student: {
    userId: string;
    fullName: string;
    email: string;
    relationshipStatus: StudentTrainerRelationshipRecord["status"];
  };
};

export type TrainerStudentListItem = {
  userId: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: string;
};

export type TrainerStudentListResponse = {
  students: TrainerStudentListItem[];
};

export type UpdateInviteSlugInput = {
  userId: string;
  inviteSlug: string;
};

export type TrainerPublicProfile = {
  displayName: string;
  specialties: string[];
};

export type AcceptInviteResponse = {
  trainer: TrainerPublicProfile;
  relationshipStatus: string;
};