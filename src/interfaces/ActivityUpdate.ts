/**
 * @fileoverview Activity update interfaces
 * @description Arguments of the update_gde_activity tool, which maps to
 * PATCH /activities/{activityId}
 */

/**
 * Arguments of the update_gde_activity tool
 */
export interface ActivityUpdateRequest {
  /** Activity id, as returned by GET /activities */
  activityId: string;
  /** Fields to change. Only these fields are sent to the API */
  data: Record<string, unknown>;
  /** Send the update. Without it the tool only previews the changes */
  apply?: boolean;
}
