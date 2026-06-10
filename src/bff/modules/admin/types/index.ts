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
