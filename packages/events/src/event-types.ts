export const EventTypes = {
  HealthPingRequested: "health.ping.requested",
  UserRegistered: "user.registered",
  JobFound: "job.found",
  ResumeUploaded: "resume.uploaded",
  ResumeParsed: "resume.parsed",
  ApplicationSubmitted: "application.submitted",
  ApplicationQueued: "application.queued",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
