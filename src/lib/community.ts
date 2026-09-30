// A fixed set of peer-support topics — students register interest, not free
// text, so there's nothing here that needs moderation. See README.md.
export const TOPICS = {
  first_job_jitters: "First job jitters",
  contract_review_circle: "Contract review practice partners",
  tax_super_study_group: "Tax & super study group",
  interview_practice: "Interview practice partners",
} as const;

export type Topic = keyof typeof TOPICS;

export function isTopic(value: string): value is Topic {
  return value in TOPICS;
}
