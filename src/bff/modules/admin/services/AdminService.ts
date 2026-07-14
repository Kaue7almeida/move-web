import { ApiError } from "@/bff/core/errors/ApiError";
import type { RelationshipEventType } from "@/bff/modules/profile/types";
import {
  ADMIN_STUDENTS_MAX_LIMIT,
  type AdminAttentionResponse,
  type AdminAttentionStalledStudentItem,
  type AdminAttentionStudentItem,
  type AdminAttentionTrainerItem,
  type AdminOverview,
  type AdminRecentScanItem,
  type AdminScanOverviewResponse,
  type AdminScanStatus,
  type AdminScanStudentItem,
  type AdminScanSummary,
  type AdminStudentDetailRelationship,
  type AdminStudentDetailResponse,
  type AdminStudentListItem,
  type AdminStudentListQuery,
  type AdminStudentListResponse,
  type AdminTrainerDetailResponse,
  type AdminTrainerListResponse,
} from "@/bff/modules/admin/types";
import type { IAdminRepository } from "@/bff/modules/admin/types/IAdminRepository";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_EVENTS_LIMIT = 50;
const STUDENT_RECENT_EVENTS_LIMIT = 10;
const ATTENTION_LIST_LIMIT = 10;
/** Cap de candidatos da lista "sem sessao recente" antes de buscar a ultima sessao. */
const STALLED_CANDIDATE_CAP = 50;

const ATTENTION_REASON_NO_WORKOUT = "Sem treino atribuído";
const ATTENTION_REASON_NO_RECENT_SESSION = "Sem treino concluído nos últimos 7 dias";
const ATTENTION_REASON_NO_STUDENTS = "Sem alunos ativos";
const ATTENTION_REASON_NO_TEMPLATES = "Sem treino criado";

/** Ordena ISO strings ascendente, nulls por ultimo. */
function compareIsoAscNullsLast(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

/** Ordena ISO strings ascendente, nulls primeiro (null = "nunca aconteceu"). */
function compareIsoAscNullsFirst(left: string | null, right: string | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left.localeCompare(right);
}
const STUDENT_STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  pending: 1,
  ended: 2,
};

/**
 * Remove caracteres que quebram a sintaxe de `.or()`/`ilike` do PostgREST
 * (vírgula, parênteses, curingas). Retorna null quando não sobra nada útil.
 */
function sanitizeStudentSearch(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  const cleaned = raw
    .replace(/[,()*%_:\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function clampStudentLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit < 1) {
    return 1;
  }

  return Math.min(Math.floor(limit), ADMIN_STUDENTS_MAX_LIMIT);
}

/** Canonical event types, used to seed a stable eventsByType shape (zero-filled). */
const RELATIONSHIP_EVENT_TYPES = [
  "invite_slug_generated",
  "invite_link_opened",
  "relationship_activated",
  "relationship_removed_by_trainer",
  "relationship_left_by_student",
  "relationship_reactivated",
] as const satisfies readonly RelationshipEventType[];

export class AdminService {
  constructor(private readonly adminRepository: IAdminRepository) {}

  async getOverview(): Promise<AdminOverview> {
    const now = Date.now();
    const since7DaysIso = new Date(now - SEVEN_DAYS_MS).toISOString();
    const since30DaysIso = new Date(now - THIRTY_DAYS_MS).toISOString();

    const [
      trainerCount,
      internalTrainerCount,
      studentCount,
      activeRelationshipCount,
      endedRelationshipCount,
      activeStudentCount,
      eventsLast7Days,
      rawEventsByType,
      assignedWorkouts,
      completedSessions,
      completedScans,
      humanMessages,
      waitingForTrainerConversations,
      completedSessionsLast7Days,
      scansLast7Days,
      humanMessagesLast7Days,
      newRelationshipsLast7Days,
    ] = await Promise.all([
      this.adminRepository.countTrainerProfiles(),
      this.adminRepository.countInternalTrainerProfiles(),
      this.adminRepository.countStudentProfiles(),
      this.adminRepository.countRelationshipsByStatus("active"),
      this.adminRepository.countRelationshipsByStatus("ended"),
      this.adminRepository.countDistinctActiveStudents(),
      this.adminRepository.countEventsSince(since7DaysIso),
      this.adminRepository.countEventsByTypeSince(since30DaysIso),
      this.adminRepository.countAssignedStudentWorkouts(),
      this.adminRepository.countCompletedWorkoutSessions(),
      this.adminRepository.countCompletedScans(),
      this.adminRepository.countHumanChatMessages(),
      this.adminRepository.countWaitingForTrainerConversations(),
      this.adminRepository.countCompletedWorkoutSessions(since7DaysIso),
      this.adminRepository.countScansSince(since7DaysIso),
      this.adminRepository.countHumanChatMessages(since7DaysIso),
      this.adminRepository.countEventsOfTypeSince("relationship_activated", since7DaysIso),
    ]);

    const eventsByTypeLast30Days: Record<string, number> = {};

    for (const eventType of RELATIONSHIP_EVENT_TYPES) {
      eventsByTypeLast30Days[eventType] = 0;
    }

    Object.assign(eventsByTypeLast30Days, rawEventsByType);

    return {
      trainerCount,
      internalTrainerCount,
      studentCount,
      activeRelationshipCount,
      endedRelationshipCount,
      activeStudentCount,
      eventsLast7Days,
      eventsByTypeLast30Days,
      usage: {
        assignedWorkouts,
        completedSessions,
        completedScans,
        humanMessages,
        waitingForTrainerConversations,
      },
      last7Days: {
        completedSessions: completedSessionsLast7Days,
        scans: scansLast7Days,
        humanMessages: humanMessagesLast7Days,
        newRelationships: newRelationshipsLast7Days,
        relationshipEvents: eventsLast7Days,
      },
    };
  }

  /**
   * Listas operacionais de atencao (CS nos primeiros dias). Tabelas pequenas
   * (vinculos, treinos atribuidos, templates) sao lidas com selects de colunas
   * minimas e compostas em memoria; sessoes sao consultadas apenas na janela
   * recente e, para "ultima sessao", apenas para os candidatos ja filtrados.
   */
  async getAttention(): Promise<AdminAttentionResponse> {
    const since7DaysIso = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

    const [
      activeRelationships,
      assignedWorkoutRefs,
      recentSessionStudentIds,
      trainers,
      trainerIdsWithActiveTemplates,
      relationshipStatuses,
    ] = await Promise.all([
      this.adminRepository.listActiveRelationships(),
      this.adminRepository.listAssignedStudentWorkoutRefs(),
      this.adminRepository.listStudentIdsWithCompletedSessionsSince(since7DaysIso),
      this.adminRepository.listTrainers(),
      this.adminRepository.listTrainerUserIdsWithActiveTemplates(),
      this.adminRepository.listTrainerRelationshipStatuses(),
    ]);

    // Vinculo ativo "atual" por aluno: o mais recente por started_at.
    const relationshipByStudent = new Map<
      string,
      { trainerUserId: string; startedAt: string | null }
    >();

    for (const relationship of activeRelationships) {
      const current = relationshipByStudent.get(relationship.student_user_id);

      if (
        !current ||
        compareIsoAscNullsLast(current.startedAt, relationship.started_at) < 0
      ) {
        relationshipByStudent.set(relationship.student_user_id, {
          trainerUserId: relationship.trainer_user_id,
          startedAt: relationship.started_at,
        });
      }
    }

    const workoutCountByStudent = new Map<string, number>();
    const trainerIdsWithAssignedWorkouts = new Set<string>();

    for (const ref of assignedWorkoutRefs) {
      workoutCountByStudent.set(
        ref.student_user_id,
        (workoutCountByStudent.get(ref.student_user_id) ?? 0) + 1,
      );
      trainerIdsWithAssignedWorkouts.add(ref.trainer_user_id);
    }

    const recentSessionStudents = new Set(recentSessionStudentIds);

    /* ── A. Alunos com vinculo ativo e sem treino atribuido ── */
    const studentsWithoutWorkoutEntries = Array.from(relationshipByStudent.entries())
      .filter(([studentUserId]) => !workoutCountByStudent.has(studentUserId))
      .sort((left, right) => compareIsoAscNullsLast(left[1].startedAt, right[1].startedAt))
      .slice(0, ATTENTION_LIST_LIMIT);

    /* ── B. Alunos com treino, sem sessao concluida nos ultimos 7 dias ──
       Vinculos com menos de 7 dias (ou started_at nulo) ficam fora para nao
       acusar aluno recem-vinculado. */
    const stalledCandidates = Array.from(relationshipByStudent.entries())
      .filter(
        ([studentUserId, relationship]) =>
          workoutCountByStudent.has(studentUserId) &&
          !recentSessionStudents.has(studentUserId) &&
          relationship.startedAt !== null &&
          relationship.startedAt <= since7DaysIso,
      )
      .slice(0, STALLED_CANDIDATE_CAP);

    const lastSessionRows =
      stalledCandidates.length > 0
        ? await this.adminRepository.listLastCompletedSessionAtForStudents(
            stalledCandidates.map(([studentUserId]) => studentUserId),
          )
        : [];

    // Linhas vem ordenadas desc: o primeiro encontro por aluno e a ultima sessao.
    const lastSessionByStudent = new Map<string, string | null>();

    for (const row of lastSessionRows) {
      if (!lastSessionByStudent.has(row.student_user_id)) {
        lastSessionByStudent.set(row.student_user_id, row.completed_at);
      }
    }

    const stalledStudentEntries = stalledCandidates
      .sort((left, right) =>
        compareIsoAscNullsFirst(
          lastSessionByStudent.get(left[0]) ?? null,
          lastSessionByStudent.get(right[0]) ?? null,
        ),
      )
      .slice(0, ATTENTION_LIST_LIMIT);

    /* ── C/D. Personals externos sem alunos ativos / sem treino criado ── */
    const activeStudentCountByTrainer = new Map<string, number>();

    for (const relationship of relationshipStatuses) {
      if (relationship.status === "active") {
        activeStudentCountByTrainer.set(
          relationship.trainer_user_id,
          (activeStudentCountByTrainer.get(relationship.trainer_user_id) ?? 0) + 1,
        );
      }
    }

    const externalTrainers = trainers.filter(
      (trainer) => !trainer.is_internal_move_trainer,
    );
    const trainerIdsWithTemplates = new Set(trainerIdsWithActiveTemplates);

    const trainersWithoutStudentsItems = externalTrainers
      .filter((trainer) => (activeStudentCountByTrainer.get(trainer.user_id) ?? 0) === 0)
      .sort((left, right) => compareIsoAscNullsLast(left.activated_at, right.activated_at))
      .slice(0, ATTENTION_LIST_LIMIT);

    // "Sem treino criado": nem template ativo, nem treino atribuido direto
    // (treino pode ser prescrito sem template).
    const trainersWithoutWorkoutsItems = externalTrainers
      .filter(
        (trainer) =>
          !trainerIdsWithTemplates.has(trainer.user_id) &&
          !trainerIdsWithAssignedWorkouts.has(trainer.user_id),
      )
      .sort(
        (left, right) =>
          (activeStudentCountByTrainer.get(right.user_id) ?? 0) -
          (activeStudentCountByTrainer.get(left.user_id) ?? 0),
      )
      .slice(0, ATTENTION_LIST_LIMIT);

    /* ── Nomes/e-mails em uma unica busca de profiles ── */
    const trainerNameById = new Map(
      trainers.map((trainer) => [trainer.user_id, trainer.display_name?.trim() || null]),
    );

    const profileIds = new Set<string>();

    for (const [studentUserId, relationship] of studentsWithoutWorkoutEntries) {
      profileIds.add(studentUserId);
      profileIds.add(relationship.trainerUserId);
    }
    for (const [studentUserId, relationship] of stalledStudentEntries) {
      profileIds.add(studentUserId);
      profileIds.add(relationship.trainerUserId);
    }
    for (const trainer of trainersWithoutStudentsItems) {
      profileIds.add(trainer.user_id);
    }
    for (const trainer of trainersWithoutWorkoutsItems) {
      profileIds.add(trainer.user_id);
    }

    const profiles = await this.adminRepository.listProfilesByIds(Array.from(profileIds));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const resolveTrainerName = (trainerUserId: string): string | null =>
      trainerNameById.get(trainerUserId) ??
      profileById.get(trainerUserId)?.full_name?.trim() ??
      null;

    const studentsWithoutWorkout: AdminAttentionStudentItem[] =
      studentsWithoutWorkoutEntries.map(([studentUserId, relationship]) => ({
        studentUserId,
        studentName: profileById.get(studentUserId)?.full_name?.trim() || null,
        studentEmail: profileById.get(studentUserId)?.email?.trim() || null,
        trainerUserId: relationship.trainerUserId,
        trainerName: resolveTrainerName(relationship.trainerUserId),
        relationshipStartedAt: relationship.startedAt,
        reason: ATTENTION_REASON_NO_WORKOUT,
      }));

    const studentsWithoutRecentSession: AdminAttentionStalledStudentItem[] =
      stalledStudentEntries.map(([studentUserId, relationship]) => ({
        studentUserId,
        studentName: profileById.get(studentUserId)?.full_name?.trim() || null,
        trainerUserId: relationship.trainerUserId,
        trainerName: resolveTrainerName(relationship.trainerUserId),
        lastSessionAt: lastSessionByStudent.get(studentUserId) ?? null,
        activeWorkoutCount: workoutCountByStudent.get(studentUserId) ?? 0,
        relationshipStartedAt: relationship.startedAt,
        reason: ATTENTION_REASON_NO_RECENT_SESSION,
      }));

    const toTrainerItem = (
      trainer: (typeof externalTrainers)[number],
      reason: string,
    ): AdminAttentionTrainerItem => ({
      trainerUserId: trainer.user_id,
      trainerName:
        trainer.display_name?.trim() ||
        profileById.get(trainer.user_id)?.full_name?.trim() ||
        "Personal",
      trainerEmail: profileById.get(trainer.user_id)?.email?.trim() || null,
      activatedAt: trainer.activated_at,
      activeStudentCount: activeStudentCountByTrainer.get(trainer.user_id) ?? 0,
      reason,
    });

    return {
      studentsWithoutWorkout,
      studentsWithoutRecentSession,
      trainersWithoutStudents: trainersWithoutStudentsItems.map((trainer) =>
        toTrainerItem(trainer, ATTENTION_REASON_NO_STUDENTS),
      ),
      trainersWithoutWorkouts: trainersWithoutWorkoutsItems.map((trainer) =>
        toTrainerItem(trainer, ATTENTION_REASON_NO_TEMPLATES),
      ),
    };
  }

  async listTrainers(): Promise<AdminTrainerListResponse> {
    const trainers = await this.adminRepository.listTrainers();

    if (trainers.length === 0) {
      return { trainers: [] };
    }

    const userIds = trainers.map((trainer) => trainer.user_id);
    const [emails, relationshipStatuses] = await Promise.all([
      this.adminRepository.listProfileEmailsByIds(userIds),
      this.adminRepository.listTrainerRelationshipStatuses(),
    ]);

    const emailById = new Map(emails.map((profile) => [profile.id, profile.email]));

    const countsByTrainer = new Map<
      string,
      { active: number; ended: number; total: number }
    >();

    for (const relationship of relationshipStatuses) {
      const counts = countsByTrainer.get(relationship.trainer_user_id) ?? {
        active: 0,
        ended: 0,
        total: 0,
      };

      counts.total += 1;

      if (relationship.status === "active") {
        counts.active += 1;
      } else if (relationship.status === "ended") {
        counts.ended += 1;
      }

      countsByTrainer.set(relationship.trainer_user_id, counts);
    }

    const items = trainers.map((trainer) => {
      const counts = countsByTrainer.get(trainer.user_id) ?? { active: 0, ended: 0, total: 0 };

      return {
        userId: trainer.user_id,
        displayName: trainer.display_name?.trim() || "Personal",
        email: emailById.get(trainer.user_id) ?? "",
        activatedAt: trainer.activated_at,
        isInternalMoveTrainer: trainer.is_internal_move_trainer,
        activeStudentCount: counts.active,
        endedRelationshipCount: counts.ended,
        totalRelationshipCount: counts.total,
      };
    });

    items.sort(
      (left, right) =>
        right.activeStudentCount - left.activeStudentCount
        || left.displayName.localeCompare(right.displayName),
    );

    return { trainers: items };
  }

  async getScanOverview(): Promise<AdminScanOverviewResponse> {
    const since30DaysIso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
    const RECENT_SCANS_LIMIT = 50;

    const allScans = await this.adminRepository.listAllScanRecords();

    const uniqueStudentIds = Array.from(new Set(allScans.map((s) => s.student_user_id)));
    const profiles =
      uniqueStudentIds.length > 0
        ? await this.adminRepository.listProfilesByIds(uniqueStudentIds)
        : [];
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    const summary: AdminScanSummary = {
      totalAnalyses: allScans.length,
      completedCount: 0,
      rejectedCount: 0,
      failedCount: 0,
      processingCount: 0,
      draftCount: 0,
      analysesLast30Days: 0,
      uniqueStudentsCount: uniqueStudentIds.length,
      bonusAnalysesCount: 0,
    };

    type StudentAgg = {
      totalAnalyses: number;
      completedCount: number;
      lastScanAt: string | null;
      lastStatus: string | null;
      lastBodyFatPercent: number | null;
    };
    const studentAgg = new Map<string, StudentAgg>();

    for (const scan of allScans) {
      if (scan.status === "completed") summary.completedCount++;
      else if (scan.status === "rejected") summary.rejectedCount++;
      else if (scan.status === "failed") summary.failedCount++;
      else if (scan.status === "processing") summary.processingCount++;
      else if (scan.status === "draft") summary.draftCount++;

      if (scan.created_at >= since30DaysIso) summary.analysesLast30Days++;
      if (scan.allowance_type === "bonus") summary.bonusAnalysesCount++;

      // allScans is ordered by created_at DESC, so first encounter per student is the most recent
      const existing = studentAgg.get(scan.student_user_id);
      if (!existing) {
        studentAgg.set(scan.student_user_id, {
          totalAnalyses: 1,
          completedCount: scan.status === "completed" ? 1 : 0,
          lastScanAt: scan.created_at,
          lastStatus: scan.status,
          lastBodyFatPercent: scan.body_fat_percent,
        });
      } else {
        existing.totalAnalyses++;
        if (scan.status === "completed") existing.completedCount++;
      }
    }

    const students: AdminScanStudentItem[] = Array.from(studentAgg.entries())
      .map(([studentUserId, agg]) => {
        const profile = profileById.get(studentUserId);
        return {
          studentUserId,
          studentName: profile?.full_name ?? null,
          studentEmail: profile?.email ?? null,
          totalAnalyses: agg.totalAnalyses,
          completedCount: agg.completedCount,
          lastScanAt: agg.lastScanAt,
          lastStatus: (agg.lastStatus ?? null) as AdminScanStatus | null,
          lastBodyFatPercent: agg.lastBodyFatPercent,
        };
      })
      .sort((a, b) => {
        if (a.lastScanAt === null && b.lastScanAt === null) return 0;
        if (a.lastScanAt === null) return 1;
        if (b.lastScanAt === null) return -1;
        return b.lastScanAt.localeCompare(a.lastScanAt);
      });

    const recentScans: AdminRecentScanItem[] = allScans.slice(0, RECENT_SCANS_LIMIT).map(
      (scan): AdminRecentScanItem => {
        const profile = profileById.get(scan.student_user_id);
        return {
          id: scan.id,
          studentUserId: scan.student_user_id,
          studentName: profile?.full_name ?? null,
          studentEmail: profile?.email ?? null,
          status: scan.status as AdminScanStatus,
          allowanceType: scan.allowance_type as "regular" | "bonus",
          createdAt: scan.created_at,
          processedAt: scan.processed_at,
          bodyFatPercent: scan.body_fat_percent,
          qualityOverall: scan.quality_overall,
        };
      },
    );

    return { summary, students, recentScans };
  }

  async getTrainerDetail(trainerUserId: string): Promise<AdminTrainerDetailResponse> {
    const [trainerProfile, relationships, events] = await Promise.all([
      this.adminRepository.findTrainerProfileById(trainerUserId),
      this.adminRepository.listRelationshipsForTrainer(trainerUserId),
      this.adminRepository.listRecentEventsForTrainer(trainerUserId, RECENT_EVENTS_LIMIT),
    ]);

    if (!trainerProfile) {
      throw new ApiError(404, "admin_trainer_not_found", "Personal não encontrado.");
    }

    const studentIds = Array.from(
      new Set(relationships.map((relationship) => relationship.student_user_id)),
    );
    const profiles = await this.adminRepository.listProfilesByIds([trainerUserId, ...studentIds]);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const students = relationships.map((relationship) => {
      const profile = profileById.get(relationship.student_user_id);

      return {
        studentUserId: relationship.student_user_id,
        name: profile?.full_name?.trim() || "Aluno sem nome",
        email: profile?.email?.trim() || "",
        status: relationship.status,
        startedAt: relationship.started_at,
        endedAt: relationship.ended_at,
      };
    });

    students.sort((left, right) => {
      const leftPriority = STUDENT_STATUS_PRIORITY[left.status] ?? 3;
      const rightPriority = STUDENT_STATUS_PRIORITY[right.status] ?? 3;

      return leftPriority - rightPriority || left.name.localeCompare(right.name);
    });

    return {
      trainer: {
        userId: trainerProfile.user_id,
        displayName: trainerProfile.display_name?.trim() || "Personal",
        email: profileById.get(trainerUserId)?.email?.trim() || "",
        activatedAt: trainerProfile.activated_at,
        isInternalMoveTrainer: trainerProfile.is_internal_move_trainer,
        students,
        recentEvents: events.map((event) => ({
          eventType: event.event_type,
          occurredAt: event.occurred_at,
          actorRole: event.actor_role,
          source: event.source,
          studentUserId: event.student_user_id,
        })),
      },
    };
  }

  /**
   * Lista global de alunos com busca/filtro/ordenação e paginação server-side.
   *
   * O universo de alunos e os vínculos ativos (roster, proporcional ao nº de
   * usuários) são lidos por completo — mesmo padrão de `getAttention`. A página
   * (nome/e-mail/created_at) é buscada, ordenada e paginada no banco. Os
   * agregados de atividade (treinos/sessões) são buscados em lote apenas para os
   * IDs da página — nunca por aluno em loop, nunca tabelas de atividade inteiras.
   */
  async listStudents(query: AdminStudentListQuery): Promise<AdminStudentListResponse> {
    const limit = clampStudentLimit(query.limit);
    const page = Number.isFinite(query.page) ? Math.max(1, Math.floor(query.page)) : 1;
    const search = sanitizeStudentSearch(query.search);

    const [studentIds, activeRelationships] = await Promise.all([
      this.adminRepository.listStudentUserIds(),
      this.adminRepository.listActiveRelationships(),
    ]);

    const studentIdSet = new Set(studentIds);
    const totalStudents = studentIdSet.size;

    // Vínculo ativo "atual" por aluno: mais recente por started_at; conta múltiplos.
    const activeByStudent = new Map<
      string,
      { trainerUserId: string; startedAt: string | null; count: number }
    >();

    for (const relationship of activeRelationships) {
      if (!studentIdSet.has(relationship.student_user_id)) {
        continue;
      }

      const current = activeByStudent.get(relationship.student_user_id);

      if (!current) {
        activeByStudent.set(relationship.student_user_id, {
          trainerUserId: relationship.trainer_user_id,
          startedAt: relationship.started_at,
          count: 1,
        });
      } else {
        current.count += 1;

        if (compareIsoAscNullsLast(current.startedAt, relationship.started_at) < 0) {
          current.trainerUserId = relationship.trainer_user_id;
          current.startedAt = relationship.started_at;
        }
      }
    }

    const withTrainer = activeByStudent.size;
    const summary = {
      totalStudents,
      withTrainer,
      withoutTrainer: totalStudents - withTrainer,
    };

    let allowedIds: string[];

    if (query.filter === "with_trainer") {
      allowedIds = studentIds.filter((id) => activeByStudent.has(id));
    } else if (query.filter === "without_trainer") {
      allowedIds = studentIds.filter((id) => !activeByStudent.has(id));
    } else {
      allowedIds = studentIds;
    }

    if (allowedIds.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        summary,
      };
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { rows, total } = await this.adminRepository.listStudentProfilePage({
      allowedIds,
      search,
      sort: query.sort,
      from,
      to,
    });

    const pageIds = rows.map((row) => row.id);

    if (pageIds.length === 0) {
      return {
        items: [],
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        summary,
      };
    }

    const trainerIds = Array.from(
      new Set(
        pageIds
          .map((id) => activeByStudent.get(id)?.trainerUserId)
          .filter((value): value is string => typeof value === "string"),
      ),
    );

    const [onboardingRows, activeWorkoutStudentIds, completedSessionRefs, trainerProfiles, trainerFallbackProfiles] =
      await Promise.all([
        this.adminRepository.listStudentOnboardingByIds(pageIds),
        this.adminRepository.listActiveWorkoutStudentIdsForStudents(pageIds),
        this.adminRepository.listCompletedSessionRefsForStudents(pageIds),
        this.adminRepository.listTrainerProfilesByIds(trainerIds),
        this.adminRepository.listProfilesByIds(trainerIds),
      ]);

    const onboardingByStudent = new Map(
      onboardingRows.map((row) => [row.user_id, row.onboarding_completed_at]),
    );

    const activeWorkoutCountByStudent = new Map<string, number>();
    for (const studentUserId of activeWorkoutStudentIds) {
      activeWorkoutCountByStudent.set(
        studentUserId,
        (activeWorkoutCountByStudent.get(studentUserId) ?? 0) + 1,
      );
    }

    // completedSessionRefs vem ordenado desc: primeiro encontro por aluno = última sessão.
    const sessionCountByStudent = new Map<string, number>();
    const lastSessionByStudent = new Map<string, string | null>();
    for (const ref of completedSessionRefs) {
      sessionCountByStudent.set(
        ref.student_user_id,
        (sessionCountByStudent.get(ref.student_user_id) ?? 0) + 1,
      );

      if (!lastSessionByStudent.has(ref.student_user_id)) {
        lastSessionByStudent.set(ref.student_user_id, ref.completed_at);
      }
    }

    const trainerDisplayById = new Map(
      trainerProfiles.map((trainer) => [trainer.user_id, trainer.display_name?.trim() || null]),
    );
    const trainerFallbackById = new Map(
      trainerFallbackProfiles.map((profile) => [profile.id, profile.full_name?.trim() || null]),
    );

    const items: AdminStudentListItem[] = rows.map((row) => {
      const active = activeByStudent.get(row.id);
      const trainer = active
        ? {
            trainerUserId: active.trainerUserId,
            name:
              trainerDisplayById.get(active.trainerUserId) ??
              trainerFallbackById.get(active.trainerUserId) ??
              "Personal",
            relationshipStartedAt: active.startedAt,
          }
        : null;

      return {
        studentUserId: row.id,
        name: row.full_name?.trim() || null,
        email: row.email?.trim() || "",
        createdAt: row.created_at,
        onboardingCompletedAt: onboardingByStudent.get(row.id) ?? null,
        trainer,
        hasMultipleActiveTrainers: (active?.count ?? 0) > 1,
        activeWorkoutCount: activeWorkoutCountByStudent.get(row.id) ?? 0,
        completedSessionCount: sessionCountByStudent.get(row.id) ?? 0,
        lastCompletedSessionAt: lastSessionByStudent.get(row.id) ?? null,
      };
    });

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary,
    };
  }

  /**
   * Detalhe read-only de um aluno. Todas as consultas são por um único aluno e
   * usam count/head ou limit(1) — sem loops, sem tabelas inteiras. Nunca devolve
   * conteúdo de chat, fotos/URLs de scan, percentual corporal, config de IA nem
   * dados brutos de auth.users.
   */
  async getStudentDetail(studentUserId: string): Promise<AdminStudentDetailResponse> {
    const [profile, studentProfile] = await Promise.all([
      this.adminRepository.findProfileCoreById(studentUserId),
      this.adminRepository.findStudentProfileCoreById(studentUserId),
    ]);

    if (!studentProfile) {
      throw new ApiError(404, "admin_student_not_found", "Aluno não encontrado.");
    }

    const [
      activeRelationships,
      workouts,
      completedSessions,
      lastCompletedSessionAt,
      completedScans,
      lastScanAt,
      conversationCount,
      events,
    ] = await Promise.all([
      this.adminRepository.listActiveRelationshipsForStudent(studentUserId),
      this.adminRepository.listActiveWorkoutsForStudent(studentUserId),
      this.adminRepository.countCompletedSessionsForStudent(studentUserId),
      this.adminRepository.findLastCompletedSessionAtForStudent(studentUserId),
      this.adminRepository.countCompletedScansForStudent(studentUserId),
      this.adminRepository.findLastCompletedScanAtForStudent(studentUserId),
      this.adminRepository.countConversationsForStudent(studentUserId),
      this.adminRepository.listRecentRelationshipEventsForStudent(
        studentUserId,
        STUDENT_RECENT_EVENTS_LIMIT,
      ),
    ]);

    // Vínculo ativo "atual" = mais recente por started_at (rows já vêm desc).
    const current = activeRelationships[0] ?? null;
    let relationship: AdminStudentDetailRelationship | null = null;

    if (current) {
      const [trainerProfiles, trainerFallbackProfiles] = await Promise.all([
        this.adminRepository.listTrainerProfilesByIds([current.trainer_user_id]),
        this.adminRepository.listProfilesByIds([current.trainer_user_id]),
      ]);

      const trainerName =
        trainerProfiles[0]?.display_name?.trim() ||
        trainerFallbackProfiles[0]?.full_name?.trim() ||
        "Personal";

      relationship = {
        status: current.status,
        trainerUserId: current.trainer_user_id,
        trainerName,
        startedAt: current.started_at,
      };
    }

    return {
      student: {
        studentUserId,
        name: profile?.full_name?.trim() || null,
        email: profile?.email?.trim() || "",
        createdAt: profile?.created_at ?? "",
        onboardingCompletedAt: studentProfile.onboarding_completed_at,
        relationship,
        hasMultipleActiveTrainers: activeRelationships.length > 1,
        workouts: workouts.map((workout) => ({
          id: workout.id,
          title: workout.title,
          status: workout.status,
          assignedAt: workout.assigned_at,
        })),
        activity: {
          completedSessions,
          lastCompletedSessionAt,
          completedScans,
          lastScanAt,
          conversationCount,
        },
        recentRelationshipEvents: events.map((event) => ({
          eventType: event.event_type,
          occurredAt: event.occurred_at,
        })),
      },
    };
  }
}
