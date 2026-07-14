export type AdminOverviewUsage = {
  assignedWorkouts: number;
  completedSessions: number;
  completedScans: number;
  humanMessages: number;
  waitingForTrainerConversations: number;
};

export type AdminOverviewLast7Days = {
  completedSessions: number;
  scans: number;
  humanMessages: number;
  newRelationships: number;
  relationshipEvents: number;
};

export type AdminOverview = {
  trainerCount: number;
  internalTrainerCount: number;
  studentCount: number;
  activeRelationshipCount: number;
  endedRelationshipCount: number;
  activeStudentCount: number;
  eventsLast7Days: number;
  eventsByTypeLast30Days: Record<string, number>;
  usage: AdminOverviewUsage;
  last7Days: AdminOverviewLast7Days;
};

export type AdminAttentionStudentItem = {
  studentUserId: string;
  studentName: string | null;
  studentEmail: string | null;
  trainerUserId: string | null;
  trainerName: string | null;
  relationshipStartedAt: string | null;
  reason: string;
};

export type AdminAttentionStalledStudentItem = {
  studentUserId: string;
  studentName: string | null;
  trainerUserId: string | null;
  trainerName: string | null;
  lastSessionAt: string | null;
  activeWorkoutCount: number;
  relationshipStartedAt: string | null;
  reason: string;
};

export type AdminAttentionTrainerItem = {
  trainerUserId: string;
  trainerName: string;
  trainerEmail: string | null;
  activatedAt: string | null;
  activeStudentCount: number;
  reason: string;
};

export type AdminAttentionResponse = {
  studentsWithoutWorkout: AdminAttentionStudentItem[];
  studentsWithoutRecentSession: AdminAttentionStalledStudentItem[];
  trainersWithoutStudents: AdminAttentionTrainerItem[];
  trainersWithoutWorkouts: AdminAttentionTrainerItem[];
};

export type AdminTrainerListItem = {
  userId: string;
  displayName: string;
  email: string;
  activatedAt: string | null;
  isInternalMoveTrainer: boolean;
  activeStudentCount: number;
  endedRelationshipCount: number;
  totalRelationshipCount: number;
};

export type AdminTrainerListResponse = {
  trainers: AdminTrainerListItem[];
};

export type AdminTrainerStudent = {
  studentUserId: string;
  name: string;
  email: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type AdminTrainerEvent = {
  eventType: string;
  occurredAt: string;
  actorRole: string;
  source: string;
  studentUserId: string | null;
};

export type AdminTrainerDetail = {
  userId: string;
  displayName: string;
  email: string;
  activatedAt: string | null;
  isInternalMoveTrainer: boolean;
  students: AdminTrainerStudent[];
  recentEvents: AdminTrainerEvent[];
};

export type AdminTrainerDetailResponse = {
  trainer: AdminTrainerDetail;
};

export type AdminScanStatus = "draft" | "processing" | "completed" | "failed" | "rejected";

export type AdminScanSummary = {
  totalAnalyses: number;
  completedCount: number;
  rejectedCount: number;
  failedCount: number;
  processingCount: number;
  draftCount: number;
  analysesLast30Days: number;
  uniqueStudentsCount: number;
  bonusAnalysesCount: number;
};

export type AdminScanStudentItem = {
  studentUserId: string;
  studentName: string | null;
  studentEmail: string | null;
  totalAnalyses: number;
  completedCount: number;
  lastScanAt: string | null;
  lastStatus: AdminScanStatus | null;
  lastBodyFatPercent: number | null;
};

export type AdminRecentScanItem = {
  id: string;
  studentUserId: string;
  studentName: string | null;
  studentEmail: string | null;
  status: AdminScanStatus;
  allowanceType: "regular" | "bonus";
  createdAt: string;
  processedAt: string | null;
  bodyFatPercent: number | null;
  qualityOverall: string | null;
};

export type AdminScanOverviewResponse = {
  summary: AdminScanSummary;
  students: AdminScanStudentItem[];
  recentScans: AdminRecentScanItem[];
};

/* ─── Admin: lista global de alunos (P1) ─── */

export const ADMIN_STUDENT_FILTERS = ["all", "with_trainer", "without_trainer"] as const;
export type AdminStudentFilter = (typeof ADMIN_STUDENT_FILTERS)[number];

export const ADMIN_STUDENT_SORTS = ["newest", "name"] as const;
export type AdminStudentSort = (typeof ADMIN_STUDENT_SORTS)[number];

export const ADMIN_STUDENTS_DEFAULT_LIMIT = 20;
export const ADMIN_STUDENTS_MAX_LIMIT = 50;

export type AdminStudentListQuery = {
  search: string | null;
  filter: AdminStudentFilter;
  sort: AdminStudentSort;
  page: number;
  limit: number;
};

export type AdminStudentListTrainer = {
  trainerUserId: string;
  name: string;
  relationshipStartedAt: string | null;
};

export type AdminStudentListItem = {
  studentUserId: string;
  name: string | null;
  email: string;
  createdAt: string;
  onboardingCompletedAt: string | null;
  trainer: AdminStudentListTrainer | null;
  /**
   * Sinal de inconsistência: aluno com mais de um vínculo `active` simultâneo.
   * O `trainer` acima é o mais recente por `started_at`; esta flag garante que a
   * ambiguidade não seja mascarada silenciosamente na UI/operação.
   */
  hasMultipleActiveTrainers: boolean;
  activeWorkoutCount: number;
  completedSessionCount: number;
  lastCompletedSessionAt: string | null;
};

export type AdminStudentListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminStudentListSummary = {
  totalStudents: number;
  withTrainer: number;
  withoutTrainer: number;
};

export type AdminStudentListResponse = {
  items: AdminStudentListItem[];
  pagination: AdminStudentListPagination;
  summary: AdminStudentListSummary;
};

/* ─── Admin: detalhe do aluno (P1) ─── */

export type AdminStudentDetailRelationship = {
  status: string;
  trainerUserId: string;
  trainerName: string;
  startedAt: string | null;
};

export type AdminStudentDetailWorkout = {
  id: string;
  title: string;
  status: string;
  assignedAt: string;
};

export type AdminStudentDetailEvent = {
  eventType: string;
  occurredAt: string;
};

export type AdminStudentDetailActivity = {
  completedSessions: number;
  lastCompletedSessionAt: string | null;
  completedScans: number;
  lastScanAt: string | null;
  conversationCount: number;
};

export type AdminStudentDetail = {
  studentUserId: string;
  name: string | null;
  email: string;
  createdAt: string;
  onboardingCompletedAt: string | null;
  relationship: AdminStudentDetailRelationship | null;
  hasMultipleActiveTrainers: boolean;
  workouts: AdminStudentDetailWorkout[];
  activity: AdminStudentDetailActivity;
  recentRelationshipEvents: AdminStudentDetailEvent[];
};

export type AdminStudentDetailResponse = {
  student: AdminStudentDetail;
};
