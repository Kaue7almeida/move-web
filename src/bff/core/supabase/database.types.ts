export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProfilesRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type StudentProfilesRow = {
  user_id: string;
  birth_date: string | null;
  sex: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  training_goal: string | null;
  training_level: string | null;
  training_profile: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TrainerProfilesRow = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  specialties: string[];
  student_count_range: string | null;
  work_model: string | null;
  invite_slug: string | null;
  is_internal_move_trainer: boolean;
  activated_at: string | null;
  billing_anchor_date: string | null;
  created_at: string;
  updated_at: string;
};

type StudentTrainerRelationshipsRow = {
  id: string;
  student_user_id: string;
  trainer_user_id: string;
  status: string;
  source: string;
  visibility_settings: Json;
  approved_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  billing_eligible_from: string | null;
  created_at: string;
  updated_at: string;
};

type ExercisesRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  thumbnail_path: string | null;
  image_start_path: string | null;
  image_end_path: string | null;
  media_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type WorkoutTemplatesRow = {
  id: string;
  trainer_user_id: string;
  title: string;
  description: string | null;
  status: string;
  is_in_gallery: boolean;
  gallery_category: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutTemplateExercisesRow = {
  id: string;
  workout_template_id: string;
  exercise_id: string;
  sort_order: number;
  sets_count: number;
  reps_text: string;
  rest_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type StudentWorkoutsRow = {
  id: string;
  trainer_user_id: string;
  student_user_id: string;
  workout_template_id: string | null;
  title: string;
  description: string | null;
  status: string;
  source: string;
  assigned_at: string;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
};

type StudentWorkoutExercisesRow = {
  id: string;
  student_workout_id: string;
  exercise_id: string | null;
  exercise_name: string;
  sort_order: number;
  sets_count: number;
  reps_text: string;
  rest_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutSessionsRow = {
  id: string;
  student_user_id: string;
  trainer_user_id: string;
  student_workout_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WorkoutSessionSetsRow = {
  id: string;
  workout_session_id: string;
  student_workout_exercise_id: string | null;
  exercise_name: string;
  set_number: number;
  target_reps_text: string | null;
  performed_reps: number;
  load_kg: number;
  notes: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type ScanAnalysesRow = {
  id: string;
  student_user_id: string;
  status: string;
  allowance_type: string;
  consent_at: string | null;
  source: string;
  weight_kg: number;
  height_cm: number;
  age_years: number;
  sex: string;
  body_fat_percent: number | null;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  bmi: number | null;
  bmr: number | null;
  whr: number | null;
  result: Json;
  quality_overall: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ScanPhotosRow = {
  id: string;
  scan_id: string;
  slot: string;
  storage_path: string;
  content_type: string | null;
  quality_status: string | null;
  quality_reasons: Json;
  created_at: string;
};

type ChatConversationsRow = {
  id: string;
  title: string;
  conversation_type: string;
  owner_user_id: string | null;
  student_user_id: string | null;
  trainer_user_id: string | null;
  ai_enabled: boolean;
  waiting_for_trainer: boolean;
  trainer_ai_mode: string;
  context_module: string | null;
  context_label: string | null;
  metadata: Json;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type ChatMessagesRow = {
  id: string;
  conversation_id: string;
  role: string;
  sender_user_id: string | null;
  assistant_type: string | null;
  is_ai_generated: boolean;
  content: string;
  metadata: Json;
  read_by_student_at: string | null;
  read_by_trainer_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type TrainerAiSettingsRow = {
  id: string;
  trainer_user_id: string;
  enabled: boolean;
  mode: string;
  tone: string | null;
  instructions: string | null;
  preferred_exercises: Json;
  restrictions: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

type StudentTrainerRelationshipEventsRow = {
  id: string;
  relationship_id: string | null;
  trainer_user_id: string;
  student_user_id: string | null;
  event_type: string;
  actor_user_id: string | null;
  actor_role: string;
  source: string;
  occurred_at: string;
  metadata: Json;
  idempotency_key: string | null;
  created_at: string;
};

type NotificationsRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  target_path: string | null;
  target_type: string | null;
  target_entity_id: string | null;
  metadata: Json;
  read_at: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        ProfilesRow,
        {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      student_profiles: TableDefinition<
        StudentProfilesRow,
        {
          user_id: string;
          birth_date?: string | null;
          sex?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          training_goal?: string | null;
          training_level?: string | null;
          training_profile?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          user_id?: string;
          birth_date?: string | null;
          sex?: string | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          training_goal?: string | null;
          training_level?: string | null;
          training_profile?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      trainer_profiles: TableDefinition<
        TrainerProfilesRow,
        {
          user_id: string;
          display_name?: string | null;
          bio?: string | null;
          specialties?: string[];
          student_count_range?: string | null;
          work_model?: string | null;
          invite_slug?: string | null;
          is_internal_move_trainer?: boolean;
          activated_at?: string | null;
          billing_anchor_date?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          user_id?: string;
          display_name?: string | null;
          bio?: string | null;
          specialties?: string[];
          student_count_range?: string | null;
          work_model?: string | null;
          invite_slug?: string | null;
          is_internal_move_trainer?: boolean;
          activated_at?: string | null;
          billing_anchor_date?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      student_trainer_relationships: TableDefinition<
        StudentTrainerRelationshipsRow,
        {
          id?: string;
          student_user_id: string;
          trainer_user_id: string;
          status?: string;
          source?: string;
          visibility_settings?: Json;
          approved_at?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          billing_eligible_from?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          student_user_id?: string;
          trainer_user_id?: string;
          status?: string;
          source?: string;
          visibility_settings?: Json;
          approved_at?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          billing_eligible_from?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      exercises: TableDefinition<
        ExercisesRow,
        {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          primary_muscle?: string | null;
          equipment?: string | null;
          thumbnail_path?: string | null;
          image_start_path?: string | null;
          image_end_path?: string | null;
          media_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          primary_muscle?: string | null;
          equipment?: string | null;
          thumbnail_path?: string | null;
          image_start_path?: string | null;
          image_end_path?: string | null;
          media_type?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      workout_templates: TableDefinition<
        WorkoutTemplatesRow,
        {
          id?: string;
          trainer_user_id: string;
          title: string;
          description?: string | null;
          status?: string;
          is_in_gallery?: boolean;
          gallery_category?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          trainer_user_id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          is_in_gallery?: boolean;
          gallery_category?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      workout_template_exercises: TableDefinition<
        WorkoutTemplateExercisesRow,
        {
          id?: string;
          workout_template_id: string;
          exercise_id: string;
          sort_order: number;
          sets_count: number;
          reps_text: string;
          rest_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          workout_template_id?: string;
          exercise_id?: string;
          sort_order?: number;
          sets_count?: number;
          reps_text?: string;
          rest_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      student_workouts: TableDefinition<
        StudentWorkoutsRow,
        {
          id?: string;
          trainer_user_id: string;
          student_user_id: string;
          workout_template_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          source?: string;
          assigned_at?: string;
          activated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          trainer_user_id?: string;
          student_user_id?: string;
          workout_template_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          source?: string;
          assigned_at?: string;
          activated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      student_workout_exercises: TableDefinition<
        StudentWorkoutExercisesRow,
        {
          id?: string;
          student_workout_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          sort_order: number;
          sets_count: number;
          reps_text: string;
          rest_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          student_workout_id?: string;
          exercise_id?: string | null;
          exercise_name?: string;
          sort_order?: number;
          sets_count?: number;
          reps_text?: string;
          rest_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      workout_sessions: TableDefinition<
        WorkoutSessionsRow,
        {
          id?: string;
          student_user_id: string;
          trainer_user_id: string;
          student_workout_id: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          student_user_id?: string;
          trainer_user_id?: string;
          student_workout_id?: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          duration_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      workout_session_sets: TableDefinition<
        WorkoutSessionSetsRow,
        {
          id?: string;
          workout_session_id: string;
          student_workout_exercise_id?: string | null;
          exercise_name: string;
          set_number: number;
          target_reps_text?: string | null;
          performed_reps: number;
          load_kg?: number;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          workout_session_id?: string;
          student_workout_exercise_id?: string | null;
          exercise_name?: string;
          set_number?: number;
          target_reps_text?: string | null;
          performed_reps?: number;
          load_kg?: number;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      student_trainer_relationship_events: TableDefinition<
        StudentTrainerRelationshipEventsRow,
        {
          id?: string;
          relationship_id?: string | null;
          trainer_user_id: string;
          student_user_id?: string | null;
          event_type: string;
          actor_user_id?: string | null;
          actor_role: string;
          source: string;
          occurred_at?: string;
          metadata?: Json;
          idempotency_key?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          relationship_id?: string | null;
          trainer_user_id?: string;
          student_user_id?: string | null;
          event_type?: string;
          actor_user_id?: string | null;
          actor_role?: string;
          source?: string;
          occurred_at?: string;
          metadata?: Json;
          idempotency_key?: string | null;
          created_at?: string;
        }
      >;
      scan_analyses: TableDefinition<
        ScanAnalysesRow,
        {
          id?: string;
          student_user_id: string;
          status?: string;
          allowance_type?: string;
          consent_at?: string | null;
          source?: string;
          weight_kg: number;
          height_cm: number;
          age_years: number;
          sex: string;
          body_fat_percent?: number | null;
          lean_mass_kg?: number | null;
          fat_mass_kg?: number | null;
          bmi?: number | null;
          bmr?: number | null;
          whr?: number | null;
          result?: Json;
          quality_overall?: string | null;
          failure_reason?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          student_user_id?: string;
          status?: string;
          allowance_type?: string;
          consent_at?: string | null;
          source?: string;
          weight_kg?: number;
          height_cm?: number;
          age_years?: number;
          sex?: string;
          body_fat_percent?: number | null;
          lean_mass_kg?: number | null;
          fat_mass_kg?: number | null;
          bmi?: number | null;
          bmr?: number | null;
          whr?: number | null;
          result?: Json;
          quality_overall?: string | null;
          failure_reason?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      scan_photos: TableDefinition<
        ScanPhotosRow,
        {
          id?: string;
          scan_id: string;
          slot: string;
          storage_path: string;
          content_type?: string | null;
          quality_status?: string | null;
          quality_reasons?: Json;
          created_at?: string;
        },
        {
          id?: string;
          scan_id?: string;
          slot?: string;
          storage_path?: string;
          content_type?: string | null;
          quality_status?: string | null;
          quality_reasons?: Json;
          created_at?: string;
        }
      >;
      chat_conversations: TableDefinition<
        ChatConversationsRow,
        {
          id?: string;
          title?: string;
          conversation_type: string;
          owner_user_id?: string | null;
          student_user_id?: string | null;
          trainer_user_id?: string | null;
          ai_enabled?: boolean;
          waiting_for_trainer?: boolean;
          trainer_ai_mode?: string;
          context_module?: string | null;
          context_label?: string | null;
          metadata?: Json;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        },
        {
          id?: string;
          title?: string;
          conversation_type?: string;
          owner_user_id?: string | null;
          student_user_id?: string | null;
          trainer_user_id?: string | null;
          ai_enabled?: boolean;
          waiting_for_trainer?: boolean;
          trainer_ai_mode?: string;
          context_module?: string | null;
          context_label?: string | null;
          metadata?: Json;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        }
      >;
      chat_messages: TableDefinition<
        ChatMessagesRow,
        {
          id?: string;
          conversation_id: string;
          role: string;
          sender_user_id?: string | null;
          assistant_type?: string | null;
          is_ai_generated?: boolean;
          content: string;
          metadata?: Json;
          read_by_student_at?: string | null;
          read_by_trainer_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        },
        {
          id?: string;
          conversation_id?: string;
          role?: string;
          sender_user_id?: string | null;
          assistant_type?: string | null;
          is_ai_generated?: boolean;
          content?: string;
          metadata?: Json;
          read_by_student_at?: string | null;
          read_by_trainer_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        }
      >;
      trainer_ai_settings: TableDefinition<
        TrainerAiSettingsRow,
        {
          id?: string;
          trainer_user_id: string;
          enabled?: boolean;
          mode?: string;
          tone?: string | null;
          instructions?: string | null;
          preferred_exercises?: Json;
          restrictions?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          trainer_user_id?: string;
          enabled?: boolean;
          mode?: string;
          tone?: string | null;
          instructions?: string | null;
          preferred_exercises?: Json;
          restrictions?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      notifications: TableDefinition<
        NotificationsRow,
        {
          id?: string;
          recipient_user_id: string;
          actor_user_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          target_path?: string | null;
          target_type?: string | null;
          target_entity_id?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        },
        {
          id?: string;
          recipient_user_id?: string;
          actor_user_id?: string | null;
          type?: string;
          title?: string;
          body?: string | null;
          target_path?: string | null;
          target_type?: string | null;
          target_entity_id?: string | null;
          metadata?: Json;
          read_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
