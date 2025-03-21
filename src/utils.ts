export type Result<T, E = Error> =
  | { value: T; error: null }
  | { value: null; error: E };

export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const res = await promise;
    return { value: res, error: null };
  } catch (error) {
    return { value: null, error: error as E };
  }
}

// From https://github.com/discord/discord-interactions-js/blob/main/src/index.ts#L93-L128
export async function verifyKey(body: ArrayBuffer, signature: string, timestamp: string, clientPublicKey: string): Promise<boolean> {
  const encoder = new TextEncoder();
  try {
    const timestampData = encoder.encode(timestamp);
    const bodyData = new Uint8Array(body);
    // concatUint8Arrays(timestampData, bodyData);
    const message = new Uint8Array(timestampData.length + bodyData.length);
    message.set(timestampData);
    message.set(bodyData, timestampData.length);

    const publicKey = await crypto.subtle.importKey(
      "raw",
      hexStringToUint8Array(clientPublicKey),
      { name: "ed25519", namedCurve: "ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "ed25519" },
      publicKey,
      hexStringToUint8Array(signature),
      message
    );
  } catch (e) {
    return false;
  }
}

function hexStringToUint8Array(hexString: string): Uint8Array {
  const matches = hexString.match(/.{1,2}/g);
  if (!matches) {
    throw new Error("Invalid hex string");
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}