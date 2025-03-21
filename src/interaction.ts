import {
  APIApplicationCommandInteraction,
  APIInteraction,
  APIInteractionResponse,
  APIInteractionResponseCallbackData,
  ApplicationCommandType,
  InteractionResponseType,
  MessageFlags,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  RouteBases,
  Routes
} from "discord-api-types/v10";
import { createTranscriptFromUrl } from "./transcription";
import { Bindings } from ".";

const MAX_AUDIO_DURATION_SECS = 70;

export async function handleApplicationCommandInteraction(interaction: APIApplicationCommandInteraction, env: Bindings): Promise<void> {
  const data = interaction.data;
  if (data.type !== ApplicationCommandType.Message) {
    return;
  }

  const targetMessage = data.resolved.messages[data.target_id];
  console.log("Target message:", targetMessage);
  if (!targetMessage) {
    return;
  }

  // TODO: Add message link.
  const attachment = targetMessage.attachments.at(0);

  if (!attachment) {
    await reply(interaction, { content: "Audio transcription only works on voice messages!", flags: MessageFlags.Ephemeral })
    return;
  }
  if (!attachment.content_type || !attachment.content_type.startsWith("audio/")) {
    await reply(interaction, { content: "Audio transcription only works on voice messages!", flags: MessageFlags.Ephemeral })
    return;
  }
  // NOTE: Only voice messages have a duration and waveform field.
  if (!attachment.duration_secs || !attachment.waveform) {
    await reply(interaction, { content: "Audio transcription only works on voice messages!", flags: MessageFlags.Ephemeral })
    return;
  }

  // TODO: Add user roles check for premium users.
  if (attachment.duration_secs > MAX_AUDIO_DURATION_SECS) {
    await reply(interaction, { content: `Sorry, the audio message is too long! (Max: ${MAX_AUDIO_DURATION_SECS} seconds)`, flags: MessageFlags.Ephemeral });
    return;
  }

  const proxiedUrl = URL.parse(
    attachment.url.substring("https://cdn.discordapp.com/".length),
    env.CDN_PROXY_URL
  );
  if (!proxiedUrl) {
    console.error({ error: "PARSE_PROXY_URL", message: "Failed to parse proxied URL.", originalUrl: attachment.url, proxyUrl: env.CDN_PROXY_URL });
    await reply(interaction, { content: "Something went wrong! Try again later.", flags: MessageFlags.Ephemeral });
    return;
  }

  console.log("Transcribing audio message (before defer)", { attachment, proxiedUrl });
  await deferReply(interaction);

  const { transcript, error } = await createTranscriptFromUrl(env.AI, proxiedUrl);
  if (error) {
    console.error({ error: "TRANSCRIPTION_ERROR", message: "Failed to create transcript.", exception: error });
    await editReply(interaction, { content: "Something went wrong while creating a transcript. Try again later." });
    return;
  }

  // await editReply(interaction, { content: `**Transcription:**\n> ${responseJson.transcription}\n\n-# ⚠️ May contain errors/inaccuracies • Original Message: ${messageUrl}` });
  await editReply(interaction, { content: `**Transcription:**\n> ${transcript}\n\n-# ⚠️ May contain errors/inaccuracies` });
}

async function reply(interaction: APIInteraction, data: APIInteractionResponseCallbackData): Promise<void> {
  try {
    const response = await fetch(RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Scribe (flavored.dev, 1.0)",
      },
      body: JSON.stringify(<APIInteractionResponse>{
        type: InteractionResponseType.ChannelMessageWithSource,
        data,
      }),
    });
    console.log("Reply response:", response);
  } catch (error) {
    console.error({ error: "REPLY_ERROR", message: "Failed to reply to interaction.", exception: error });
  }
} 

async function editReply(interaction: APIInteraction, data: RESTPatchAPIWebhookWithTokenMessageJSONBody): Promise<void> {
  await fetch(RouteBases.api + Routes.webhookMessage(interaction.application_id, interaction.token), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Scribe (flavored.dev, 1.0)",
    },
    body: JSON.stringify(data),
  });
}

async function deferReply(interaction: APIInteraction): Promise<void> {
  await fetch(RouteBases.api + Routes.interactionCallback(interaction.id, interaction.token), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Scribe (flavored.dev, 1.0)",
    },
    body: JSON.stringify(<APIInteractionResponse>{
      type: InteractionResponseType.DeferredChannelMessageWithSource,
    }),
  });
}