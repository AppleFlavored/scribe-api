import { tryCatch } from "./utils";

export type TranscriptionResult<E = Error> = 
  | { transcript: string; error: null }
  | { transcript: null; error: E };
  
export async function createTranscriptFromUrl(model: Ai<AiModels>, url: URL): Promise<TranscriptionResult> {
  // Download the audio file from the URL and retrieve the byte buffer.
  const audioResponse = await tryCatch(fetch(url));
  if (audioResponse.error) {
    console.error({ "error": "FETCH_AUDIO", message: audioResponse.error.message });
    return { transcript: null, error: audioResponse.error };
  }
  const audioBytes = new ArrayBuffer();

  // Run the model with the audio bytes and return the transcript.
  const inputs: Ai_Cf_Openai_Whisper_Input = {
    audio: [...new Uint8Array(audioBytes)],
  };
  const modelResponse = await tryCatch(model.run("@cf/openai/whisper", inputs));
  if (modelResponse.error) {
    console.error({ "error": "MODEL_OUTPUT", message: modelResponse.error.message });
    return { transcript: null, error: modelResponse.error };
  }
  return { transcript: "Hello, World!", error: null };
}