/**
 * @fileoverview Content types for activity submissions
 * @description Enum defining the available content types for content creation activities
 */

/**
 * Enum for content types in content creation activities
 * Used to categorize different types of content submissions
 * Values must match the options offered by the Advocu content-creation form;
 * the API rejects anything else (e.g. the former "Reusable GCP presentations").
 */
export enum ContentType {
  ARTICLES = "Articles",
  BOOKS = "Books",
  CODE_CONTRIBUTION = "Code contribution",
  DEMOS = "Demos",
  NEWSLETTERS = "Newsletters",
  PODCASTS = "Podcasts",
  VIDEOS = "Videos",
}
