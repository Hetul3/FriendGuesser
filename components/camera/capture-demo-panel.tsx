"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type CaptureStep = "environment" | "selfie" | "done";

type CaptureImage = {
  dataUrl: string;
  capturedAt: number;
};

type CaptureState =
  | {
      status: "idle";
    }
  | {
      status: "requesting";
    }
  | {
      status: "ready";
    }
  | {
      status: "error";
      message: string;
    };

const stepCopy: Record<
  Exclude<CaptureStep, "done">,
  {
    title: string;
    button: string;
    facingMode: "environment" | "user";
    helper: string;
  }
> = {
  environment: {
    title: "Environment photo",
    button: "Enable back camera",
    facingMode: "environment",
    helper:
      "Take one photo of the area around you. This requests the rear camera first when the browser supports it.",
  },
  selfie: {
    title: "Selfie photo",
    button: "Enable selfie camera",
    facingMode: "user",
    helper:
      "Then switch to the front camera and take a selfie. Some browsers may ask you to confirm the camera switch.",
  },
};

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Camera permission was denied. Allow camera access for this site and try again.";
    }

    if (error.name === "NotFoundError") {
      return "No camera matching this request was found on this device.";
    }

    if (error.name === "NotReadableError") {
      return "The camera is already in use by another app or browser tab.";
    }
  }

  return "Unable to start the camera right now.";
}

export function CaptureDemoPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captureStep, setCaptureStep] = useState<CaptureStep>("environment");
  const [captureState, setCaptureState] = useState<CaptureState>({
    status: "idle",
  });
  const [environmentImage, setEnvironmentImage] = useState<CaptureImage | null>(
    null,
  );
  const [selfieImage, setSelfieImage] = useState<CaptureImage | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const activeStep = captureStep === "done" ? "selfie" : captureStep;

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const startCamera = async (step: Exclude<CaptureStep, "done">) => {
    setCaptureState({ status: "requesting" });
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: stepCopy[step].facingMode,
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCaptureState({ status: "ready" });
    } catch (error) {
      console.error("[camera] startCamera failed", error);
      setCaptureState({
        status: "error",
        message: getCameraErrorMessage(error),
      });
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) {
      setCaptureState({
        status: "error",
        message: "Camera preview is not ready yet.",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setCaptureState({
        status: "error",
        message: "Unable to capture a photo on this device.",
      });
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const image: CaptureImage = {
      dataUrl,
      capturedAt: Date.now(),
    };

    if (captureStep === "environment") {
      setEnvironmentImage(image);
      setCaptureStep("selfie");
      setCaptureState({ status: "idle" });
      stopStream();
      return;
    }

    if (captureStep === "selfie") {
      setSelfieImage(image);
      setCaptureStep("done");
      setCaptureState({ status: "idle" });
      stopStream();
    }
  };

  const resetDemo = () => {
    stopStream();
    setEnvironmentImage(null);
    setSelfieImage(null);
    setCaptureStep("environment");
    setCaptureState({ status: "idle" });
  };

  const retakeCurrentStep = () => {
    if (captureStep === "done") {
      setSelfieImage(null);
      setCaptureStep("selfie");
      setCaptureState({ status: "idle" });
      return;
    }

    if (captureStep === "selfie") {
      setEnvironmentImage(null);
      setCaptureStep("environment");
      setCaptureState({ status: "idle" });
    }
  };

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Camera demo</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Guided two-step capture flow: one environment photo, then one
            selfie. Photos stay only in this browser tab for now.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDemo}
          className="min-h-11 rounded-2xl border border-[var(--line)] px-4 text-sm font-semibold"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
        <p className="text-sm font-semibold text-[var(--brand-strong)]">
          {captureStep === "done" ? "Capture complete" : stepCopy[activeStep].title}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {captureStep === "done"
            ? "Both demo photos are captured below. You can reset or retake the selfie step."
            : stepCopy[activeStep].helper}
        </p>

        {captureStep !== "done" ? (
          <div className="mt-4 space-y-3">
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[3/4] w-full bg-black object-cover"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void startCamera(activeStep)}
                className="min-h-12 rounded-2xl bg-[var(--brand)] px-4 text-sm font-semibold text-white"
              >
                {captureState.status === "requesting"
                  ? "Requesting camera..."
                  : stepCopy[activeStep].button}
              </button>
              <button
                type="button"
                onClick={captureFrame}
                disabled={captureState.status !== "ready"}
                className="min-h-12 rounded-2xl border border-[var(--line)] bg-white/85 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Capture photo
              </button>
            </div>

            {captureState.status === "error" ? (
              <div className="rounded-[1.25rem] border border-[#d8a39a] bg-[#fff2ef] px-4 py-3 text-sm text-[#9d3b28]">
                {captureState.message}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={retakeCurrentStep}
              className="min-h-12 rounded-2xl border border-[var(--line)] bg-white/85 px-4 text-sm font-semibold"
            >
              Retake selfie
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        <PhotoPreviewCard
          title="Environment photo"
          image={environmentImage}
          placeholder="No environment photo captured yet."
        />
        <PhotoPreviewCard
          title="Selfie photo"
          image={selfieImage}
          placeholder="No selfie photo captured yet."
        />
      </div>
    </section>
  );
}

function PhotoPreviewCard({
  title,
  image,
  placeholder,
}: {
  title: string;
  image: CaptureImage | null;
  placeholder: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
      <p className="text-sm font-semibold text-[var(--brand-strong)]">{title}</p>

      {image ? (
        <div className="mt-3 overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[#f3eee3]">
          <Image
            src={image.dataUrl}
            alt={title}
            width={960}
            height={1280}
            className="h-auto w-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="mt-3 rounded-[1.25rem] border border-dashed border-[var(--line)] px-4 py-8 text-sm text-[var(--muted)]">
          {placeholder}
        </div>
      )}
    </div>
  );
}
