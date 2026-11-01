/**
 * @fileoverview GDE (Advocu) tool definitions
 * @description Single source of truth for the GDE activity tools and the
 * Advocu activity-draft endpoints they map to. Shared by the unified server
 * and the legacy GDE-only server so the two cannot drift apart again.
 */

import {
  ContentType,
  Country,
  EventFormat,
  InteractionFormat,
  InteractionType,
  ProductFeedbackContentType,
  SignificanceType,
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            readers: {
              type: "integer",
              minimum: 1,
              description: "How many people read your content?",
            },
          },
          required: ["readers"],
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
      required: ["title", "description", "activityDate", "contentType", "metrics", "activityUrl"],
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            attendees: {
              type: "integer",
              minimum: 1,
              description: "How many people attended your session in total?",
            },
          },
          required: ["attendees"],
        },
        eventFormat: {
          type: "string",
          enum: Object.values(EventFormat),
          description: "Select event format",
        },
        country: {
          type: "string",
          enum: Object.values(Country),
          description: "Country (required if eventFormat is In-Person or Hybrid)",
        },
        inPersonAttendees: {
          type: "integer",
          minimum: 0,
          description: "In-person attendees (required if eventFormat is Hybrid or In-Person)",
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
      required: ["title", "description", "activityDate", "metrics", "eventFormat", "activityUrl"],
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            attendees: {
              type: "integer",
              minimum: 1,
              description: "How many people have been trained?",
            },
          },
          required: ["attendees"],
        },
        eventFormat: {
          type: "string",
          enum: Object.values(EventFormat),
          description: "Select event format",
        },
        country: {
          type: "string",
          enum: Object.values(Country),
          description: "Country (required if eventFormat is In-Person or Hybrid)",
        },
        inPersonAttendees: {
          type: "integer",
          minimum: 0,
          description: "In-person attendees (required if eventFormat is Hybrid or In-Person)",
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
      required: ["title", "description", "activityDate", "metrics", "eventFormat", "activityUrl"],
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            attendees: {
              type: "integer",
              minimum: 1,
              description: "How many people have been mentored in total?",
            },
          },
          required: ["attendees"],
        },
        eventFormat: {
          type: "string",
          enum: Object.values(EventFormat),
          description: "Select event format",
        },
        country: {
          type: "string",
          enum: Object.values(Country),
          description: "Country (required if eventFormat is In-Person or Hybrid)",
        },
        inPersonAttendees: {
          type: "integer",
          minimum: 0,
          description: "In-person attendees (required if eventFormat is Hybrid or In-Person)",
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
      required: ["title", "description", "activityDate", "metrics", "eventFormat", "activityUrl"],
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            timeSpent: {
              type: "integer",
              minimum: 1,
              description: "Time spent (in minutes)",
            },
          },
          required: ["timeSpent"],
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
      required: ["title", "description", "activityDate", "contentType", "productDescription", "metrics"],
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            timeSpent: {
              type: "integer",
              minimum: 1,
              description: "Time spent (in minutes)",
            },
          },
          required: ["timeSpent"],
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
      required: ["title", "description", "activityDate", "format", "interactionType", "metrics"],
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
        activityDate: {
          type: "string",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          description: "Activity Date (YYYY-MM-DD format)",
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
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags (optional)",
          minItems: 0,
        },
        metrics: {
          type: "object",
          properties: {
            impact: {
              type: "integer",
              minimum: 1,
              description: "Impact (views, reads, attendees, etc.)",
            },
          },
          required: ["impact"],
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
      required: [
        "title",
        "description",
        "activityDate",
        "whyIsSignificant",
        "significanceType",
        "activityUrl",
        "metrics",
      ],
    },
  },
];
