import type {
  AppendRelationshipEventInput,
  CreateStudentTrainerRelationshipInput,
  ProfileRecord,
  RelationshipEventRecord,
  StudentProfileRecord,
  StudentTrainerRelationshipRecord,
  TrainerProfileRecord,
  UpsertProfileInput,
  UpsertStudentProfileInput,
  UpsertTrainerProfileInput,
  UpdateInviteSlugInput,
} from "@/bff/modules/profile/types";

export interface IProfileRepository {
  findProfileByUserId(userId: string): Promise<ProfileRecord | null>;
  findProfilesByEmail(email: string): Promise<ProfileRecord[]>;
  findStudentProfileByUserId(userId: string): Promise<StudentProfileRecord | null>;
  findTrainerProfileByUserId(userId: string): Promise<TrainerProfileRecord | null>;
  findRelationshipsByUserId(userId: string): Promise<StudentTrainerRelationshipRecord[]>;
  countAssignedWorkoutsForStudent(studentUserId: string): Promise<number>;
  countCompletedSessionsForStudent(studentUserId: string): Promise<number>;
  /**
   * Counts active+pending student_workouts assigned BY this trainer, grouped by
   * student. Returns a map keyed by student_user_id (missing key = 0 workouts).
   */
  countActiveWorkoutsByTrainerForStudents(
    trainerUserId: string,
    studentUserIds: string[],
  ): Promise<Map<string, number>>;
  findStudentProfilesForTrainer(
    trainerUserId: string,
  ): Promise<
    Array<{
      relationship: StudentTrainerRelationshipRecord;
      profile: ProfileRecord | null;
    }>
  >;
  findOpenRelationshipByPair(
    studentUserId: string,
    trainerUserId: string,
  ): Promise<StudentTrainerRelationshipRecord | null>;
  /**
   * Latest relationship for a pair regardless of status (incl. 'ended').
   * Used to decide between reactivating an ended row vs. creating a new one.
   */
  findLatestRelationshipByPair(
    studentUserId: string,
    trainerUserId: string,
  ): Promise<StudentTrainerRelationshipRecord | null>;
  upsertProfile(input: UpsertProfileInput): Promise<void>;
  upsertStudentProfile(input: UpsertStudentProfileInput): Promise<void>;
  upsertTrainerProfile(input: UpsertTrainerProfileInput): Promise<void>;
  createStudentTrainerRelationship(
    input: CreateStudentTrainerRelationshipInput,
  ): Promise<StudentTrainerRelationshipRecord>;
  /**
   * Ends an active relationship (status='ended', ended_at=now). No physical delete.
   * Scoped to status='active' so a double call is a safe no-op.
   */
  endRelationshipById(relationshipId: string): Promise<void>;
  /**
   * Reactivates an ended relationship in place (status='active', ended_at=null,
   * started_at/approved_at refreshed). Scoped to status='ended'; returns the
   * updated row, or null if no ended row matched (safe no-op under races).
   */
  reactivateRelationshipById(
    relationshipId: string,
  ): Promise<StudentTrainerRelationshipRecord | null>;
  findTrainerByInviteSlug(
    inviteSlug: string,
  ): Promise<TrainerProfileRecord | null>;
  updateInviteSlug(input: UpdateInviteSlugInput): Promise<void>;
  /**
   * Append-only: inserts a single relationship lifecycle event.
   * Not wired into any flow yet — foundation for future instrumentation.
   */
  appendRelationshipEvent(
    input: AppendRelationshipEventInput,
  ): Promise<RelationshipEventRecord>;
}