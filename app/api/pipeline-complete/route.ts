import { wait } from "@trigger.dev/sdk";

export async function POST(request: Request) {
  const body = await request.json();
  const { stateCode, status, facilitiesProcessed, timestamp, secret } = body;

  // Verify callback authenticity
  if (secret !== process.env.TRIGGER_CALLBACK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Complete the wait token in Trigger.dev
  const token = `pipeline-complete-${stateCode}-${timestamp}`;
  await wait.completeToken(token, {
    stateCode,
    status,
    facilitiesProcessed,
  });

  return Response.json({ received: true });
}
