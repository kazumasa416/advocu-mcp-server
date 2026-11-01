# API Documentation

This document covers both **Microsoft MVP API** and **Google GDE API (Advocu)**.

---

# Microsoft MVP API

## Base URL
```
https://mavenapi-prod.azurewebsites.net/api
```

## Authentication
```
Authorization: Bearer <token>
```

## Endpoint: POST /Activities/

### Request Format

The activity must be wrapped in an `activity` object:

```json
{
  "activity": {
    // ... activity fields
  }
}
```

### Required Headers

```
Content-Type: application/json
Authorization: Bearer <token>
Referer: https://mvp.microsoft.com/
Origin: https://mvp.microsoft.com
```

---

## MVP Activity Types

### Video

**Activity Type**: `"Video"`

**Valid Roles**: `"Host"`, `"Presenter"`, `"Speaker"`

| Name | Type | Description | Restrictions |
|------|------|-------------|-------------|
| id | integer | Activity ID | Always 0 for new activities |
| activityTypeName | string | Activity type | Must be "Video" |
| typeName | string | Type name | Must be "Video" |
| date | string | Publication date | ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) |
| title | string | Video title | min 1, max 100 characters |
| description | string | Description | max 1000 characters |
| url | string | Video URL | Must start with https:// |
| isPrivate | boolean | Private activity | true/false |
| targetAudience | array | Target audiences | enum: Developer, Technical Decision Maker, Business Decision Maker, Student, IT Pro, End User |
| tenant | string | Tenant | Always "MVP" |
| userProfileId | integer | Your profile ID | Your MVP profile ID |
| role | string | Your role | enum: Host, Presenter, Speaker |
| technologyFocusArea | string | Main tech area | e.g., "Web Development", "Cloud & AI" |
| additionalTechnologyAreas | array | Additional areas | Always empty array [] |
| liveStreamViews | integer | Livestream views | minimum 0 |
| onDemandViews | integer | On-demand views | minimum 0 |
| numberOfSessions | integer | Number of sessions | minimum 1, default 1 |
| inPersonAttendees | integer | In-person attendees | Always 0 for videos |
| subscriberBase | integer | Subscriber base | Always 0 for videos |
| imageUrl | string | Image URL | Empty string "" |

**Example**:
```json
{
  "activity": {
    "id": 0,
    "activityTypeName": "Video",
    "typeName": "Video",
    "date": "2025-07-10T00:00:00.000Z",
    "title": "Como TERMINAR con el drama de Angular 20",
    "description": "Video tutorial explicando como resolver problemas comunes en Angular 20...",
    "url": "https://www.youtube.com/watch?v=OXlWMbrGgxk",
    "isPrivate": false,
    "targetAudience": ["Developer"],
    "tenant": "MVP",
    "userProfileId": 399243,
    "role": "Host",
    "technologyFocusArea": "Web Development",
    "additionalTechnologyAreas": [],
    "liveStreamViews": 0,
    "onDemandViews": 8619,
    "numberOfSessions": 1,
    "inPersonAttendees": 0,
    "subscriberBase": 0,
    "imageUrl": ""
  }
}
```

**Response** (201 Created):
```json
{
  "contributionId": 351180
}
```

---

### Blog

**Activity Type**: `"Blog"`

**Valid Roles**: `"Author"`, `"Co-Author"`, `"Contributor"`

| Name | Type | Description | Restrictions |
|------|------|-------------|-------------|
| id | integer | Activity ID | Always 0 for new |
| activityTypeName | string | Activity type | Must be "Blog" |
| typeName | string | Type name | Must be "Blog" |
| date | string | Publication date | ISO 8601 format |
| title | string | Blog title | min 1, max 100 |
| description | string | Description | max 1000 |
| url | string | Blog URL | https:// |
| isPrivate | boolean | Private | - |
| targetAudience | array | Audiences | See Video section |
| tenant | string | Tenant | "MVP" |
| userProfileId | integer | Profile ID | Your ID |
| role | string | Role | Author, Co-Author, Contributor |
| technologyFocusArea | string | Tech area | - |
| additionalTechnologyAreas | array | Additional | [] |
| numberOfViews | integer | Total views | minimum 0 |
| subscriberBase | integer | Subscribers | minimum 0 |
| imageUrl | string | Image | "" |

---

### Speaking (Conference)

**Activity Type**: `"Speaking (Conference)"`

**Valid Roles**: `"Speaker"`, `"Panelist"`, `"Moderator"`, `"Presenter"`

| Name | Type | Description | Restrictions |
|------|------|-------------|-------------|
| id | integer | Activity ID | Always 0 |
| activityTypeName | string | Activity type | "Speaking (Conference)" |
| typeName | string | Type name | "Speaking" |
| date | string | Event date | ISO 8601 |
| title | string | Talk title | min 1, max 100 |
| description | string | Description | max 1000 |
| url | string | Event URL | https:// |
| isPrivate | boolean | Private | - |
| targetAudience | array | Audiences | See Video section |
| tenant | string | Tenant | "MVP" |
| userProfileId | integer | Profile ID | Your ID |
| role | string | Role | Speaker, Panelist, Moderator, Presenter |
| technologyFocusArea | string | Tech area | - |
| additionalTechnologyAreas | array | Additional | [] |
| inPersonAttendees | integer | In-person | minimum 0 |
| numberOfSessions | integer | Sessions | minimum 1 |
| liveStreamViews | integer | Stream views | minimum 0 (optional) |
| onDemandViews | integer | On-demand | minimum 0 (optional) |
| imageUrl | string | Image | "" |

---

### Book/E-book

**Activity Type**: `"Book/E-book"`

**Valid Roles**: `"Author"`, `"Co-Author"`

| Name | Type | Description | Restrictions |
|------|------|-------------|-------------|
| id | integer | Activity ID | Always 0 |
| activityTypeName | string | Activity type | "Book/E-book" |
| typeName | string | Type name | "Book/E-book" |
| date | string | Publication date | ISO 8601 |
| title | string | Book title | min 1, max 100 |
| description | string | Description | max 1000 |
| url | string | Book URL | https:// |
| isPrivate | boolean | Private | - |
| targetAudience | array | Audiences | See Video section |
| tenant | string | Tenant | "MVP" |
| userProfileId | integer | Profile ID | Your ID |
| role | string | Role | Author, Co-Author |
| technologyFocusArea | string | Tech area | - |
| additionalTechnologyAreas | array | Additional | [] |
| numberOfViews | integer | Readers/downloads | minimum 0 |
| subscriberBase | integer | Subscribers | minimum 0 |
| copiesSold | integer | Copies sold | minimum 0 |
| imageUrl | string | Image | "" |

---

## All MVP Activity Types

```
"Blog"
"Book/E-book"
"Code Project/Sample"
"Conference (booth)"
"Conference (organizer)"
"Forum Moderator"
"Forum Participation (3rd Party Forums)"
"Forum Participation (Microsoft Forums)"
"Mentorship"
"Open Source Project(s)"
"Other"
"Product Group Feedback"
"Site Owner"
"Speaking (Conference)"
"Speaking (Local Event / User Group / Meetup)"
"Speaking (Microsoft Event)"
"Technical Social Media (Twitter, Facebook, LinkedIn...)"
"Translation Review, Feedback and Editing"
"Video"
"Workshop"
```

---

## MVP Target Audiences

```
"Developer"
"Technical Decision Maker"
"Business Decision Maker"
"Student"
"IT Pro"
"End User"
```

---

## Technology Focus Areas (Examples)

```
"Web Development"
"Cloud & AI"
"Developer Tools"
"Mobile Development"
"Data & Analytics"
"Security"
"DevOps"
"IoT"
"Machine Learning"
"Blockchain"
```

---

# Google GDE API (Advocu)

> **Source**: [Advocu Personal API reference](https://app.advocu.com/settings/integrations/personal-api)
> (sign in to Advocu and open the Google Developer Experts workspace first). Last checked: 2026-11-01.

## Base URL
```
https://api.advocu.com/personal-api/v1/gde
```

## Authentication
```
Content-Type: application/json
Authorization: Bearer <token>
```

Generate the token on the Personal API page linked above.

## Rate Limit
30 requests per minute per IP address. Requests over the limit are rejected with HTTP 429.

---

## Common Rules

- **Every field is optional.** Drafts can be saved incomplete and finished in the Advocu portal before submission.
- **Accepted if**: some fields are only accepted for certain values of another field (for example `country` only for
  `In-Person` or `Hybrid` events). This is a condition for sending the field, not a requirement to send it.
- **Dates** use the pattern `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` (YYYY-MM-DD).
- **URLs** use the pattern `^https?:\/\/(www\.)?.*$`.
- **Response**: every draft endpoint returns `{ "id": "<id of created activity draft>" }`.

## Tags

`tags` is an array whose items must be one of the 86 values listed in the reference (same list for all 7 draft
endpoints). The full list is kept in [`src/types/Tag.ts`](../src/types/Tag.ts).

- Values must match exactly. Two values carry a trailing space in the reference: `"Cloud - BigQuery "` and
  `"Cloud - Conversational Data Analytics "`.
- Advocu adds and removes tags over time, so the MCP tools do not enforce this list and leave validation to the API.

---

## POST /activity-drafts/content-creation

| Name            | Type    | Description                                | Accepted if | Restrictions                         |
| --------------- | ------- | ------------------------------------------ | ----------- | ------------------------------------ |
| contentType     | string  | Content type                               | -           | enum (7 values)                      |
| title           | string  | What was the title?                        | -           | min length 3, max length 200         |
| description     | string  | What was it about?                         | -           | max length 2000                      |
| tags            | array   | Tags                                       | -           | enum (see [Tags](#tags)), min items 0 |
| metrics.readers | integer | How many people read your content?         | -           | minimum 1                            |
| activityDate    | string  | Date published                             | -           | date pattern                         |
| activityUrl     | string  | Link to Content                            | -           | max length 500, URL pattern          |
| additionalInfo  | string  | Additional information                     | -           | max length 2000                      |
| private         | boolean | Do you want to make this activity private? | -           | -                                    |

------

## POST /activity-drafts/public-speaking

| Name              | Type    | Description                                                   | Accepted if                     | Restrictions                         |
| ----------------- | ------- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| title             | string  | What was the title of your talk?                              | -                               | min length 3, max length 200         |
| description       | string  | What was it about?                                            | -                               | max length 2000                      |
| tags              | array   | Tags                                                          | -                               | enum (see [Tags](#tags)), min items 0 |
| metrics.attendees | integer | How many people attended your session in total?               | -                               | minimum 1                            |
| eventFormat       | string  | Select event format                                           | -                               | enum (3 values)                      |
| country           | string  | Country                                                       | eventFormat is In-Person or Hybrid | min length 1, max length 100      |
| inPersonAttendees | integer | Out of all, how many people attended your session in-person? | eventFormat is Hybrid           | minimum 0                            |
| activityDate      | string  | Date of your talk                                             | -                               | date pattern                         |
| activityUrl       | string  | Event link (gdg.community.dev URL for GDG events) or other relevant link | -                    | max length 500, URL pattern          |
| additionalInfo    | string  | Additional information                                        | -                               | max length 2000                      |
| private           | boolean | Do you want to make this activity private?                    | -                               | -                                    |

------

## POST /activity-drafts/workshop

| Name              | Type    | Description                                                   | Accepted if                     | Restrictions                         |
| ----------------- | ------- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| title             | string  | What was the name of your workshop session?                   | -                               | min length 3, max length 200         |
| description       | string  | What was it about?                                            | -                               | max length 2000                      |
| tags              | array   | Tags                                                          | -                               | enum (see [Tags](#tags)), min items 0 |
| metrics.attendees | integer | How many people have been trained?                            | -                               | minimum 1                            |
| eventFormat       | string  | Select event format                                           | -                               | enum (3 values)                      |
| country           | string  | Country                                                       | eventFormat is In-Person or Hybrid | min length 1, max length 100      |
| inPersonAttendees | integer | Out of all, how many people attended your session in-person? | eventFormat is Hybrid           | minimum 0                            |
| activityDate      | string  | Date of your workshop                                         | -                               | date pattern                         |
| activityUrl       | string  | Event link (gdg.community.dev URL for GDG events) or other relevant link | -                    | max length 500, URL pattern          |
| additionalInfo    | string  | Additional information                                        | -                               | max length 2000                      |
| private           | boolean | Do you want to make this activity private?                    | -                               | -                                    |

------

## POST /activity-drafts/mentoring

| Name              | Type    | Description                                                   | Accepted if                     | Restrictions                         |
| ----------------- | ------- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| title             | string  | What was the name of your mentoring session?                  | -                               | min length 3, max length 200         |
| description       | string  | What was it about?                                            | -                               | max length 2000                      |
| tags              | array   | Tags                                                          | -                               | enum (see [Tags](#tags)), min items 0 |
| metrics.attendees | integer | How many people have been mentored in total?                  | -                               | minimum 1                            |
| eventFormat       | string  | Select event format                                           | -                               | enum (3 values)                      |
| country           | string  | Country                                                       | eventFormat is In-Person or Hybrid | min length 1, max length 100      |
| inPersonAttendees | integer | Out of all, how many people attended your session in-person? | eventFormat is Hybrid           | minimum 0                            |
| activityDate      | string  | Date of your mentoring session                                | -                               | date pattern                         |
| activityUrl       | string  | Event link (e.g. program website, gdg.community.dev event URL) or other relevant link | -       | max length 500, URL pattern          |
| additionalInfo    | string  | Additional information                                        | -                               | max length 2000                      |
| private           | boolean | Do you want to make this activity private?                    | -                               | -                                    |

------

## POST /activity-drafts/product-feedback-given

| Name               | Type    | Description                                | Accepted if | Restrictions                         |
| ------------------ | ------- | ------------------------------------------ | ----------- | ------------------------------------ |
| title              | string  | Title                                      | -           | min length 3, max length 200         |
| description        | string  | Description                                | -           | max length 2000                      |
| contentType        | string  | Content type                               | -           | enum (2 values)                      |
| productDescription | string  | What product was it about?                 | -           | max length 500                       |
| tags               | array   | Tags                                       | -           | enum (see [Tags](#tags)), min items 0 |
| metrics.timeSpent  | integer | Time spent (in minutes)                    | -           | minimum 1                            |
| activityDate       | string  | Participation Date                         | -           | date pattern                         |
| additionalInfo     | string  | Additional information                     | -           | max length 2000                      |
| private            | boolean | Do you want to make this activity private? | -           | -                                    |

------

## POST /activity-drafts/interaction-with-googlers

| Name              | Type    | Description                                | Accepted if | Restrictions                         |
| ----------------- | ------- | ------------------------------------------ | ----------- | ------------------------------------ |
| title             | string  | Title                                      | -           | min length 3, max length 200         |
| description       | string  | Description                                | -           | max length 2000                      |
| format            | string  | Format                                     | -           | enum (8 values)                      |
| interactionType   | string  | Interaction Type                           | -           | enum (6 values)                      |
| tags              | array   | Tags                                       | -           | enum (see [Tags](#tags)), min items 0 |
| metrics.timeSpent | integer | Time spent (in minutes)                    | -           | minimum 1                            |
| activityDate      | string  | Interaction Date                           | -           | date pattern                         |
| additionalInfo    | string  | Additional information                     | -           | max length 2000                      |
| additionalLinks   | string  | Additional links                           | -           | max length 2000                      |
| private           | boolean | Do you want to make this activity private? | -           | -                                    |

------

## POST /activity-drafts/stories

This endpoint has no `activityDate` field.

| Name             | Type    | Description                                                    | Accepted if | Restrictions                         |
| ---------------- | ------- | -------------------------------------------------------------- | ----------- | ------------------------------------ |
| title            | string  | Title of the story                                             | -           | min length 3, max length 200         |
| description      | string  | Description                                                    | -           | max length 2000                      |
| whyIsSignificant | string  | Tell us more about it and why it is significant                | -           | max length 2000                      |
| significanceType | string  | Significance type                                              | -           | enum (6 values)                      |
| activityUrl      | string  | Link                                                           | -           | max length 500, URL pattern          |
| tags             | array   | Tags                                                           | -           | enum (see [Tags](#tags)), min items 0 |
| metrics.impact   | integer | What was your impact in views, reads, attendees, etc.?         | -           | minimum 1                            |
| additionalInfo   | string  | Additional information                                         | -           | max length 2000                      |
| private          | boolean | Do you want to make this activity private?                     | -           | -                                    |

------

## GET /activities

Returns one page of your submitted activities, sorted by submission date in ascending order.
Used by the `list_gde_activities` tool (unified server only).

| Query parameter | Type    | Description                                                        | Default |
| --------------- | ------- | ------------------------------------------------------------------ | ------- |
| from            | string  | Filter by submission date from (inclusive), e.g. 2026-01-01T00:00:00Z | -     |
| to              | string  | Filter by submission date to (exclusive), e.g. 2026-01-01T00:00:00Z   | -     |
| updatedAfter    | string  | Filter activities updated after this date, e.g. 2026-01-01T00:00:00Z  | -     |
| page            | integer | Page number (cannot be negative)                                   | 0       |
| size            | integer | Page size (1-100)                                                  | 10      |

Response: `{ "content": [Activity] }`. The API returns no totals; an empty `content` array means there are no more
pages. The filters apply to the submission and update dates, not to the activity date.

| Activity field | Type   | Description                                                                      |
| -------------- | ------ | -------------------------------------------------------------------------------- |
| type           | string | One of 9 values: the 7 draft types plus `github-repository` and `youtube-video` |
| data           | object | Activity fields; the shape depends on `type`                                     |
| submissionDate | string | e.g. 2026-01-01T00:00:00Z                                                        |
| updatedDate    | string | e.g. 2026-01-01T00:00:00Z                                                        |
| archiveDate    | string | Optional, e.g. 2026-01-01T00:00:00Z                                              |
| activityId     | string | -                                                                                |

`data` differs from the draft request bodies: it can use any of 331 tags (including retired ones), allows longer
descriptions (up to 20000 characters, with `*_plain_text` variants) and includes fields such as `city`, `countryIso`
and `imageUrl` that the draft endpoints do not accept.

------

## PATCH /activities/{activityId}

Updates a submitted activity. Used by the `update_gde_activity` tool (unified server only).

Request body: `{ "data": { ...fields } }`. Every field is optional. The fields for each activity type have the same
names and limits as its draft fields above, except `tags`, which accepts the 331 values of the list response. The
reference defines updates for the 7 draft types only, not for `github-repository` or `youtube-video`. `imageUrl`,
`city` and `cityPlaceId` appear in responses but are not update fields.

Response: the updated activity, in the same shape as an item of `GET /activities`.

The reference does not say how omitted fields are treated. In one request that sent only `metrics` for a
`content-creation` activity, the other fields stayed the same and only `updatedDate` changed.

Not verified:

- Omitted fields on the other 6 activity types.
- Whether `tags` replaces or extends the stored list. The tool asks for the complete list so that either result is
  the intended one.
- Whether the `eventFormat` conditions on `country` and `inPersonAttendees` also consider the stored `eventFormat`.
- What is stored when plain text is sent for a field that is returned as HTML, such as `description`.

### `update_gde_activity`

| Argument   | Type    | Description                                                                 |
| ---------- | ------- | --------------------------------------------------------------------------- |
| activityId | string  | Activity id from `list_gde_activities`                                      |
| data       | object  | Fields to change. Only these fields are sent                                |
| apply      | boolean | Send the update. When omitted or false, the tool only previews the changes |

The API cannot read a single activity, so the tool finds it by walking `GET /activities` (one request per 100
activities). It then checks the fields against the activity type and shows the current and new values. Nothing is
sent if a field does not apply to the type or if all values already match.

------

## Not Yet Supported by the MCP Tools

The reference also documents the following, which this server does not implement yet:

- Fetching every page automatically: `list_gde_activities` returns one page per call.
