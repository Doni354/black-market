"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isPaused?: boolean;
  isActive?: boolean;
}

export function QRScanner({
  onScanSuccess,
  isPaused = false,
  isActive = true,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "qr-reader-container";

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [isManualPaused, setIsManualPaused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Play audio beep when QR is detected
  const playBeep = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted before interaction
    }
  }, []);

  const handleScan = useCallback(
    (decodedText: string) => {
      if (isPaused || isManualPaused || !isActive) return;

      playBeep();
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      onScanSuccess(decodedText);
    },
    [isPaused, isManualPaused, isActive, onScanSuccess, playBeep]
  );

  // Physical hardware camera track stop utility
  const forceStopHardwareTracks = useCallback(() => {
    try {
      const container = document.getElementById(readerElementId);
      const videoEl = container?.querySelector("video") as HTMLVideoElement | null;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        videoEl.srcObject = null;
      }
    } catch (e) {
      console.warn("forceStopHardwareTracks warning:", e);
    }
  }, [readerElementId]);

  // Clean shutdown of html5-qrcode instance
  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      }
    } catch (err) {
      console.warn("stopScanner caught:", err);
    } finally {
      forceStopHardwareTracks();
      setIsScanning(false);
    }
  }, [forceStopHardwareTracks]);

  // Enumerate cameras once on mount
  useEffect(() => {
    let isMounted = true;

    async function initCameras() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("belakang") ||
              d.label.toLowerCase().includes("environment")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          setHasPermission(true);
        } else {
          setErrorMsg("Tidak ada kamera yang terdeteksi di perangkat ini.");
          setHasPermission(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Camera access error:", err);
        setErrorMsg(
          "Izin akses kamera ditolak atau tidak didukung browser. Gunakan input manual di bawah."
        );
        setHasPermission(false);
      }
    }

    initCameras();

    return () => {
      isMounted = false;
      forceStopHardwareTracks();
    };
  }, [forceStopHardwareTracks]);

  // Stop camera when user switches browser tab or window minimizes
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        stopScanner();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [stopScanner]);

  // Lifecycle control: Start or stop scanner based on isActive, isPaused, and isManualPaused
  useEffect(() => {
    if (!selectedCameraId || !hasPermission) return;

    // Condition to run camera
    const shouldRun = isActive && !isPaused && !isManualPaused && !document.hidden;

    if (!shouldRun) {
      stopScanner();
      return;
    }

    let isSubscribed = true;

    const qr = new Html5Qrcode(readerElementId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    scannerRef.current = qr;

    qr.start(
      selectedCameraId,
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1.0,
      },
      (text) => {
        if (isSubscribed) {
          handleScan(text);
        }
      },
      () => {
        // Ignore normal frame scan failures
      }
    )
      .then(() => {
        if (isSubscribed) {
          setIsScanning(true);
          setErrorMsg(null);
        } else {
          qr.stop()
            .then(() => qr.clear())
            .catch(() => {})
            .finally(() => forceStopHardwareTracks());
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.error("Failed to start scanner:", err);
          setErrorMsg(
            "Gagal menyalakan feed kamera. Pastikan kamera tidak sedang dipakai aplikasi lain."
          );
          setIsScanning(false);
          forceStopHardwareTracks();
        }
      });

    return () => {
      isSubscribed = false;
      if (qr.isScanning) {
        qr.stop()
          .then(() => qr.clear())
          .catch(() => {})
          .finally(() => forceStopHardwareTracks());
      } else {
        forceStopHardwareTracks();
      }
    };
  }, [
    selectedCameraId,
    hasPermission,
    isActive,
    isPaused,
    isManualPaused,
    handleScan,
    stopScanner,
    forceStopHardwareTracks,
  ]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Viewfinder Window */}
      <div className="relative w-full max-w-sm aspect-square bg-[#183331] rounded-2xl overflow-hidden border border-[#2A524C] shadow-2xl flex items-center justify-center">
        {/* html5-qrcode reader mounting target */}
        <div id={readerElementId} className="w-full h-full" />

        {/* Custom Framing Overlay */}
        {isScanning && !isPaused && !isManualPaused && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-60 h-60 border-2 border-[#47957F]/80 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(71,149,127,0.3)]">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-[#47957F]" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-[#47957F]" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-l-4 border-b-4 border-[#47957F]" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-r-4 border-b-4 border-[#47957F]" />

              {/* Animated Scan Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#47957F] to-transparent animate-pulse shadow-[0_0_8px_#47957F]" />
            </div>
            <p className="text-[11px] font-bold text-[#EAF5F1] mt-4 bg-[#183331]/80 px-3 py-1 rounded-full border border-white/10 backdrop-blur-xs">
              Arahkan kamera ke QR Code Tiket Noury
            </p>
          </div>
        )}

        {/* Paused Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-[#183331]/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-10">
            <div className="w-10 h-10 rounded-full bg-[#47957F]/20 text-[#47957F] flex items-center justify-center mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xs font-bold text-white">Tiket Terdeteksi</p>
            <p className="text-[11px] text-[#A2C7BD] mt-0.5 text-center">
              Menampilkan detail tiket...
            </p>
          </div>
        )}

        {/* Manual Off State */}
        {isManualPaused && !isPaused && (
          <div className="absolute inset-0 bg-[#183331]/95 flex flex-col items-center justify-center p-4 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[#20443F] border border-[#2F615A] text-[#7A9C96] flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </div>
            <p className="text-xs font-bold text-[#EAF5F1]">Kamera Sedang Dinonaktifkan</p>
            <p className="text-[11px] text-[#A2C7BD] mt-1 max-w-xs">
              Kamera dimatikan untuk menghemat daya. Klik tombol di bawah untuk menyalakan kembali.
            </p>
            <button
              type="button"
              onClick={() => setIsManualPaused(false)}
              className="mt-3 px-3 py-1.5 rounded-xl bg-[#47957F] hover:bg-[#3D8383] text-white text-xs font-bold transition shadow-xs"
            >
              Nyalakan Kamera
            </button>
          </div>
        )}

        {/* Error or No Permission State */}
        {errorMsg && !isManualPaused && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-zinc-200">Kamera Tidak Tersedia</p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-xs">{errorMsg}</p>
          </div>
        )}
      </div>

      {/* Controls & Camera Switcher */}
      <div className="mt-3 flex items-center justify-between w-full max-w-sm px-1">
        {cameras.length > 1 ? (
          <div className="flex items-center gap-1.5">
            <label htmlFor="camera-select" className="text-[11px] text-[#52706C] font-semibold">
              Kamera:
            </label>
            <select
              id="camera-select"
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="text-xs bg-white border border-[#D5E4DF] text-[#183331] rounded-xl px-2 py-1 focus:border-[#47957F] focus:outline-none"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Kamera ${cam.id.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span />
        )}

        {/* Camera Toggle Button */}
        <button
          type="button"
          onClick={() => setIsManualPaused((prev) => !prev)}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition ${
            isManualPaused
              ? "bg-[#EAF5F1] border-[#CDE5DD] text-[#2A5E56] hover:bg-[#DDF0E8]"
              : "bg-white border-[#E2ECE8] text-[#52706C] hover:text-[#183331] hover:bg-[#F8FAF9]"
          }`}
        >
          {isManualPaused ? "Nyalakan Kamera" : "Matikan Kamera"}
        </button>
      </div>
    </div>
  );
}
