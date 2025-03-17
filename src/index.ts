import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { toResult as tryCatch } from "./utils";
import { timingSafeEqual } from "hono/utils/buffer";

type Bindings = {
  AI: Ai,
  API_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(async (ctx, next) => {
  const token = ctx.req.header("Authorization");
  if (!token) {
    return ctx.newResponse(null, 401);
  }
  if (await timingSafeEqual(token, ctx.env.API_TOKEN) === false) {
    return ctx.newResponse(null, 401);
  }
  return next();
});

const transcriptionRequestSchema = z.object({
  url: z.string().url(),
});

app.post("/transcription", zValidator("json", transcriptionRequestSchema), async (ctx) => {
  const data = ctx.req.valid("json");

  const audioResponse = await tryCatch(fetch(data.url));
  if (audioResponse.error) {
    return ctx.json({ error: "Could not retreive audio file at provided url" }, 500);
  }

  const audioBytes = await audioResponse.value.arrayBuffer();
  const inputs: Ai_Cf_Openai_Whisper_Input = {
    audio: [...new Uint8Array(audioBytes)],
  };
  const modelResponse = await tryCatch(ctx.env.AI.run("@cf/openai/whisper", inputs));
  if (modelResponse.error) {
    return ctx.json({ error: "Failed to create transcription" }, 500);
  }

  return ctx.json({ transcription: modelResponse.value.text });
});

export default app;