/**
 * @fileoverview Workshop activity draft interface
 * @description Interface for training workshops and educational sessions
 */

import type { EventFormat } from "../types/EventFormat.js";
import type { ActivityDraftBase } from "./ActivityDraftBase.js";

/**
 * Interface for workshop activity drafts
 * Used for training workshops and educational sessions
 */
export interface WorkshopDraft extends ActivityDraftBase {
  /** Date when the activity took place (YYYY-MM-DD format) */
  activityDate?: string;
  /** Metrics related to training reach */
  metrics?: {
    /** Number of people who have been trained */
    attendees?: number;
  };
  /** Format of the event (In-Person, Virtual, or Hybrid) */
  eventFormat?: EventFormat;
  /** Country where the event took place (1-100 characters; accepted only when eventFormat is In-Person or Hybrid) */
  country?: string;
  /** Number of in-person attendees (accepted only when eventFormat is Hybrid) */
  inPersonAttendees?: number;
  /** URL link to the workshop or event */
  activityUrl?: string;
}
