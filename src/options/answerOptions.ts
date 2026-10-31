import { DECLINE_TO_ANSWER } from '../shared/storage/profile';

const YES_NO = ['Yes', 'No', DECLINE_TO_ANSWER];

export const WORK_AUTHORIZATION_OPTIONS = {
  authorizedToWork: YES_NO,
  requiresSponsorship: YES_NO,
};

export const EEO_OPTIONS = {
  gender: ['Male', 'Female', 'Non-binary', DECLINE_TO_ANSWER],
  ethnicity: [
    'American Indian or Alaska Native',
    'Asian',
    'Black or African American',
    'Hispanic or Latino',
    'Native Hawaiian or Other Pacific Islander',
    'White',
    'Two or more races',
    DECLINE_TO_ANSWER,
  ],
  veteranStatus: ['I am a protected veteran', 'I am not a protected veteran', DECLINE_TO_ANSWER],
  disabilityStatus: [
    'Yes, I have a disability',
    'No, I do not have a disability',
    DECLINE_TO_ANSWER,
  ],
};
