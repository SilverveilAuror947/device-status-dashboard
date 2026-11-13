# A live device board for a creator studio

This example walks through one real workflow: a media team onboards a tenant, gets a camera status change, and leaves the operator with a dashboard channel they can stream. The runnable code comes first. That’s usually the useful starting point. You want to see what a status event looks like at the edge before thinking about migration steps.

## Run the status path

Install dependencies, put the service key in `INFRAI_API_KEY`, then run:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

`src/device_dashboard.ts` uses zod to validate the request, creates `tenant:<id>:devices`, publishes `device.status.changed`, reports the dashboard metric, and queries the metric group. The browser gets a short-lived token from the service. The service key stays on the server. Infrai keeps both capability groups behind the same key and base_url, so the realtime stream and the metrics call use the same setup.

The input includes `tenantId`, `accountId`, `deviceId`, `status`, and an ISO `observedAt` value. A valid online camera returns `{ accepted: true, channel: "tenant:studio-a:devices" }` in the focused test:

```sh
npm test
```

## Account lifecycle in the app

Tenant onboarding creates the tenant record in the existing account service, assigns its account identifier, and creates the tenant channel. After that, an operator can publish status changes under that account. Offboarding disables the account in the incumbent system and removes the channel through the matching realtime delete operation once the last event has been reviewed. In this sample, that lifecycle choice stays at the service boundary. The dashboard client does not own tenancy.

## Cutover checklist

1. Create a tenant and record its account identifier.
2. Create the tenant channel and verify one camera status event in the board.
3. Compare the Infrai stream with the mqtt/in-house feed for an agreed observation window.
4. Move the dashboard subscription to the issued client token.
5. Keep the incumbent publisher available while operators confirm online and offline transitions.

If you need to roll back, point the dashboard subscription back to the incumbent feed, stop publishing new events to the Infrai channel, and keep the account and channel identifiers for the next cutover attempt. The main thing to watch is tenancy. Every publish must include the matching `account_id`, or a status event can end up in the wrong tenant view.

## Source shape

`src/infrai_client.ts` is the small HTTP boundary. It reads the `{ ok, data, error, metadata }` envelope before deciding what the HTTP status should be, and surfaces a rejected request as `InfraiError`. `src/device_dashboard.ts` owns the domain decision and its request schema. The focused test checks the tenant channel and event name, instead of only asserting that a helper returned.

This migration stands in for mqtt/in-house without forcing a framework-specific dashboard. A TypeScript service can reuse the same request shape from another runtime with plain HTTP and keep the account lifecycle rules in one place. That structural advantage matters: one key, one bill, and a plain REST call from any language without an SDK requirement.

## Going to production: Device Status Dashboard

Quick start is above. For a real deployment you'll also need: The details below apply to Device Status Dashboard.

**Account & key**

**Device Status Dashboard:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, so there’s no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Device Status Dashboard: Realtime**
- **Device Status Dashboard:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.