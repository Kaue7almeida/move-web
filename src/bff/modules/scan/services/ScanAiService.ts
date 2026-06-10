import type { OpenAiScanClient } from "@/bff/modules/scan/infra/OpenAiScanClient";
import type { ScanAnalysisInput, ScanAnalysisResponse } from "@/bff/modules/scan/types";

/**
 * Service that orchestrates body composition analysis via AI.
 * Stateless: no database, no storage — preview only.
 */
export class ScanAiService {
  constructor(private readonly openAiClient: OpenAiScanClient) {}

  async analyzePreview(input: ScanAnalysisInput): Promise<ScanAnalysisResponse> {
    return this.openAiClient.analyze(input);
  }
}
