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

  /* ── Lista global de alunos (P1) ── */

  /** Todos os user_ids que são alunos (roster, proporcional ao nº de usuários). */
  listStudentUserIds(): Promise<string[]>;

  /**
   * Página de perfis (já restrita ao conjunto de alunos permitido) com busca por
   * nome/e-mail, ordenação e paginação feitas no banco. Retorna a página e o
   * total filtrado (count exato) numa única consulta.
   */
  listStudentProfilePage(params: {
    allowedIds: string[];
    search: string | null;
    sort: "newest" | "name";
    from: number;
    to: number;
  }): Promise<{
    rows: Array<{
      id: string;
      full_name: string | null;
      email: string | null;
      created_at: string;
    }>;
    total: number;
  }>;

  /** Onboarding dos alunos da página (batch por ids). */
  listStudentOnboardingByIds(
    studentUserIds: string[],
  ): Promise<Array<{ user_id: string; onboarding_completed_at: string | null }>>;

  /** Refs de treinos ativos (pending/active) apenas dos alunos informados. */
  listActiveWorkoutStudentIdsForStudents(studentUserIds: string[]): Promise<string[]>;

  /** Sessões concluídas (desc) apenas dos alunos informados; para count + última. */
  listCompletedSessionRefsForStudents(
    studentUserIds: string[],
  ): Promise<Array<{ student_user_id: string; completed_at: string | null }>>;

  /** display_name dos personais informados (batch por ids). */
  listTrainerProfilesByIds(
    trainerUserIds: string[],
  ): Promise<Array<{ user_id: string; display_name: string | null }>>;

  /* ── Detalhe do aluno (P1) ── */

  findProfileCoreById(userId: string): Promise<{
    id: string;
    full_name: string | null;
    email: string | null;
    created_at: string;
  } | null>;

  findStudentProfileCoreById(userId: string): Promise<{
    user_id: string;
    onboarding_completed_at: string | null;
  } | null>;

  listActiveRelationshipsForStudent(studentUserId: string): Promise<
    Array<{ status: string; trainer_user_id: string; started_at: string | null }>
  >;

  listActiveWorkoutsForStudent(studentUserId: string): Promise<
    Array<{ id: string; title: string; status: string; assigned_at: string }>
  >;

  countCompletedSessionsForStudent(studentUserId: string): Promise<number>;
  findLastCompletedSessionAtForStudent(studentUserId: string): Promise<string | null>;
  countCompletedScansForStudent(studentUserId: string): Promise<number>;
  findLastCompletedScanAtForStudent(studentUserId: string): Promise<string | null>;
  countConversationsForStudent(studentUserId: string): Promise<number>;
  listRecentRelationshipEventsForStudent(
    studentUserId: string,
    limit: number,
  ): Promise<Array<{ event_type: string; occurred_at: string }>>;
}
