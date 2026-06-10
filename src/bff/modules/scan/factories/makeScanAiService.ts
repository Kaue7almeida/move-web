import { ApiError } from "@/bff/core/errors/ApiError";
import { OpenAiScanClient } from "@/bff/modules/scan/infra/OpenAiScanClient";
import { ScanAiService } from "@/bff/modules/scan/services/ScanAiService";

export function makeScanAiService(): ScanAiService {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ApiError(
      500,
      "openai_api_key_missing",
      "Chave da API OpenAI não configurada no servidor.",
    );
  }

  // No silent fallback: use the configured model or the explicit default.
  const model = process.env.OPENAI_SCAN_MODEL || "gpt-5.5";

  return new ScanAiService(new OpenAiScanClient(apiKey, model));
}
