/**
 * @fileoverview Unified Activity Reporting Server
 * @description MCP server that supports both GDE (Advocu) and Microsoft MVP activity submissions
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  GDE_LIST_ACTIVITIES_TOOL,
  GDE_TOOL_ENDPOINTS,
  GDE_TOOLS,
  GDE_UPDATE_ACTIVITY_TOOL,
  getGDEUpdatableFields,
} from "./gdeTools.js";
// GDE imports
import type {
  Activity,
  ActivityListQuery,
  ActivityListResponse,
  ActivityUpdateRequest,
  ContentCreationDraft,
  GooglerInteractionDraft,
  MentoringDraft,
  ProductFeedbackDraft,
  PublicSpeakingDraft,
  StoryDraft,
  WorkshopDraft,
} from "./interfaces/index.js";

type GDEActivityDraft =
  | ContentCreationDraft
  | PublicSpeakingDraft
  | WorkshopDraft
  | MentoringDraft
  | ProductFeedbackDraft
  | GooglerInteractionDraft
  | StoryDraft;

// MVP imports
import type { MVPBlogActivity, MVPSpeakingActivity, MVPVideoActivity } from "./interfaces/mvp/index.js";
import { MVPActivityRole, MVPActivityType, MVPTargetAudience } from "./types/mvp/index.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON with sorted object keys, so that key order does not count as a difference. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isPlainObject(value)) {
    const fields = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${fields.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Names the top-level and data fields that differ between two reads of an activity. */
function listChangedActivityFields(before: Activity, after: Activity): string[] {
  const changed = (["type", "submissionDate", "updatedDate", "archiveDate"] as const).filter(
    (field) => before[field] !== after[field],
  ) as string[];
  for (const field of new Set([...Object.keys(before.data), ...Object.keys(after.data)])) {
    if (canonicalJson(before.data[field]) !== canonicalJson(after.data[field])) {
      changed.push(`data.${field}`);
    }
  }
  return changed;
}

/** A previewed update, kept until it is applied or found to be out of date. */
interface PendingGDEUpdate {
  activityId: string;
  data: string;
  body: string;
  activity: Activity;
}

/** Oldest previews are dropped beyond this; applying one of them asks for a new preview. */
const MAX_PENDING_GDE_UPDATES = 50;

/**
 * Lists the values that would change, one line per field. Values are compared
 * as JSON, so a different tag order counts as a change. Stored text fields can
 * contain HTML, which is shown as stored.
 */
function describeActivityChanges(current: Record<string, unknown>, data: Record<string, unknown>): string[] {
  const changes: string[] = [];
  const compare = (label: string, from: unknown, to: unknown) => {
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push(`- ${label}: ${from === undefined ? "(not set)" : JSON.stringify(from)} -> ${JSON.stringify(to)}`);
    }
  };
  for (const [field, value] of Object.entries(data)) {
    const currentValue = current[field];
    if (field === "metrics" && isPlainObject(value)) {
      const currentMetrics = isPlainObject(currentValue) ? currentValue : {};
      for (const [metric, metricValue] of Object.entries(value)) {
        compare(`metrics.${metric}`, currentMetrics[metric], metricValue);
      }
    } else {
      compare(field, currentValue, value);
      if (field === "tags" && Array.isArray(currentValue) && Array.isArray(value)) {
        const removed = currentValue.filter((tag) => !value.includes(tag));
        if (removed.length > 0) {
          changes.push(`  Tags removed by this update: ${JSON.stringify(removed)}`);
        }
      }
    }
  }
  return changes;
}

// Get the docs directory from environment variable or fallback
// IMPORTANT: Set DOCS_DIR in Claude Desktop config to the full path
// Example: /Users/username/work/mcp-mvp-gde/docs
const DOCS_DIR = process.env.DOCS_DIR || join(process.cwd(), "docs");

// Define available documentation resources
const DOCUMENTATION_RESOURCES = [
  {
    uri: "docs://api-reference",
    name: "API Reference",
    description: "Complete API documentation for both Microsoft MVP and Google GDE (Advocu) APIs",
    mimeType: "text/markdown",
    file: "API.md",
  },
  {
    uri: "docs://mvp-api-reference",
    name: "MVP API Reference",
    description: "Detailed Microsoft MVP API reference with field specifications and examples",
    mimeType: "text/markdown",
    file: "MVP_API_REFERENCE.md",
  },
  {
    uri: "docs://mvp-fixes-changelog",
    name: "MVP Integration Fixes Changelog",
    description: "Complete changelog of fixes applied to MVP integration",
    mimeType: "text/markdown",
    file: "CHANGELOG_MVP_FIXES.md",
  },
  {
    uri: "docs://error-handling",
    name: "Error Handling Improvements",
    description: "Documentation of error handling improvements and best practices",
    mimeType: "text/markdown",
    file: "ERROR_HANDLING_IMPROVEMENTS.md",
  },
  {
    uri: "docs://mcp-resources",
    name: "MCP Resources Guide",
    description: "Guide on how to use MCP resources to access documentation",
    mimeType: "text/markdown",
    file: "MCP_RESOURCES.md",
  },
] as const;

export class UnifiedActivityReportingServer {
  private readonly server: Server;

  // GDE configuration
  private readonly gdeAccessToken: string | null;
  private readonly gdeBaseUrl: string;
  private readonly gdeEnabled: boolean;
  private readonly pendingGDEUpdates = new Map<string, PendingGDEUpdate>();
  private readonly gdeActivitiesBeingUpdated = new Set<string>();
  private readonly gdeUpdateGenerations = new Map<string, number>();

  // MVP configuration
  private readonly mvpAccessToken: string | null;
  private readonly mvpUserProfileId: number | null;
  private readonly mvpBaseUrl: string;
  private readonly mvpEnabled: boolean;

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
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    // Setup GDE
    this.gdeAccessToken = process.env.ADVOCU_ACCESS_TOKEN || null;
    this.gdeBaseUrl = process.env.ADVOCU_API_URL ?? "https://api.advocu.com/personal-api/v1/gde";
    this.gdeEnabled = !!this.gdeAccessToken;

    if (!this.gdeEnabled) {
      console.error("⚠️  ADVOCU_ACCESS_TOKEN not set - GDE tools will be disabled");
    }

    // Setup MVP
    this.mvpAccessToken = process.env.MVP_ACCESS_TOKEN || null;
    const mvpProfileId = process.env.MVP_USER_PROFILE_ID || null;
    this.mvpUserProfileId = mvpProfileId ? Number.parseInt(mvpProfileId, 10) : null;
    this.mvpBaseUrl = process.env.MVP_API_URL ?? "https://mavenapi-prod.azurewebsites.net/api";
    this.mvpEnabled = !!(this.mvpAccessToken && this.mvpUserProfileId);

    if (!this.mvpEnabled) {
      if (!this.mvpAccessToken) {
        console.error("⚠️  MVP_ACCESS_TOKEN not set - MVP tools will be disabled");
      }
      if (!this.mvpUserProfileId) {
        console.error("⚠️  MVP_USER_PROFILE_ID not set - MVP tools will be disabled");
      }
    }

    if (!this.gdeEnabled && !this.mvpEnabled) {
      console.error("❌ Neither GDE nor MVP credentials configured. At least one must be set.");
      process.exit(1);
    }

    console.error(`✅ Server initialized:`);
    console.error(`   GDE: ${this.gdeEnabled ? "enabled" : "disabled"}`);
    console.error(`   MVP: ${this.mvpEnabled ? "enabled" : "disabled"}`);
    console.error(`   Docs: ${DOCS_DIR}`);

    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
      }> = [];

      // Add GDE tools if enabled
      if (this.gdeEnabled) {
        tools.push(
          ...GDE_TOOLS.map((tool) => ({
            ...tool,
            name: tool.name.replace(/^submit_/, "submit_gde_"),
            description: tool.description.replace(/ draft$/, " draft to the Google GDE program (Advocu)"),
          })),
          GDE_LIST_ACTIVITIES_TOOL,
          GDE_UPDATE_ACTIVITY_TOOL,
        );
      }

      // Add documentation tools (always available)
      tools.push(
        {
          name: "list_documentation",
          description: "List all available documentation resources",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_documentation",
          description: "Get a specific documentation file by name",
          inputSchema: {
            type: "object",
            properties: {
              documentName: {
                type: "string",
                enum: ["api-reference", "mvp-api-reference", "mvp-fixes-changelog", "error-handling", "mcp-resources"],
                description: "Name of the documentation to retrieve",
              },
            },
            required: ["documentName"],
          },
        },
      );

      // Add MVP tools if enabled
      if (this.mvpEnabled) {
        tools.push(
          {
            name: "submit_mvp_video",
            description: "Submit a video activity to Microsoft MVP. Valid roles for videos: Host, Presenter, Speaker.",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1, maxLength: 100 },
                description: { type: "string", maxLength: 1000 },
                date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                url: { type: "string", pattern: "^https?://.*" },
                targetAudience: {
                  type: "array",
                  items: { type: "string", enum: Object.values(MVPTargetAudience) },
                  minItems: 1,
                },
                role: {
                  type: "string",
                  enum: ["Host", "Presenter", "Speaker"],
                  description: "Valid roles for video activities",
                },
                technologyFocusArea: {
                  type: "string",
                  description: "Main technology area (e.g., 'Web Development', 'Cloud & AI')",
                },
                liveStreamViews: { type: "integer", minimum: 0 },
                onDemandViews: { type: "integer", minimum: 0 },
                numberOfSessions: { type: "integer", minimum: 1, default: 1 },
                isPrivate: { type: "boolean", default: false },
              },
              required: [
                "title",
                "description",
                "date",
                "url",
                "targetAudience",
                "role",
                "technologyFocusArea",
                "liveStreamViews",
                "onDemandViews",
              ],
            },
          },
          {
            name: "submit_mvp_blog",
            description: "Submit a blog post activity to Microsoft MVP",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1, maxLength: 100 },
                description: { type: "string", maxLength: 1000 },
                date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                url: { type: "string", pattern: "^https?://.*" },
                targetAudience: {
                  type: "array",
                  items: { type: "string", enum: Object.values(MVPTargetAudience) },
                  minItems: 1,
                },
                role: { type: "string", enum: Object.values(MVPActivityRole) },
                technologyFocusArea: { type: "string" },
                additionalTechnologyAreas: { type: "array", items: { type: "string" } },
                numberOfViews: { type: "integer", minimum: 0 },
                subscriberBase: { type: "integer", minimum: 0 },
                isPrivate: { type: "boolean", default: false },
              },
              required: [
                "title",
                "description",
                "date",
                "url",
                "targetAudience",
                "role",
                "technologyFocusArea",
                "numberOfViews",
              ],
            },
          },
          {
            name: "submit_mvp_speaking",
            description: "Submit a speaking/conference activity to Microsoft MVP",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string", minLength: 1, maxLength: 100 },
                description: { type: "string", maxLength: 1000 },
                date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                url: { type: "string", pattern: "^https?://.*" },
                targetAudience: {
                  type: "array",
                  items: { type: "string", enum: Object.values(MVPTargetAudience) },
                  minItems: 1,
                },
                role: { type: "string", enum: Object.values(MVPActivityRole) },
                technologyFocusArea: { type: "string" },
                additionalTechnologyAreas: { type: "array", items: { type: "string" } },
                inPersonAttendees: { type: "integer", minimum: 0 },
                numberOfSessions: { type: "integer", minimum: 1, default: 1 },
                liveStreamViews: { type: "integer", minimum: 0 },
                onDemandViews: { type: "integer", minimum: 0 },
                isPrivate: { type: "boolean", default: false },
              },
              required: [
                "title",
                "description",
                "date",
                "url",
                "targetAudience",
                "role",
                "technologyFocusArea",
                "inPersonAttendees",
                "numberOfSessions",
              ],
            },
          },
        );
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Documentation tools
        if (name === "list_documentation") {
          return await this.listDocumentation();
        }
        if (name === "get_documentation") {
          return await this.getDocumentation(args as { documentName: string });
        }

        // MVP tools
        if (name.startsWith("submit_mvp_")) {
          if (!this.mvpEnabled) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "MVP tools are not enabled. Please configure MVP credentials.",
            );
          }
          switch (name) {
            case "submit_mvp_video":
              return await this.submitMVPVideoActivity(args as unknown as MVPVideoActivity);
            case "submit_mvp_blog":
              return await this.submitMVPBlogActivity(args as unknown as MVPBlogActivity);
            case "submit_mvp_speaking":
              return await this.submitMVPSpeakingActivity(args as unknown as MVPSpeakingActivity);
          }
        }

        // GDE tools
        if (name === GDE_LIST_ACTIVITIES_TOOL.name) {
          if (!this.gdeEnabled) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "GDE tools are not enabled. Please configure GDE credentials.",
            );
          }
          return await this.listGDEActivities((args ?? {}) as ActivityListQuery);
        }

        if (name === GDE_UPDATE_ACTIVITY_TOOL.name) {
          if (!this.gdeEnabled) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "GDE tools are not enabled. Please configure GDE credentials.",
            );
          }
          return await this.updateGDEActivity((args ?? {}) as unknown as ActivityUpdateRequest);
        }

        if (name.startsWith("submit_gde_")) {
          if (!this.gdeEnabled) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              "GDE tools are not enabled. Please configure GDE credentials.",
            );
          }
          const endpoint = GDE_TOOL_ENDPOINTS[name.replace(/^submit_gde_/, "submit_")];
          if (endpoint) {
            // Every draft field is optional, so a call without arguments still sends an empty JSON object
            return await this.submitGDEActivityDraft(endpoint, (args ?? {}) as unknown as GDEActivityDraft);
          }
        }

        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        const errorMsg = this.getErrorMessage(error);
        throw new McpError(ErrorCode.InternalError, `Failed to execute tool '${name}': ${errorMsg}`);
      }
    });
  }

  private setupResourceHandlers() {
    // List available documentation resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: DOCUMENTATION_RESOURCES.map((doc) => ({
          uri: doc.uri,
          name: doc.name,
          description: doc.description,
          mimeType: doc.mimeType,
        })),
      };
    });

    // Read a specific documentation resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      // Find the requested resource
      const resource = DOCUMENTATION_RESOURCES.find((doc) => doc.uri === uri);

      if (!resource) {
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }

      try {
        // Read the file from the docs directory
        const filePath = join(DOCS_DIR, resource.file);
        const content = await readFile(filePath, "utf-8");

        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text: content,
            },
          ],
        };
      } catch (error) {
        const errorMsg = this.getErrorMessage(error);
        throw new McpError(ErrorCode.InternalError, `Failed to read resource '${resource.name}': ${errorMsg}`);
      }
    });
  }

  // Documentation Tools
  private async listDocumentation() {
    const docsList = DOCUMENTATION_RESOURCES.map((doc) => ({
      name: doc.uri.replace("docs://", ""),
      title: doc.name,
      description: doc.description,
    }));

    return {
      content: [
        {
          type: "text",
          text: `📚 Available Documentation:\n\n${docsList
            .map((doc, i) => `${i + 1}. **${doc.title}** (${doc.name})\n   ${doc.description}`)
            .join("\n\n")}`,
        },
      ],
    };
  }

  private async getDocumentation(args: { documentName: string }) {
    const { documentName } = args;
    const uri = `docs://${documentName}`;

    // Find the resource
    const resource = DOCUMENTATION_RESOURCES.find((doc) => doc.uri === uri);

    if (!resource) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Documentation not found: ${documentName}\n\nAvailable docs: ${DOCUMENTATION_RESOURCES.map((d) => d.uri.replace("docs://", "")).join(", ")}`,
          },
        ],
      };
    }

    try {
      // Read the file
      const filePath = join(DOCS_DIR, resource.file);
      const content = await readFile(filePath, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `# ${resource.name}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      const errorMsg = this.getErrorMessage(error);
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to read ${resource.name}: ${errorMsg}`,
          },
        ],
      };
    }
  }

  // MVP Methods
  private async submitMVPVideoActivity(data: Partial<MVPVideoActivity>) {
    const activity: MVPVideoActivity = {
      id: 0,
      activityTypeName: MVPActivityType.VIDEO,
      typeName: "Video",
      date: new Date(data.date!).toISOString(),
      description: data.description!,
      isPrivate: data.isPrivate ?? false,
      targetAudience: data.targetAudience!,
      tenant: "MVP",
      title: data.title!,
      url: data.url!,
      userProfileId: this.mvpUserProfileId!,
      role: data.role!,
      technologyFocusArea: data.technologyFocusArea!,
      additionalTechnologyAreas: [],
      liveStreamViews: data.liveStreamViews!,
      onDemandViews: data.onDemandViews!,
      numberOfSessions: data.numberOfSessions ?? 1,
      inPersonAttendees: 0,
      subscriberBase: 0,
      imageUrl: "",
    };

    return await this.submitMVPActivity(activity);
  }

  private async submitMVPBlogActivity(data: Partial<MVPBlogActivity>) {
    const activity: MVPBlogActivity = {
      id: 0,
      activityTypeName: MVPActivityType.BLOG,
      typeName: "Blog",
      date: new Date(data.date!).toISOString(),
      description: data.description!,
      isPrivate: data.isPrivate ?? false,
      targetAudience: data.targetAudience!,
      tenant: "MVP",
      title: data.title!,
      url: data.url!,
      userProfileId: this.mvpUserProfileId!,
      role: data.role!,
      technologyFocusArea: data.technologyFocusArea!,
      additionalTechnologyAreas: data.additionalTechnologyAreas,
      numberOfViews: data.numberOfViews!,
      subscriberBase: data.subscriberBase ?? 0,
      imageUrl: "",
    };

    return await this.submitMVPActivity(activity);
  }

  private async submitMVPSpeakingActivity(data: Partial<MVPSpeakingActivity>) {
    const activity: MVPSpeakingActivity = {
      id: 0,
      activityTypeName: MVPActivityType.SPEAKING_CONFERENCE,
      typeName: "Speaking",
      date: new Date(data.date!).toISOString(),
      description: data.description!,
      isPrivate: data.isPrivate ?? false,
      targetAudience: data.targetAudience!,
      tenant: "MVP",
      title: data.title!,
      url: data.url!,
      userProfileId: this.mvpUserProfileId!,
      role: data.role!,
      technologyFocusArea: data.technologyFocusArea!,
      additionalTechnologyAreas: data.additionalTechnologyAreas,
      inPersonAttendees: data.inPersonAttendees!,
      numberOfSessions: data.numberOfSessions ?? 1,
      liveStreamViews: data.liveStreamViews ?? 0,
      onDemandViews: data.onDemandViews ?? 0,
      imageUrl: "",
    };

    return await this.submitMVPActivity(activity);
  }

  private async submitMVPActivity(activity: MVPVideoActivity | MVPBlogActivity | MVPSpeakingActivity) {
    const url = `${this.mvpBaseUrl}/Activities/`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.mvpAccessToken}`,
        },
        body: JSON.stringify({ activity }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `MVP API error (${response.status})`;

        if (response.status === 401) {
          errorMessage =
            "❌ MVP authentication failed. Your MVP_ACCESS_TOKEN may be expired or invalid.\n\nTo fix:\n1. Log in to https://mvp.microsoft.com/\n2. Open DevTools → Network tab\n3. Create/edit an activity\n4. Export as HAR file\n5. Extract the Bearer token from Authorization header\n6. Update your configuration";
        } else if (response.status === 400) {
          errorMessage = `❌ MVP API rejected the request:\n\n${errorText}\n\nPlease check:\n- Activity type is correct for the data provided\n- Role is valid for this activity type\n- All required fields are present\n- Date format is correct (YYYY-MM-DD)`;
        } else if (response.status === 429) {
          errorMessage = "⏱️ MVP API rate limit exceeded. Please wait a moment and try again.";
        } else {
          errorMessage = `❌ MVP API error (${response.status}):\n\n${errorText}`;
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
            text: `✅ MVP Activity submitted!\n\nType: ${activity.activityTypeName}\nTitle: ${activity.title}\n\nResponse: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      const errorMsg = this.getErrorMessage(error);
      throw new McpError(
        ErrorCode.InternalError,
        `❌ Failed to submit MVP activity:\n\n${errorMsg}\n\nActivity type: ${activity.activityTypeName}\nTitle: ${activity.title}`,
      );
    }
  }

  // GDE Methods
  private async submitGDEActivityDraft(endpoint: string, data: GDEActivityDraft) {
    const url = `${this.gdeBaseUrl}/activity-drafts/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.gdeAccessToken}`,
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
          isError: true,
        };
      }

      const result = (await response.json()) as Record<string, unknown>;

      return {
        content: [
          {
            type: "text",
            text: `✅ GDE Activity submitted!\n\nEndpoint: ${endpoint}\n\nResponse: ${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      const errorMsg = this.getErrorMessage(error);
      throw new McpError(
        ErrorCode.InternalError,
        `❌ Failed to submit GDE activity:\n\n${errorMsg}\n\nEndpoint: ${endpoint}`,
      );
    }
  }

  private gdeErrorResult(text: string) {
    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
      isError: true,
    };
  }

  /**
   * Fetches one page of GET /activities. API errors come back as a message so
   * that callers can report them as a failed tool call.
   */
  private async fetchGDEActivitiesPage(
    query: ActivityListQuery,
  ): Promise<{ result: ActivityListResponse } | { errorMessage: string }> {
    const params = new URLSearchParams();
    for (const key of ["from", "to", "updatedAfter", "page", "size"] as const) {
      const value = query[key];
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    const url = `${this.gdeBaseUrl}/activities${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.gdeAccessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (response.status === 401) {
        return {
          errorMessage:
            "❌ GDE authentication failed. Your ADVOCU_ACCESS_TOKEN may be expired or invalid.\n\nPlease check your Advocu access token configuration.",
        };
      }
      if (response.status === 400) {
        return {
          errorMessage: `❌ GDE API rejected the request:\n\n${errorText}\n\nPlease check:\n- Dates are UTC date-time strings (e.g. 2026-01-01T00:00:00Z)\n- page is 0 or more and size is between 1 and 100`,
        };
      }
      if (response.status === 429) {
        return { errorMessage: "⏱️ GDE API rate limit exceeded (30 requests/minute). Please wait and try again." };
      }
      return { errorMessage: `❌ GDE API error (${response.status}):\n\n${errorText}` };
    }

    // The API returns no totals, so a missing or malformed content array must
    // not be reported as an empty page (which would mean "no more activities").
    const body = await response.text();
    let result: ActivityListResponse | undefined;
    try {
      result = JSON.parse(body) as ActivityListResponse;
    } catch {
      result = undefined;
    }
    if (!result || typeof result !== "object" || !Array.isArray(result.content)) {
      return {
        errorMessage: `❌ Unexpected response from GDE API (${response.status}): expected an object with a "content" array.\n\n${body.slice(0, 500)}`,
      };
    }
    return { result };
  }

  private async listGDEActivities(query: ActivityListQuery) {
    try {
      const page = await this.fetchGDEActivitiesPage(query);
      if ("errorMessage" in page) {
        return this.gdeErrorResult(page.errorMessage);
      }
      const { result } = page;

      const count = result.content.length;
      const pageNumber = query.page ?? 0;
      const size = query.size ?? 10;
      const pageNote =
        count === 0
          ? "No activities on this page, so there are no more pages."
          : count < size
            ? "The page is not full, so this is probably the last page."
            : `There may be more activities: request page ${pageNumber + 1} to continue.`;

      return {
        content: [
          {
            type: "text",
            text: `📋 GDE activities: page ${pageNumber}, ${count} item(s) (page size ${size}). ${pageNote}\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      const errorMsg = this.getErrorMessage(error);
      throw new McpError(ErrorCode.InternalError, `❌ Failed to list GDE activities:\n\n${errorMsg}`);
    }
  }

  /**
   * The API has no endpoint for reading a single activity, so it is looked up
   * by walking the list. The page limit guards against an API that ignores the
   * page parameter; 20 pages of 100 is far more than one person's activities.
   */
  private async findGDEActivity(activityId: string): Promise<{ activity: Activity } | { errorMessage: string }> {
    const size = 100;
    for (let page = 0; page < 20; page++) {
      const fetched = await this.fetchGDEActivitiesPage({ page, size });
      if ("errorMessage" in fetched) {
        return fetched;
      }
      const activity = fetched.result.content.find((candidate) => candidate.activityId === activityId);
      if (activity) {
        return { activity };
      }
      if (fetched.result.content.length < size) {
        return {
          errorMessage: `❌ No activity with id "${activityId}" was found. Use list_gde_activities to get ids.`,
        };
      }
    }
    return { errorMessage: `❌ No activity with id "${activityId}" was found in the first 2000 activities.` };
  }

  /**
   * Previews an update, or applies a previewed one. Applying re-reads the
   * activity and refuses to send if it changed since the preview. The reference
   * documents no conditional update, so a change made outside this server
   * between that read and the PATCH cannot be detected.
   *
   * Within this server, applying locks the activity and invalidates its other
   * previews before the first await, so only one update of an activity can run
   * at a time. A preview that started earlier sees the new generation and
   * returns no id, because what it read may already be out of date.
   */
  private async updateGDEActivity({ activityId, data, apply, confirmationId }: ActivityUpdateRequest) {
    if (typeof activityId !== "string" || !activityId) {
      return this.gdeErrorResult("❌ activityId is required. Use list_gde_activities to get ids.");
    }
    if (!isPlainObject(data) || Object.keys(data).length === 0) {
      return this.gdeErrorResult("❌ data must be an object with at least one field to change.");
    }
    if ("metrics" in data && (!isPlainObject(data.metrics) || Object.keys(data.metrics).length === 0)) {
      return this.gdeErrorResult("❌ Nothing was sent. metrics must be an object with at least one value.");
    }

    if (this.gdeActivitiesBeingUpdated.has(activityId)) {
      return this.gdeErrorResult(
        "❌ Nothing was sent. Another update of this activity is in progress. After it finishes, call without apply to preview again.",
      );
    }
    const generation = this.gdeUpdateGenerations.get(activityId) ?? 0;

    let pending: PendingGDEUpdate | undefined;
    if (apply === true) {
      pending = typeof confirmationId === "string" ? this.pendingGDEUpdates.get(confirmationId) : undefined;
      if (!pending) {
        return this.gdeErrorResult(
          "❌ Nothing was sent. apply: true needs the confirmationId of a preview, and each id works once. Call without apply to get a new preview.",
        );
      }
      if (pending.activityId !== activityId || pending.data !== canonicalJson(data)) {
        return this.gdeErrorResult(
          "❌ Nothing was sent. activityId or data differ from the preview of this confirmationId. Call without apply to preview the new content.",
        );
      }
      // Done before the first await, so that parallel calls cannot get past the
      // checks above. A failure from here on, including one where the stored
      // state is uncertain, goes through a new preview.
      this.gdeActivitiesBeingUpdated.add(activityId);
      this.gdeUpdateGenerations.set(activityId, generation + 1);
      for (const [id, other] of this.pendingGDEUpdates) {
        if (other.activityId === activityId) {
          this.pendingGDEUpdates.delete(id);
        }
      }
    }

    try {
      const found = await this.findGDEActivity(activityId);
      if ("errorMessage" in found) {
        return this.gdeErrorResult(found.errorMessage);
      }
      const { activity } = found;

      if (!pending && (this.gdeUpdateGenerations.get(activityId) ?? 0) !== generation) {
        return this.gdeErrorResult(
          "❌ No preview was created because the activity was being updated at the same time. Call without apply to preview it again.",
        );
      }

      const updatable = getGDEUpdatableFields(activity.type);
      if (!updatable) {
        return this.gdeErrorResult(
          `❌ Activities of type "${activity.type}" cannot be updated: the API reference defines updates for the 7 draft types only.`,
        );
      }
      const unknownFields = Object.keys(data).filter((field) => !updatable.fields.includes(field));
      if (isPlainObject(data.metrics)) {
        unknownFields.push(
          ...Object.keys(data.metrics)
            .filter((field) => !updatable.metrics.includes(field))
            .map((field) => `metrics.${field}`),
        );
      }
      if (unknownFields.length > 0) {
        return this.gdeErrorResult(
          `❌ Nothing was sent. These fields do not apply to "${activity.type}" activities: ${unknownFields.join(", ")}\n\nFields for this type: ${updatable.fields.join(", ")}`,
        );
      }

      if (pending && canonicalJson(pending.activity) !== canonicalJson(activity)) {
        const changedFields = listChangedActivityFields(pending.activity, activity).join(", ");
        return this.gdeErrorResult(
          `❌ Nothing was sent. The activity changed after the preview (${changedFields}). Call without apply to preview it again.`,
        );
      }

      const changes = describeActivityChanges(activity.data, data);
      const summary = `Activity: ${String(activity.data.title ?? "(no title)")} (${activity.type}, ${activityId})`;
      if (changes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ Nothing was sent: the fields already have these values.\n\n${summary}`,
            },
          ],
        };
      }
      const changeList = changes.join("\n");

      if (!pending) {
        const body = JSON.stringify({ data });
        const newId = randomUUID();
        if (this.pendingGDEUpdates.size >= MAX_PENDING_GDE_UPDATES) {
          const oldest = this.pendingGDEUpdates.keys().next().value;
          if (oldest !== undefined) {
            this.pendingGDEUpdates.delete(oldest);
          }
        }
        this.pendingGDEUpdates.set(newId, { activityId, data: canonicalJson(data), body, activity });
        return {
          content: [
            {
              type: "text",
              text: `🔍 Preview only, nothing was sent.\n\n${summary}\n\nChanges:\n${changeList}\n\nRequest body to send: ${body}\nFields not in the request body are not sent.\n\nconfirmationId: ${newId}\n\nShow these changes to the user. After they confirm, call again with the same activityId and data, apply: true and this confirmationId. It works once.`,
            },
          ],
        };
      }

      const response = await fetch(`${this.gdeBaseUrl}/activities/${encodeURIComponent(activityId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.gdeAccessToken}`,
        },
        body: pending.body,
      });
      const body = await response.text();

      if (!response.ok) {
        if (response.status === 401) {
          return this.gdeErrorResult(
            "❌ GDE authentication failed. Your ADVOCU_ACCESS_TOKEN may be expired or invalid.\n\nPlease check your Advocu access token configuration.",
          );
        }
        if (response.status === 400) {
          return this.gdeErrorResult(
            `❌ GDE API rejected the update:\n\n${body}\n\nPlease check:\n- Field values match expected formats\n- Tags are valid\n- country and inPersonAttendees match the eventFormat`,
          );
        }
        if (response.status === 429) {
          return this.gdeErrorResult("⏱️ GDE API rate limit exceeded (30 requests/minute). Please wait and try again.");
        }
        return this.gdeErrorResult(`❌ GDE API error (${response.status}):\n\n${body}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ GDE activity updated.\n\n${summary}\n\nChanges:\n${changeList}\n\nResponse: ${body}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) throw error;
      const errorMsg = this.getErrorMessage(error);
      throw new McpError(ErrorCode.InternalError, `❌ Failed to update GDE activity:\n\n${errorMsg}`);
    } finally {
      if (pending) {
        this.gdeActivitiesBeingUpdated.delete(activityId);
      }
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Unified Activity Reporting MCP Server running");
  }
}
