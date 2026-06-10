import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { AdminRepository } from "@/bff/modules/admin/infra/AdminRepository";
import { AdminService } from "@/bff/modules/admin/services/AdminService";

export function makeAdminService() {
  const supabase = createSupabaseAdminClient();
  const adminRepository = new AdminRepository(supabase);

  return new AdminService(adminRepository);
}
