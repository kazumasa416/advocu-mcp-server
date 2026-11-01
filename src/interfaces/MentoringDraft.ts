/**
 * @fileoverview Mentoring activity draft interface
 * @description Interface for mentoring sessions and guidance activities
 */

import type { EventFormat } from "../types/EventFormat.js";
import type { ActivityDraftBase } from "./ActivityDraftBase.js";

/**
 * Interface for mentoring activity drafts
 * Used for mentoring sessions and guidance activities
 */
export interface MentoringDraft extends ActivityDraftBase {
  /** Date when the activity took place (YYYY-MM-DD format) */
  activityDate?: string;
  /** Metrics related to mentoring reach */
  metrics?: {
    /** Number of people who have been mentored in total */
    attendees?: number;
  };
  /** Format of the event (In-Person, Virtual, or Hybrid) */
  eventFormat?: EventFormat;
  /** Country where the event took place (1-100 characters; accepted only when eventFormat is In-Person or Hybrid) */
  country?: string;
  /** Number of in-person attendees (accepted only when eventFormat is Hybrid) */
  inPersonAttendees?: number;
  /** URL link to the event or relevant resource */
  activityUrl?: string;
}
