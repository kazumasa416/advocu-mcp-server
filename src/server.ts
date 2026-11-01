import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from "@modelcontextprotocol/sdk/types.js";

import { GDE_TOOLS } from "./gdeTools.js";
// Import shared domain types and enums
import type {
  ContentCreationDraft,
  GooglerInteractionDraft,
  MentoringDraft,
  ProductFeedbackDraft,
  PublicSpeakingDraft,
  StoryDraft,
  WorkshopDraft,
} from "./interfaces";

export class ActivityReportingServer {
  private readonly server: Server;
  private readonly accessToken: string;
  private readonly baseUrl = process.env.ADVOCU_API_URL ?? "https://api.advocu.com/personal-api/v1/gde";

  /**
   * Extract a meaningful error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object") {
      if ("message" in error && typeof error.message === "string") {
        return error.message;
      }
      if ("error" in error && typeof error.error === "string") {
        return error.error;
      }
      if ("statusText" in error && typeof error.statusText === "string") {
        return error.statusText;
      }
    }
    return JSON.stringify(error);
  }

  constructor() {
    this.server = new Server(
      {
        name: "activity-reporting-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.accessToken = process.env.ADVOCU_ACCESS_TOKEN ?? "";
    if (!this.accessToken) {
      console.error("ADVOCU_ACCESS_TOKEN is not set. Please set it in your environment variables.");
      process.exit(1);
    }

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: GDE_TOOLS,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "submit_content_creation":
            return await this.submitActivityDraft("content-creation", args as unknown as ContentCreationDraft);
          case "submit_public_speaking":
            return await this.submitActivityDraft("public-speaking", args as unknown as PublicSpeakingDraft);
          case "submit_workshop":
            return await this.submitActivityDraft("workshop", args as unknown as WorkshopDraft);
          case "submit_mentoring":
            return await this.submitActivityDraft("mentoring", args as unknown as MentoringDraft);
          case "submit_product_feedback":
            return await this.submitActivityDraft("product-feedback-given", args as unknown as ProductFeedbackDraft);
          case "submit_googler_interaction":
            return await this.submitActivityDraft(
              "interaction-with-googlers",
              args as unknown as GooglerInteractionDraft,
            );
          case "submit_story":
            return await this.submitActivityDraft("stories", args as unknown as StoryDraft);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const errorMsg = this.getErrorMessage(error);
        throw new McpError(ErrorCode.InternalError, `Failed to execute tool '${name}': ${errorMsg}`);
      }
    });
  }

  private async submitActivityDraft(
    endpoint: string,
    data:
      | ContentCreationDraft
      | PublicSpeakingDraft
      | WorkshopDraft
      | MentoringDraft
      | ProductFeedbackDraft
      | GooglerInteractionDraft
      | StoryDraft,
  ): Promise<{
    content: Array<{
      type: string;
      text: string;
    }>;
  }> {
    const url = `${this.baseUrl}/activity-drafts/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `GDE API error (${response.status})`;

        if (response.status === 401) {
          errorMessage =
            "❌ GDE authentication failed. Your ADVOCU_ACCESS_TOKEN may be expired or invalid.\n\nPlease check your Advocu access token configuration.";
        } else if (response.status === 400) {
          errorMessage = `❌ GDE API rejected the request:\n\n${errorText}\n\nPlease check:\n- All required fields are present\n- Field values match expected formats\n- Tags are valid\n- Date format is correct (YYYY-MM-DD)`;
        } else if (response.status === 429) {
          errorMessage = "⏱️ GDE API rate limit exceeded (30 requests/minute). Please wait and try again.";
        } else {
          errorMessage = `❌ GDE API error (${response.status}):\n\n${errorText}`;
        }

        // Return error as content instead of throwing
        return {
          content: [
            {
              type: "text",
              text: errorMessage,
            },
          ],
        };
      }

      const result = (await response.json()) as Record<string, unknown>;

      return {
        content: [
          {
            type: "text",
            text: `✅ GDE Activity draft submitted successfully!\n\nEndpoint: ${endpoint}\nStatus: ${response.status}\nResponse: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      const errorMsg = this.getErrorMessage(error);
      throw new McpError(
        ErrorCode.InternalError,
        `❌ Failed to submit GDE activity:\n\n${errorMsg}\n\nEndpoint: ${endpoint}`,
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Activity Reporting MCP server running on stdio");
  }
}
