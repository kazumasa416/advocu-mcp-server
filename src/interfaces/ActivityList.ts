/**
 * @fileoverview Activity list interfaces
 * @description Query parameters and response shape of GET /activities
 */

import type { ActivityType } from "../types/ActivityType.js";

/**
 * Query parameters for GET /activities
 * Dates are UTC date-time strings, e.g. 2026-01-01T00:00:00Z
 */
export interface ActivityListQuery {
  /** Filter by submission date from (inclusive) */
  from?: string;
  /** Filter by submission date to (exclusive) */
  to?: string;
  /** Filter activities updated after this date */
  updatedAfter?: string;
  /** Page number, starting at 0 */
  page?: number;
  /** Page size (1-100, API default 10) */
  size?: number;
}

/**
 * An activity returned by GET /activities
 * The shape of data depends on type and differs from the draft interfaces
 * (for example it can contain city, countryIso and imageUrl), so it is kept
 * as an untyped record here.
 */
export interface Activity {
  type: ActivityType;
  data: Record<string, unknown>;
  submissionDate: string;
  updatedDate: string;
  archiveDate?: string;
  activityId: string;
}

/**
 * Response of GET /activities, sorted by submission date in ascending order
 * The API does not return totals; an empty content array means there are no
 * more pages.
 */
export interface ActivityListResponse {
  content: Activity[];
}
