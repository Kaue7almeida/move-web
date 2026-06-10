import { ApiError } from "@/bff/core/errors/ApiError";

import type {
  ChatContextTriggerBuilder,
  ChatContextTriggerInput,
  ChatContextTriggerResolver,
  ChatContextTriggerResult,
} from "./types";

/**
 * Registry-based resolver. New triggers are added by registering another
 * builder — no change to ChatService is required.
 */
export class ChatContextTriggerRegistry implements ChatContextTriggerResolver {
  private readonly buildersById: Map<string, ChatContextTriggerBuilder>;

  constructor(builders: ChatContextTriggerBuilder[]) {
    this.buildersById = new Map(builders.map((builder) => [builder.id, builder]));
  }

  async resolve(
    triggerId: string,
    input: ChatContextTriggerInput,
  ): Promise<ChatContextTriggerResult> {
    const builder = this.buildersById.get(triggerId);

    if (!builder) {
      throw new ApiError(
        400,
        "chat_context_trigger_not_supported",
        "Este gatilho contextual ainda não é suportado.",
      );
    }

    return builder.build(input);
  }
}
