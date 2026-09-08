import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { verifyFaces, type VerifyResult } from "@/lib/verify.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Face Verify — Compare a photo with a live selfie" },
      {
        name: "description",
        content:
          "Upload a reference photo, take a selfie, and check whether both faces belong to the same person. Images are processed and discarded.",
      },
      { property: "og:title", content: "Face Verify" },
      {
        property: "og:description",
        content: "Compare a reference photo with a live selfie in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function Index() {
  const run = useServerFn(verifyFaces);
  const [reference, setReference] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setError("Could not open the camera. Please allow camera access.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSelfie(canvas.toDataURL("image/jpeg", 0.92));
    setResult(null);
    stopCamera();
  };

  const onVerify = async () => {
    if (!reference || !selfie) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await run({ data: { referenceImage: reference, selfieImage: selfie } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-5 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Face Verify</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a reference photo, take a selfie, and compare them. Images are never stored.
        </p>
      </header>

      <section className="space-y-2">
        <label htmlFor="ref" className="text-sm font-medium">
          Reference photo
        </label>
        <input
          id="ref"
          type="file"
          accept="image/*"
          className="block w-full rounded-md border border-input bg-background p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setResult(null);
            setError(null);
            try {
              setReference(await fileToDataUrl(file));
            } catch {
              setError("Could not read that file.");
            }
          }}
        />
        {reference && (
          <img
            src={reference}
            alt="Reference preview"
            className="h-40 w-full rounded-md border border-border object-contain"
          />
        )}
      </section>

      <section className="space-y-2">
        <span className="text-sm font-medium">Selfie</span>
        {cameraOn ? (
          <div className="space-y-2">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-56 w-full rounded-md border border-border object-cover"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={capture}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Capture
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-md border border-input px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startCamera}
            className="w-full rounded-md border border-input px-4 py-2 text-sm font-medium"
          >
            {selfie ? "Retake selfie" : "Open camera"}
          </button>
        )}
        {selfie && !cameraOn && (
          <img
            src={selfie}
            alt="Selfie preview"
            className="h-40 w-full rounded-md border border-border object-contain"
          />
        )}
      </section>

      <button
        type="button"
        onClick={onVerify}
        disabled={!reference || !selfie || loading}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify Face"}
      </button>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-md border border-border p-4">
          <p className="text-lg font-semibold">
            {result.verified ? "Verified" : "Not Verified"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Euclidean distance: {result.distance.toFixed(4)} (threshold {result.threshold})
          </p>
        </div>
      )}
    </main>
  );
}
