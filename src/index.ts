import { Hono } from "hono";
import { handleApplicationCommandInteraction } from "./interaction";
import { tryCatch, verifyKey } from "./utils";
import { APIInteraction, InteractionResponseType, InteractionType } from "discord-api-types/v10";

export type Bindings = {
  AI: Ai,
  CDN_PROXY_URL: string,
  CLIENT_PUBLIC_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/interactions", async (ctx) => {
  const signature = ctx.req.header("X-Signature-Ed25519");
  const timestamp = ctx.req.header("X-Signature-Timestamp");
  if (!signature || !timestamp) {
    return ctx.newResponse(null, 401);
  }

  const bytesCopy = await ctx.req.raw.clone().arrayBuffer();
  const { value: isValidRequest, error: validationError } = await tryCatch(verifyKey(bytesCopy, signature, timestamp, ctx.env.CLIENT_PUBLIC_KEY));
  if (validationError) {
    console.error({ error: "KEY_VALIDATION_FAILED", message: "Failed to verify message from Discord.", exception: validationError });
    return ctx.newResponse(null, 401);
  }
  if (!isValidRequest) {
    return ctx.newResponse(null, 401);
  }

  const interaction = await ctx.req.json() as APIInteraction;
  console.log("Received interaction:", interaction);

  if (interaction.type === InteractionType.Ping) {
    return ctx.json({ type: InteractionResponseType.Pong });
  }
  if (interaction.type !== InteractionType.ApplicationCommand) {
    console.log("Unhandled interaction type:", interaction.type);
    return ctx.newResponse(null, 202);
  }

  handleApplicationCommandInteraction(interaction, ctx.env);
  return ctx.newResponse(null, 202);
});

export default app;