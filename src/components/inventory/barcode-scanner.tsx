"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    BarcodeDetector?: any;
  }
}

export function BarcodeScanner({
  onDetect,
  basePath,
  label = "Scan",
}: {
  onDetect?: (code: string) => void;
  basePath?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const routerRef = useRef(router);
  const onDetectRef = useRef(onDetect);
  const basePathRef = useRef(basePath);

  useEffect(() => {
    routerRef.current = router;
    onDetectRef.current = onDetect;
    basePathRef.current = basePath;
  });

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let interval: number | null = null;
    let cancelled = false;

    const stop = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    const complete = (code: string) => {
      stop();
      setOpen(false);
      if (onDetectRef.current) onDetectRef.current(code);
      if (basePathRef.current) {
        routerRef.current.push(`${basePathRef.current}?q=${encodeURIComponent(code)}`);
      }
    };

    async function run() {
      if (!window.BarcodeDetector) {
        setError("Not supported in this browser — use the search field.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stop();
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        const detector = new window.BarcodeDetector();
        interval = window.setInterval(async () => {
          const vid = videoRef.current;
          if (!vid) return;
          try {
            const codes = await detector.detect(vid);
            if (codes.length > 0 && codes[0].rawValue) {
              complete(String(codes[0].rawValue));
            }
          } catch {
            // Detection can fail transiently; keep scanning.
          }
        }, 150);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera permission denied."
            : "Unable to access the camera.",
        );
      }
    }

    run();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Camera className="size-4" /> {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Scan barcode">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full rounded-lg bg-zinc-900 object-cover"
            />
            <p className="text-center text-sm text-muted">Point your camera at a barcode.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
