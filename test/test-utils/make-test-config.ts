import dotenv from 'dotenv';

export function makeTestConfig() {
  dotenv.config({ path: 'confidential.env' });

  if (!process.env.GCP_PROJECT_ID) {
    throw new Error('Missing env var: GCP_PROJECT_ID');
  }
  if (!process.env.PUBSUB_EMULATOR_HOST) {
    throw new Error('Missing env var: PUBSUB_EMULATOR_HOST');
  }

  return {
    projectId: process.env.GCP_PROJECT_ID,
  };
}
