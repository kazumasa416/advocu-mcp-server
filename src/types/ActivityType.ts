/**
 * @fileoverview Activity types returned by the activity list endpoint
 * @description Enum defining the activity types that GET /activities can return
 */

/**
 * Enum for activity types in GET /activities responses
 * Includes the 7 draft types plus GITHUB_REPOSITORY and YOUTUBE_VIDEO, which can
 * be listed but have no activity-draft endpoint
 */
export enum ActivityType {
  CONTENT_CREATION = "content-creation",
  GITHUB_REPOSITORY = "github-repository",
  INTERACTION_WITH_GOOGLERS = "interaction-with-googlers",
  MENTORING = "mentoring",
  PRODUCT_FEEDBACK_GIVEN = "product-feedback-given",
  PUBLIC_SPEAKING = "public-speaking",
  STORIES = "stories",
  WORKSHOP = "workshop",
  YOUTUBE_VIDEO = "youtube-video",
}
