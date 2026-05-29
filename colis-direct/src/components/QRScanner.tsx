import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

type QRScannerProps = {
  onDetected: (text: string) => void;
  onClose: () => void;
};

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export default function QRScanner({ onDetected, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const zxingRef = useRef<BrowserQRCodeReader | null>(null);

  // Function to stop camera and cleanup
  const stopCamera = useCallback(() => {
    // Cancel animation frame if active
    // Stop ZXing reader
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    barcodeDetectorRef.current = null;

    zxingRef.current = null;

    // Stop all video tracks
    if (streamRef.current) {
      // Try to turn off torch if supported before stopping the track
      const videoTrack = streamRef.current.getVideoTracks?.()[0];
      try {
        const capabilities = (videoTrack as any)?.getCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          (videoTrack as any)
            .applyConstraints({ advanced: [{ torch: false }] })
            .catch(() => void 0);
        }
      } catch {
        // ignore torch capability errors
      }
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        streamRef.current?.removeTrack(track);
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }

    setIsScanning(false);
  }, []);

  const handleDetected = useCallback(
    (value: string) => {
      if (!value) return;
      stopCamera();
      onDetected(value);
    },
    [onDetected, stopCamera]
  );

  useEffect(() => {
    let isMounted = true;
    const start = async () => {
      try {
        setError(null);
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('La caméra n’est pas accessible sur cet appareil.');
        }

        const requestStream = async () => {
          try {
            return await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' as const },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
          } catch (envError) {
            return await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment' },
              audio: false,
            });
          }
        };

        const stream = await requestStream();
        if (!isMounted) {
          // Component was unmounted before stream was ready, stop it immediately
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch (playError: any) {
            console.warn('[QRScanner] video play failed initially:', playError?.name || playError);
            try {
              await new Promise((resolve, reject) => {
                const element = videoRef.current;
                if (!element) {
                  reject(new Error('Video element not ready'));
                  return;
                }
                const onCanPlay = () => {
                  element.play().then(resolve).catch(reject);
                  element.removeEventListener('loadedmetadata', onCanPlay);
                };
                element.addEventListener('loadedmetadata', onCanPlay);
              });
            } catch (retryError) {
              console.error('[QRScanner] video play retry failed:', retryError);
              throw new Error(
                "La caméra a été autorisée, mais la lecture n'a pas pu démarrer. Réessayez en quittant/rouvrant le scanner ou en relançant le navigateur."
              );
            }
          }
        } else {
          throw new Error('Caméra introuvable. Vérifiez les autorisations navigateur.');
        }
        const supportsBarcodeDetector =
          typeof window !== 'undefined' &&
          'BarcodeDetector' in window &&
          typeof window.BarcodeDetector === 'function';

        if (supportsBarcodeDetector) {
          try {
            barcodeDetectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
            const detectLoop = async () => {
              if (!isMounted || !videoRef.current || !barcodeDetectorRef.current) {
                return;
              }
              try {
                const barcodes = await barcodeDetectorRef.current.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const value = barcodes[0]?.rawValue || barcodes[0]?.data || '';
                  if (value) {
                    handleDetected(String(value));
                    return;
                  }
                }
              } catch {
                // ignore detection errors
              }
              rafRef.current = requestAnimationFrame(detectLoop);
            };
            setIsScanning(true);
            detectLoop();
            return;
          } catch {
            // fallback to ZXing below
          }
        }

        // ZXing continuous decode (fallback)
        try {
          const reader = new BrowserQRCodeReader(undefined, {
            delayBetweenScanAttempts: 200,
            delayBetweenScanSuccess: 500,
          });
          zxingRef.current = reader;
          reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
            if (!isMounted) {
              return;
            }
            if (result) {
              handleDetected(result.getText());
            }
          }).catch((decodeError) => {
            console.error('[QRScanner] decodeFromVideoDevice error:', decodeError);
          });
          setIsScanning(true);
        } catch (e) {
          console.error('[QRScanner] ZXing init error:', e);
          setIsScanning(true); // still show preview even if decoding fails
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e?.message || 'Impossible d\'accéder à la caméra');
          setIsScanning(false);
        }
      }
    };
    start();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [handleDetected, stopCamera]);

  // Handle close button - ensure camera is stopped
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <div className="space-y-4">
      {error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : null}
      <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        {!isScanning && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white">Initialisation caméra…</div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 border-2 border-white/60 m-6 rounded" />
      </div>
      <div className="text-xs text-[#6B7280]">
        Astuce: Cadrez le QR code dans le carré. Si la détection automatique n'est pas supportée par votre navigateur, vous pourrez lire manuellement le contenu.
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 border border-[#E6E6E6] rounded-lg text-[#3A3A3A] hover:bg-[#F6F7F9] transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}


