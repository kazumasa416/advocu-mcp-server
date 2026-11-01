/**
 * @fileoverview GDE (Advocu) tool definitions
 * @description Single source of truth for the GDE activity tools and the
 * Advocu activity-draft endpoints they map to. Shared by the unified server
 * and the legacy GDE-only server so the two cannot drift apart again.
 */

import {
  ContentType,
  EventFormat,
  InteractionFormat,
  InteractionType,
  ProductFeedbackContentType,
  SignificanceType,
  Tag,
} from "./types/index.js";

export interface GDEToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Maps each GDE tool name (without the optional "gde_" prefix) to its
 * Advocu activity-draft endpoint.
 */
export const GDE_TOOL_ENDPOINTS: Record<string, string> = {
  submit_content_creation: "content-creation",
  submit_public_speaking: "public-speaking",
  submit_workshop: "workshop",
  submit_mentoring: "mentoring",
  submit_product_feedback: "product-feedback-given",
  submit_googler_interaction: "interaction-with-googlers",
  submit_story: "stories",
};

/**
 * Shared schema for the optional tags field. The API reference defines tags as
 * an enum, but Advocu changes the list over time, so the known values are listed
 * in the description instead of an enum and validation is left to the API.
 * Values are quoted so that the trailing spaces some of them carry stay visible.
 */
const TAGS_SCHEMA = {
  type: "array",
  items: { type: "string" },
  description: `Tags (optional). Use the exact values, including any trailing spaces: ${Object.values(Tag)
    .map((tag) => JSON.stringify(tag))
    .join(", ")}`,
  minItems: 0,
};

/**
 * Every field is optional in the Advocu draft endpoints: drafts can be saved
 * incomplete and finished in the portal before submission, so no tool marks
 * fields as required. Some fields are only accepted for certain event formats
 * (see country and inPersonAttendees).
 * Reference: https://app.advocu.com/settings/integrations/personal-api
 */
export const GDE_TOOLS: GDEToolDefinition[] = [
  {
    name: "submit_content_creation",
    description: "Submit a content creation activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "What was the title?",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "What was it about?",
          maxLength: 2000,
        },
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Date published (YYYY-MM-DD format)",
        },
        contentType: {
          type: "string",
          description: "Content type",
          enum: Object.values(ContentType),
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            readers: {
              type: "integer",
              minimum: 1,
              description: "How many people read your content?",
            },
          },
        },
        activityUrl: {
          type: "string",
          maxLength: 500,
          pattern: "^https?://.*",
          description: "Link to Content",
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
  {
    name: "submit_public_speaking",
    description: "Submit a public speaking activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "What was the title of your talk?",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "What was it about?",
          maxLength: 2000,
        },
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Date of your talk (YYYY-MM-DD format)",
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            attendees: {
              type: "integer",
              minimum: 1,
              description: "How many people attended your session in total?",
            },
          },
        },
        eventFormat: {
          type: "string",
          enum: Object.values(EventFormat),
          description: "Select event format",
        },
        country: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Country where the event took place. Accepted only when eventFormat is In-Person or Hybrid",
        },
        inPersonAttendees: {
          type: "integer",
          minimum: 0,
          description: "Out of all, how many people attended in person? Accepted only when eventFormat is Hybrid",
        },
        activityUrl: {
          type: "string",
          maxLength: 500,
          pattern: "^https?://.*",
          description: "Event link or relevant URL",
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
  {
    name: "submit_workshop",
    description: "Submit a workshop activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "What was the name of your workshop session?",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "What was it about?",
          maxLength: 2000,
        },
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Date of your workshop (YYYY-MM-DD format)",
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            attendees: {
              type: "integer",
              minimum: 1,
              description: "How many people have been trained?",
            },
          },
        },
        eventFormat: {
          type: "string",
          enum: Object.values(EventFormat),
          description: "Select event format",
        },
        country: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Country where the event took place. Accepted only when eventFormat is In-Person or Hybrid",
        },
        inPersonAttendees: {
          type: "integer",
          minimum: 0,
          description: "Out of all, how many people attended in person? Accepted only when eventFormat is Hybrid",
        },
        activityUrl: {
          type: "string",
          maxLength: 500,
          pattern: "^https?://.*",
          description: "Workshop/event link",
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
  {
    name: "submit_mentoring",
    description: "Submit a mentoring activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "What was the name of your mentoring session?",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "What was it about?",
          maxLength: 2000,
        },
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Date of your mentoring session (YYYY-MM-DD format)",
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            attendees: {
              type: "integer",
              minimum: 1,
              description: "How many people have been mentored in total?",
            },
          },
        },
        eventFormat: {
          type: "string",
          enum: Object.values(EventFormat),
          description: "Select event format",
        },
        country: {
          type: "string",
          minLength: 1,
          maxLength: 100,
          description: "Country where the event took place. Accepted only when eventFormat is In-Person or Hybrid",
        },
        inPersonAttendees: {
          type: "integer",
          minimum: 0,
          description: "Out of all, how many people attended in person? Accepted only when eventFormat is Hybrid",
        },
        activityUrl: {
          type: "string",
          maxLength: 500,
          pattern: "^https?://.*",
          description: "Event or relevant link",
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
  {
    name: "submit_product_feedback",
    description: "Submit a product feedback activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "Description",
          maxLength: 2000,
        },
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Participation Date (YYYY-MM-DD format)",
        },
        contentType: {
          type: "string",
          enum: Object.values(ProductFeedbackContentType),
          description: "Content type",
        },
        productDescription: {
          type: "string",
          maxLength: 500,
          description: "What product was it about?",
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            timeSpent: {
              type: "integer",
              minimum: 1,
              description: "Time spent (in minutes)",
            },
          },
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
  {
    name: "submit_googler_interaction",
    description: "Submit an interaction with Googlers activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "Description",
          maxLength: 2000,
        },
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Interaction Date (YYYY-MM-DD format)",
        },
        format: {
          type: "string",
          enum: Object.values(InteractionFormat),
          description: "Format",
        },
        interactionType: {
          type: "string",
          enum: Object.values(InteractionType),
          description: "Interaction Type",
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            timeSpent: {
              type: "integer",
              minimum: 1,
              description: "Time spent (in minutes)",
            },
          },
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        additionalLinks: {
          type: "string",
          maxLength: 2000,
          description: "Additional links (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
  {
    name: "submit_story",
    description: "Submit a story activity draft",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the story",
          minLength: 3,
          maxLength: 200,
        },
        description: {
          type: "string",
          description: "Description",
          maxLength: 2000,
        },
        whyIsSignificant: {
          type: "string",
          maxLength: 2000,
          description: "Why is it significant",
        },
        significanceType: {
          type: "string",
          enum: Object.values(SignificanceType),
          description: "Significance type",
        },
        activityUrl: {
          type: "string",
          maxLength: 500,
          pattern: "^https?://.*",
          description: "Link",
        },
        tags: TAGS_SCHEMA,
        metrics: {
          type: "object",
          properties: {
            impact: {
              type: "integer",
              minimum: 1,
              description: "Impact (views, reads, attendees, etc.)",
            },
          },
        },
        additionalInfo: {
          type: "string",
          maxLength: 2000,
          description: "Additional information (optional)",
        },
        private: {
          type: "boolean",
          description: "Do you want to make this activity private? (optional)",
        },
      },
    },
  },
];

/**
 * Tool for GET /activities. Kept apart from GDE_TOOLS because it is not an
 * activity-draft submission and is only exposed by the unified server.
 */
export const GDE_LIST_ACTIVITIES_TOOL: GDEToolDefinition = {
  name: "list_gde_activities",
  description:
    "List one page of your submitted Google GDE activities (Advocu), sorted by submission date in ascending order. " +
    "Filters apply to submission date and update date, not to the activity date. " +
    "The API returns no totals: an empty page means there are no more activities.",
  inputSchema: {
    type: "object",
    properties: {
      from: {
        type: "string",
        description: "Filter by submission date from (inclusive), UTC date-time, e.g. 2026-01-01T00:00:00Z",
      },
      to: {
        type: "string",
        description: "Filter by submission date to (exclusive), UTC date-time, e.g. 2026-01-01T00:00:00Z",
      },
      updatedAfter: {
        type: "string",
        description: "Filter activities updated after this date, UTC date-time, e.g. 2026-01-01T00:00:00Z",
      },
      page: {
        type: "integer",
        minimum: 0,
        description: "Page number, starting at 0 (API default 0)",
      },
      size: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Page size, 1-100 (API default 10)",
      },
    },
  },
};

/**
 * Fields accepted by PATCH /activities/{activityId} for one activity type.
 * The API reference defines them per type, with the same names as the draft
 * fields, so they are derived from the draft tools. Returns undefined for types
 * the reference does not define updates for (github-repository, youtube-video).
 */
export function getGDEUpdatableFields(type: string): { fields: string[]; metrics: string[] } | undefined {
  const tool = GDE_TOOLS.find((candidate) => GDE_TOOL_ENDPOINTS[candidate.name] === type);
  if (!tool) {
    return undefined;
  }
  const properties = tool.inputSchema.properties as Record<string, { properties?: Record<string, unknown> }>;
  return { fields: Object.keys(properties), metrics: Object.keys(properties.metrics?.properties ?? {}) };
}

/**
 * The draft and update endpoints use the same fields, but which ones apply
 * depends on the activity type. The server checks them against the type of the
 * activity being updated before anything is sent.
 */
export const GDE_UPDATE_ACTIVITY_TOOL: GDEToolDefinition = {
  name: "update_gde_activity",
  description:
    "Update a submitted Google GDE activity (Advocu). Get the activityId from list_gde_activities. " +
    "Only the fields in data are sent; fields you leave out are not part of the request. " +
    "By default this only previews the changes and sends nothing: show the preview to the user and call again " +
    "with apply: true after they confirm.",
  inputSchema: {
    type: "object",
    properties: {
      activityId: {
        type: "string",
        minLength: 1,
        description: "Activity id, as returned by list_gde_activities",
      },
      apply: {
        type: "boolean",
        description: "Send the update. When omitted or false, the tool only previews the changes",
      },
      data: {
        type: "object",
        minProperties: 1,
        description:
          "Fields to change. Which fields apply depends on the activity type; the preview rejects the others. " +
          "imageUrl and city cannot be updated through the API.",
        properties: {
          title: { type: "string", minLength: 3, maxLength: 200, description: "Title (all types)" },
          description: { type: "string", maxLength: 2000, description: "Description (all types)" },
          tags: {
            ...TAGS_SCHEMA,
            description: `Send the complete list the activity should have. ${TAGS_SCHEMA.description}`,
          },
          private: { type: "boolean", description: "Make this activity private (all types)" },
          additionalInfo: { type: "string", maxLength: 2000, description: "Additional information (all types)" },
          activityDate: {
            type: "string",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "Activity date in YYYY-MM-DD format (all types except stories)",
          },
          activityUrl: {
            type: "string",
            maxLength: 500,
            pattern: "^https?://.*",
            description: "Link (content-creation, mentoring, public-speaking, stories, workshop)",
          },
          contentType: {
            type: "string",
            description: `Content type. content-creation: ${Object.values(ContentType).join(", ")}. product-feedback-given: ${Object.values(ProductFeedbackContentType).join(", ")}`,
          },
          eventFormat: {
            type: "string",
            enum: Object.values(EventFormat),
            description: "Event format (mentoring, public-speaking, workshop)",
          },
          country: {
            type: "string",
            minLength: 1,
            maxLength: 100,
            description:
              "Country (mentoring, public-speaking, workshop). Accepted only when eventFormat is In-Person or Hybrid",
          },
          inPersonAttendees: {
            type: "integer",
            minimum: 0,
            description:
              "People who attended in person (mentoring, public-speaking, workshop). Accepted only when eventFormat is Hybrid",
          },
          productDescription: {
            type: "string",
            maxLength: 500,
            description: "What product was it about? (product-feedback-given)",
          },
          format: {
            type: "string",
            enum: Object.values(InteractionFormat),
            description: "Interaction format (interaction-with-googlers)",
          },
          interactionType: {
            type: "string",
            enum: Object.values(InteractionType),
            description: "Interaction type (interaction-with-googlers)",
          },
          additionalLinks: {
            type: "string",
            maxLength: 2000,
            description: "Additional links (interaction-with-googlers)",
          },
          whyIsSignificant: {
            type: "string",
            maxLength: 2000,
            description: "Why the story is significant (stories)",
          },
          significanceType: {
            type: "string",
            enum: Object.values(SignificanceType),
            description: "Significance type (stories)",
          },
          metrics: {
            type: "object",
            description: "Metrics. Each activity type uses one of these",
            properties: {
              readers: { type: "integer", minimum: 1, description: "Readers (content-creation)" },
              attendees: {
                type: "integer",
                minimum: 1,
                description: "Attendees (mentoring, public-speaking, workshop)",
              },
              timeSpent: {
                type: "integer",
                minimum: 1,
                description: "Time spent in minutes (interaction-with-googlers, product-feedback-given)",
              },
              impact: { type: "integer", minimum: 1, description: "Impact in views, reads, attendees, etc. (stories)" },
            },
          },
        },
      },
    },
    required: ["activityId", "data"],
  },
};
