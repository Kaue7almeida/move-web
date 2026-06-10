export interface IAdminRepository {
  countTrainerProfiles(): Promise<number>;
  countInternalTrainerProfiles(): Promise<number>;
  countStudentProfiles(): Promise<number>;
  countRelationshipsByStatus(status: string): Promise<number>;
  countDistinctActiveStudents(): Promise<number>;
  countEventsSince(sinceIso: string): Promise<number>;
  countEventsByTypeSince(sinceIso: string): Promise<Record<string, number>>;
  countEventsOfTypeSince(eventType: string, sinceIso: string): Promise<number>;
  countAssignedStudentWorkouts(): Promise<number>;
  countCompletedWorkoutSessions(sinceIso?: string): Promise<number>;
  countCompletedScans(): Promise<number>;
  countScansSince(sinceIso: string): Promise<number>;
  countHumanChatMessages(sinceIso?: string): Promise<number>;
  countWaitingForTrainerConversations(): Promise<number>;
  listActiveRelationships(): Promise<
    Array<{
      student_user_id: string;
      trainer_user_id: string;
      started_at: string | null;
    }>
  >;
  listAssignedStudentWorkoutRefs(): Promise<
    Array<{ student_user_id: string; trainer_user_id: string }>
  >;
  listStudentIdsWithCompletedSessionsSince(sinceIso: string): Promise<string[]>;
  listLastCompletedSessionAtForStudents(
    studentUserIds: string[],
  ): Promise<Array<{ student_user_id: string; completed_at: string | null }>>;
  listTrainerUserIdsWithActiveTemplates(): Promise<string[]>;
  listTrainers(): Promise<
    Array<{
      user_id: string;
      display_name: string | null;
      activated_at: string | null;
      is_internal_move_trainer: boolean;
    }>
  >;
  listProfileEmailsByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; email: string | null }>>;
  listTrainerRelationshipStatuses(): Promise<
    Array<{ trainer_user_id: string; status: string }>
  >;
  findTrainerProfileById(userId: string): Promise<{
    user_id: string;
    display_name: string | null;
    activated_at: string | null;
    is_internal_move_trainer: boolean;
  } | null>;
  listProfilesByIds(
    userIds: string[],
  ): Promise<Array<{ id: string; full_name: string | null; email: string | null }>>;
  listRelationshipsForTrainer(trainerUserId: string): Promise<
    Array<{
      student_user_id: string;
      status: string;
      started_at: string | null;
      ended_at: string | null;
    }>
  >;
  listRecentEventsForTrainer(
    trainerUserId: string,
    limit: number,
  ): Promise<
    Array<{
      event_type: string;
      occurred_at: string;
      actor_role: string;
      source: string;
      student_user_id: string | null;
    }>
  >;
  listAllScanRecords(): Promise<
    Array<{
      id: string;
      student_user_id: string;
      status: string;
      allowance_type: string;
      created_at: string;
      processed_at: string | null;
      body_fat_percent: number | null;
      quality_overall: string | null;
    }>
  >;
}
