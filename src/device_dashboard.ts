import { z } from "zod";
import { InfraiClient, InfraiError } from "./infrai_client.ts";

export const deviceStatusSchema = z.object({
  tenantId: z.string().min(1),
  accountId: z.string().min(1),
  deviceId: z.string().min(1),
  status: z.enum(["online", "offline"]),
  observedAt: z.string().datetime()
});
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

export async function streamDeviceStatus(input: unknown, client: InfraiClient): Promise<{ accepted: boolean; channel: string }> {
  const status = deviceStatusSchema.parse(input);
  const channel = `tenant:${status.tenantId}:devices`;
  await client.createChannel(channel);
  await client.publish(channel, "device.status.changed", status, status.accountId);
  return { accepted: true, channel };
}

export async function runDemo(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the demo");
  const client = new InfraiClient(key);
  const input = { tenantId: "creator-studio", accountId: "account-17", deviceId: "camera-04", status: "online", observedAt: new Date().toISOString() };
  const result = await streamDeviceStatus(input, client);
  const token = await client.issueToken("dashboard-operator", [result.channel]);
  const metricName = "device.status.changed";
  await client.reportMetric(metricName, 1, "counter");
  const metrics = await client.queryMetrics(metricName, "count");
  console.log(JSON.stringify({ result, token, metrics }));
}

if (process.argv[1]?.endsWith("device_dashboard.ts")) {
  runDemo().catch((error: unknown) => {
    if (error instanceof InfraiError) { console.error(`${error.code}: ${error.message}`); process.exitCode = 1; return; }
    console.error(error); process.exitCode = 1;
  });
}
