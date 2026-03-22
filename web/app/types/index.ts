export interface Developer {
  id: string
  firstName: string
  lastName: string
  slug: string
  slackId: string | null
  gitlabId: string | null
  githubId: string | null
  createdAt: string
  updatedAt: string
}

export interface Team {
  id: string
  name: string
  slug: string
  defaultReviewerCount: number
  rotationIntervalDays: number | null
  rotationDay: string | null
  rotationTimezone: string | null
  memberCount?: number
  createdAt: string
  updatedAt: string
}

export interface Settings {
  id: string
  defaultRotationIntervalDays: number
  defaultRotationDay: string
  defaultRotationTimezone: string
  updatedAt: string
}

export interface TeamMember {
  id: string
  teamId: string
  developerId: string
  reviewerCount: number | null
  isExperienced: boolean
  developer: Developer
  preferableReviewers: { id: string, preferredDeveloperId: string }[]
}

export interface Squad {
  id: string
  teamId: string
  name: string
  reviewerCount: number
  members: { id: string, developerId: string, developer: Developer }[]
}

export interface Rotation {
  id: string
  teamId: string
  date: string
  isManual: boolean
  mode: 'devs' | 'teams'
  assignments: RotationAssignment[]
}

export interface RotationReviewer {
  id: string
  assignmentId: string
  reviewerDeveloperId: string
  reviewerName: string | null
  developer: {
    id: string
    firstName: string
    lastName: string
    slug: string | null
    slackId: string | null
    gitlabId: string | null
  }
}

export interface RotationAssignment {
  id: string
  rotationId: string
  targetType: 'developer' | 'squad'
  targetId: string
  targetName: string
  targetSlug: string | null
  reviewers: RotationReviewer[]
}
