"use client";
import { useCallback, useRef, useState } from "react";
import { Box, Smartphone } from "lucide-react";
import { ModelViewer, type ViewerHandle } from "./ModelViewer";

type Props = { name: string; imageUrl: string | null; glbUrl: string | null; usdzUrl: string | null; sizeCalibrated: boolean };

export function DishMedia({ name, imageUrl, glbUrl, usdzUrl, sizeCalibrated }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [arOk, setArOk] = useState(false);
  const [wantAr, setWantAr] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const onStatus = useCallback((s: "ready" | "error", ar: boolean) => { setStatus(s); setArOk(ar); }, []);
  const open3d = (ar: boolean) => { setShow3d(true); if (status === "idle") setStatus("loading"); if (ar) setWantAr(true); };
  const placeOnTable = () => {
    // Must run inside a user tap, so it is only offered once the model has loaded.
    (box.current?.querySelector("model-viewer") as ViewerHandle | null)?.activateAR?.();
  };

  return (
    <div>
      <div ref={box} className="card overflow-hidden">
        {show3d && glbUrl && status !== "error" ? (
          <ModelViewer glbUrl={glbUrl} usdzUrl={usdzUrl} name={name} onStatus={onStatus} />
        ) : imageUrl && !imgFailed ? (
          <img src={imageUrl} alt={name} onError={() => setImgFailed(true)} className="h-72 w-full object-cover" />
        ) : (
          <div className="flex h-72 items-center justify-center bg-teal-velvet/30 font-chalk text-7xl text-bloom" aria-label="No photo available">{name.slice(0, 1)}</div>
        )}
      </div>

      {glbUrl ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost gap-2" onClick={() => open3d(false)}><Box size={18} /> View in 3D</button>
            {wantAr && status === "ready" && arOk ? (
              <button className="btn gap-2" onClick={placeOnTable}><Smartphone size={18} /> Place on table</button>
            ) : (
              <button className="btn-ghost gap-2" onClick={() => open3d(true)} disabled={status === "loading"}><Smartphone size={18} /> View on my table</button>
            )}
          </div>
          <p role="status" className="text-sm text-chalk-dim">
            {status === "loading" && "Loading 3D model…"}
            {status === "error" && "The 3D model couldn’t be loaded. The photo is shown instead."}
            {status === "ready" && wantAr && !arOk && "AR isn’t supported on this device or browser. You can still rotate and zoom the 3D model."}
            {status === "ready" && wantAr && arOk && "Ready. Tap “Place on table”, then point your camera at a flat surface."}
            {status === "ready" && !wantAr && "Drag to rotate, pinch to zoom."}
            {status === "ready" && !sizeCalibrated && " Model size isn’t calibrated, so it may not match the real portion size."}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-chalk-dim">A 3D model isn’t available for this dish yet.</p>
      )}
    </div>
  );
}
