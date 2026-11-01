/**
 * @fileoverview Public speaking activity draft interface
 * @description Interface for talks, conferences, and public presentations
 */

import type { EventFormat } from "../types/EventFormat.js";
import type { ActivityDraftBase } from "./ActivityDraftBase.js";

/**
 * Interface for public speaking activity drafts
 * Used for talks, conferences, and public presentations
 */
export interface PublicSpeakingDraft extends ActivityDraftBase {
  /** Date when the activity took place (YYYY-MM-DD format) */
  activityDate?: string;
  /** Metrics related to attendance */
  metrics?: {
    /** Total number of people who attended the session */
    attendees?: number;
  };
  /** Format of the event (In-Person, Virtual, or Hybrid) */
  eventFormat?: EventFormat;
  /** Country where the event took place (1-100 characters; accepted only when eventFormat is In-Person or Hybrid) */
  country?: string;
  /** Number of in-person attendees (accepted only when eventFormat is Hybrid) */
  inPersonAttendees?: number;
  /** URL link to the event or presentation */
  activityUrl?: string;
}
