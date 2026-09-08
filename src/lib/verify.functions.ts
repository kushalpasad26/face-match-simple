import { createServerFn } from "@tanstack/react-start";

type VerifyInput = { referenceImage: string; selfieImage: string };
export type VerifyResult = { verified: boolean; distance: number; threshold: number };

const MAX_BYTES = 8 * 1024 * 1024;

function checkDataUrl(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.startsWith("data:image/")) {
    throw new Error(`${label} is missing or is not an image.`);
  }
  const base64 = value.split(",")[1] ?? "";
  if (base64.length * 0.75 > MAX_BYTES) {
    throw new Error(`${label} is too large (max 8 MB).`);
  }
  return value;
}

export const verifyFaces = createServerFn({ method: "POST" })
  .inputValidator((input: VerifyInput) => ({
    referenceImage: checkDataUrl(input?.referenceImage, "Reference photo"),
    selfieImage: checkDataUrl(input?.selfieImage, "Selfie"),
  }))
  .handler(async ({ data }): Promise<VerifyResult> => {
    const serviceUrl = process.env["FACENET_SERVICE_URL"];
    if (!serviceUrl) {
      throw new Error(
        "Face verification service is not configured. Set FACENET_SERVICE_URL.",
      );
    }
    const threshold = Number(process.env["FACE_MATCH_THRESHOLD"] ?? "1.0");

    let res: Response;
    try {
      res = await fetch(`${serviceUrl.replace(/\/$/, "")}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_image: data.referenceImage,
          selfie_image: data.selfieImage,
          threshold,
        }),
      });
    } catch {
      throw new Error("Could not reach the face verification service.");
    }

    const payload = (await res.json().catch(() => null)) as
      | { verified?: boolean; distance?: number; error?: string }
      | null;

    if (!res.ok || !payload || typeof payload.distance !== "number") {
      throw new Error(payload?.error ?? "Face verification failed.");
    }

    return {
      verified: Boolean(payload.verified),
      distance: payload.distance,
      threshold,
    };
  });
