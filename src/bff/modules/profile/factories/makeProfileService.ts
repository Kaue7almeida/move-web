import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { ProfileRepository } from "@/bff/modules/profile/infra/ProfileRepository";
import { ProfileService } from "@/bff/modules/profile/services/ProfileService";

export function makeProfileService() {
  const supabase = createSupabaseAdminClient();
  const profileRepository = new ProfileRepository(supabase);

  return new ProfileService(profileRepository);
}