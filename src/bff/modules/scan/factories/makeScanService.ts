import { createSupabaseAdminClient } from "@/bff/core/supabase/server";
import { makeScanAiService } from "@/bff/modules/scan/factories/makeScanAiService";
import { ScanRepository } from "@/bff/modules/scan/infra/ScanRepository";
import { ScanService } from "@/bff/modules/scan/services/ScanService";

export function makeScanService(): ScanService {
  const supabase = createSupabaseAdminClient();
  const scanRepository = new ScanRepository(supabase);

  // makeScanAiService validates OPENAI_API_KEY at call time, so passing it as
  // a factory keeps non-AI endpoints (GET /scan, upload, etc.) usable without it.
  return new ScanService(scanRepository, makeScanAiService);
}
