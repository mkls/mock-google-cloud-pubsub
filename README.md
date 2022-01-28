# mock-google-cloud-pubsub

mock @google-cloud/pubsub npm package in integration tests for faster test execution.

## Usage

Rewrite in progress for version 2.0.0.

Pubsub docs for official API: https://googleapis.dev/nodejs/pubsub/latest/PubSub.html

## Local dev

Tests cases are run both for an actual and the mocked version, to ensure they work the same way.

To setup connection for real pubsub

- create a `confidential.env` file in root
- set `GCP_PROJECT_ID=<your-project-id>`
- set `GCP_CREDENTIALS=<credentials for a service account as json>`
- set `RESOURCE_PREFIX` to a uniq string, resources created during tests will be prefix with this value

You can use the docker pubsub emulator instead of the real pubsub:

- run `docker-compose up -d`
- in `confidential.env` set `GCP_PROJECT_ID=mock-gcp-project` and `PUBSUB_EMULATOR_HOST=localhost:8685`

Run tests with `npm t` or `npm run test:watch` for watch mode.
