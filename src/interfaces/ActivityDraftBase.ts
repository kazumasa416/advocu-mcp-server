/**
 * @fileoverview Base interface for activity drafts
 * @description Common properties shared by all activity draft types
 */

/**
 * Base interface for all activity drafts
 * Contains the common properties shared by all activity types. Every field is
 * optional in the Advocu draft endpoints; drafts are completed in the portal.
 */
export interface ActivityDraftBase {
  /** Title of the activity */
  title?: string;
  /** Description of what the activity was about */
  description?: string;
  /** Optional tags to categorize the activity */
  tags?: string[];
  /** Optional additional information about the activity */
  additionalInfo?: string;
  /** Whether to make the activity private (defaults to false) */
  private?: boolean;
}
