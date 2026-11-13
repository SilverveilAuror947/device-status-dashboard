import assert from "node:assert/strict";
import test from "node:test";
import { streamDeviceStatus } from "../src/device_dashboard.ts";

test("routes an online device to its tenant stream", async () => {
  const calls: Array<{ path: string; body?: unknown }> = [];
  const client = {
    createChannel: async (channel: string) => { calls.push({ path: "create", body: channel }); },
    publish: async (channel: string, event: string, data: unknown, account_id: string) => { calls.push({ path: event, body: { channel, data, account_id } }); }
  } as never;
  const result = await streamDeviceStatus({ tenantId: "studio-a", accountId: "acct-a", deviceId: "cam-1", status: "online", observedAt: "2026-01-01T00:00:00.000Z" }, client);
  assert.deepEqual(result, { accepted: true, channel: "tenant:studio-a:devices" });
  assert.equal(calls[1].path, "device.status.changed");
});
