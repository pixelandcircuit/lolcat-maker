import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type ExportFormat = 'png' | 'jpg';

type GestureState = {
  activePointers: Map<number, { x: number; y: number }>;
  startPointers: Map<number, { x: number; y: number }>;
  startZoom: number;
  startOffsetX: number;
  startOffsetY: number;
  liveZoom: number;
  liveOffsetX: number;
  liveOffsetY: number;
};

type ImageState = {
  element: HTMLImageElement;
  url: string;
  width: number;
  height: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const DEFAULT_TOP_TEXT = 'I CAN HAZ';
const DEFAULT_BOTTOM_TEXT = 'CHEEZBURGER?';
const PREVIEW_WIDTH = 960;

function App() {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const captureCountdownTimeoutRef = useRef<number | null>(null);
  const gestureRef = useRef<GestureState | null>(null);

  const [image, setImage] = useState<ImageState | null>(null);
  const [topText, setTopText] = useState(DEFAULT_TOP_TEXT);
  const [bottomText, setBottomText] = useState(DEFAULT_BOTTOM_TEXT);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0.5);
  const [offsetY, setOffsetY] = useState(0.5);
  const [textScale, setTextScale] = useState(1);
  const [strokeScale, setStrokeScale] = useState(1);
  const [quality, setQuality] = useState(0.92);
  const [downloadName, setDownloadName] = useState('lolcat');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.url);
      }
    };
  }, [image]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (isCameraOpen && cameraStreamRef.current) {
      video.srcObject = cameraStreamRef.current;
      void video.play().catch(() => {
        setCameraError('Camera preview could not start automatically.');
      });
      return;
    }

    video.pause();
    video.srcObject = null;
  }, [isCameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera(cameraStreamRef);
      clearCaptureCountdown(captureCountdownTimeoutRef);
    };
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith('image/'),
      );

      if (!imageItem) {
        return;
      }

      const file = imageItem.getAsFile();
      if (!file) {
        setCameraError('The pasted image could not be read.');
        return;
      }

      event.preventDefault();
      void loadImageSource(file, 'pasted-image');
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    if (captureCountdown === null) {
      clearCaptureCountdown(captureCountdownTimeoutRef);
      return;
    }

    captureCountdownTimeoutRef.current = window.setTimeout(() => {
      if (captureCountdown > 1) {
        setCaptureCountdown(captureCountdown - 1);
        return;
      }

      setCaptureCountdown(null);
      void captureFrameFromCamera();
    }, 1000);

    return () => {
      clearCaptureCountdown(captureCountdownTimeoutRef);
    };
  }, [captureCountdown]);

  const aspectRatio = useMemo(() => {
    if (!image) {
      return 1;
    }

    return image.width / image.height;
  }, [image]);

  const previewHeight = useMemo(
    () => Math.max(540, Math.round(PREVIEW_WIDTH / aspectRatio)),
    [aspectRatio],
  );

  const drawMeme = (
    canvas: HTMLCanvasElement,
    format: ExportFormat,
    targetWidth?: number,
    targetHeight?: number,
  ) => {
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const width = targetWidth ?? PREVIEW_WIDTH;
    const height = targetHeight ?? previewHeight;
    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#101015';
    context.fillRect(0, 0, width, height);

    if (!image) {
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = `700 ${Math.round(width * 0.045)}px system-ui, sans-serif`;
      context.fillText('Upload a cat photo to begin', width / 2, height / 2);
      return;
    }

    const scale = Math.max(width / image.width, height / image.height) * zoom;
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const maxSourceX = Math.max(0, image.width - sourceWidth);
    const maxSourceY = Math.max(0, image.height - sourceHeight);
    const sourceX = maxSourceX * offsetX;
    const sourceY = maxSourceY * offsetY;

    context.imageSmoothingEnabled = true;
    context.drawImage(
      image.element,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );

    const baseFontSize = Math.max(28, Math.round(width * 0.11 * textScale));
    const lineHeight = baseFontSize * 1.05;
    const horizontalPadding = width * 0.06;
    const verticalPadding = height * 0.04;
    const strokeWidth = Math.max(3, baseFontSize * 0.12 * strokeScale);
    const fontFamily = 'Impact, Haettenschweiler, "Arial Black", sans-serif';

    const drawCaptionBlock = (text: string, fromTop: boolean) => {
      const normalized = text.trim().toUpperCase();
      if (!normalized) {
        return;
      }

      const lines = wrapText(context, normalized, width - horizontalPadding * 2, baseFontSize, fontFamily);
      const startY = fromTop
        ? verticalPadding + baseFontSize
        : height - verticalPadding - lineHeight * (lines.length - 1);

      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.lineJoin = 'round';
      context.strokeStyle = '#000000';
      context.fillStyle = '#ffffff';
      context.lineWidth = strokeWidth;
      context.miterLimit = 2;
      context.font = `${baseFontSize}px ${fontFamily}`;

      lines.forEach((line, index) => {
        const y = fromTop ? startY + index * lineHeight : startY - lineHeight + index * lineHeight;
        context.strokeText(line, width / 2, y);
        context.fillText(line, width / 2, y);
      });
    };

    drawCaptionBlock(topText, true);
    drawCaptionBlock(bottomText, false);

    if (format === 'jpg') {
      return;
    }
  };

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }

    drawMeme(canvas, 'png');
  }, [image, topText, bottomText, previewHeight, zoom, offsetX, offsetY, textScale, strokeScale]);

  const loadImageSource = async (file: Blob, fallbackName: string) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const nextImage = await loadImage(objectUrl);

      setImage((current) => {
        if (current) {
          URL.revokeObjectURL(current.url);
        }

        return {
          element: nextImage,
          url: objectUrl,
          width: nextImage.naturalWidth,
          height: nextImage.naturalHeight,
        };
      });

      if (isCameraOpen) {
        handleCloseCamera();
      }

      setCameraError('');
      setZoom(1);
      setOffsetX(0.5);
      setOffsetY(0.5);
      setDownloadName(stripExtension(file instanceof File ? file.name : fallbackName) || 'lolcat');
    } catch {
      setCameraError('The image could not be loaded.');
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    setCameraError('');
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await loadImageSource(file, file.name);
  };

  const handleStartCamera = async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError('This browser does not support webcam capture.');
      return;
    }

    setIsStartingCamera(true);
    setCameraError('');

    try {
      stopCamera(cameraStreamRef);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch (error) {
      setCameraError(getCameraErrorMessage(error));
      setIsCameraOpen(false);
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleCloseCamera = () => {
    clearCaptureCountdown(captureCountdownTimeoutRef);
    setCaptureCountdown(null);
    stopCamera(cameraStreamRef);
    setIsCameraOpen(false);
    setCameraError('');
  };

  const captureFrameFromCamera = async () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('The camera is not ready to capture a frame yet.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError('The browser could not create a camera snapshot.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      setCameraError('The camera snapshot could not be created.');
      return;
    }

    await loadImageSource(blob, 'meem-makr-camera-shot');
  };

  const handleCaptureFromCamera = () => {
    if (captureCountdown !== null) {
      return;
    }

    setCameraError('');
    setCaptureCountdown(3);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const pos = { x: event.clientX, y: event.clientY };

    if (!gestureRef.current) {
      const activePointers = new Map([[event.pointerId, pos]]);
      gestureRef.current = {
        activePointers,
        startPointers: new Map(activePointers),
        startZoom: zoom,
        startOffsetX: offsetX,
        startOffsetY: offsetY,
        liveZoom: zoom,
        liveOffsetX: offsetX,
        liveOffsetY: offsetY,
      };
    } else {
      gestureRef.current.activePointers.set(event.pointerId, pos);
      gestureRef.current.startPointers = new Map(gestureRef.current.activePointers);
      gestureRef.current.startZoom = gestureRef.current.liveZoom;
      gestureRef.current.startOffsetX = gestureRef.current.liveOffsetX;
      gestureRef.current.startOffsetY = gestureRef.current.liveOffsetY;
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (!image || !gesture || !gesture.activePointers.has(event.pointerId)) {
      return;
    }

    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }

    gesture.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const rect = canvas.getBoundingClientRect();
    const count = gesture.activePointers.size;

    if (count === 1) {
      const [[, current]] = [...gesture.activePointers.entries()];
      const [[, start]] = [...gesture.startPointers.entries()];

      const scale = Math.max(canvas.width / image.width, canvas.height / image.height) * gesture.startZoom;
      const sourceWidth = canvas.width / scale;
      const sourceHeight = canvas.height / scale;
      const maxSourceX = Math.max(0, image.width - sourceWidth);
      const maxSourceY = Math.max(0, image.height - sourceHeight);

      const deltaX = (current.x - start.x) / rect.width;
      const deltaY = (current.y - start.y) / rect.height;

      const nextOffsetX = clamp(
        gesture.startOffsetX - (deltaX * sourceWidth) / Math.max(maxSourceX, 1),
        0,
        1,
      );
      const nextOffsetY = clamp(
        gesture.startOffsetY - (deltaY * sourceHeight) / Math.max(maxSourceY, 1),
        0,
        1,
      );

      gesture.liveOffsetX = Number.isFinite(nextOffsetX) ? nextOffsetX : 0.5;
      gesture.liveOffsetY = Number.isFinite(nextOffsetY) ? nextOffsetY : 0.5;
      setOffsetX(gesture.liveOffsetX);
      setOffsetY(gesture.liveOffsetY);
    } else if (count >= 2) {
      const [p1, p2] = [...gesture.activePointers.values()];
      const [s1, s2] = [...gesture.startPointers.values()];

      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const startDist = Math.hypot(s2.x - s1.x, s2.y - s1.y);
      const newZoom = clamp(gesture.startZoom * (currentDist / startDist), 1, 3);

      const currentMidX = (p1.x + p2.x) / 2;
      const currentMidY = (p1.y + p2.y) / 2;
      const startMidX = (s1.x + s2.x) / 2;
      const startMidY = (s1.y + s2.y) / 2;

      const scale = Math.max(canvas.width / image.width, canvas.height / image.height) * newZoom;
      const sourceWidth = canvas.width / scale;
      const sourceHeight = canvas.height / scale;
      const maxSourceX = Math.max(0, image.width - sourceWidth);
      const maxSourceY = Math.max(0, image.height - sourceHeight);

      const deltaX = (currentMidX - startMidX) / rect.width;
      const deltaY = (currentMidY - startMidY) / rect.height;

      const nextOffsetX = clamp(
        gesture.startOffsetX - (deltaX * sourceWidth) / Math.max(maxSourceX, 1),
        0,
        1,
      );
      const nextOffsetY = clamp(
        gesture.startOffsetY - (deltaY * sourceHeight) / Math.max(maxSourceY, 1),
        0,
        1,
      );

      gesture.liveZoom = newZoom;
      gesture.liveOffsetX = Number.isFinite(nextOffsetX) ? nextOffsetX : 0.5;
      gesture.liveOffsetY = Number.isFinite(nextOffsetY) ? nextOffsetY : 0.5;
      setZoom(gesture.liveZoom);
      setOffsetX(gesture.liveOffsetX);
      setOffsetY(gesture.liveOffsetY);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const gesture = gestureRef.current;
    if (!gesture) {
      return;
    }

    gesture.activePointers.delete(event.pointerId);

    if (gesture.activePointers.size === 0) {
      gestureRef.current = null;
    } else {
      // Reset start state so the remaining pointer continues from the current position
      gesture.startPointers = new Map(gesture.activePointers);
      gesture.startZoom = gesture.liveZoom;
      gesture.startOffsetX = gesture.liveOffsetX;
      gesture.startOffsetY = gesture.liveOffsetY;
    }
  };

  const handleDownload = (format: ExportFormat) => {
    const canvas = document.createElement('canvas');
    const width = image?.width ?? PREVIEW_WIDTH;
    const height = image?.height ?? previewHeight;

    drawMeme(canvas, format, width, height);

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl =
      format === 'png' ? canvas.toDataURL(mimeType) : canvas.toDataURL(mimeType, quality);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${downloadName || 'lolcat'}.${format}`;
    link.click();
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-heading">
          <p className="eyebrow">meem makr</p>
          <p className="intro">
            Upload a photo, crop and scale it into place, add top and bottom captions,
            then export a finished meme as PNG or JPG.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => fileInputRef.current?.click()}>
            Upload Image
          </button>
          <button
            className="secondary-button"
            onClick={isCameraOpen ? handleCloseCamera : handleStartCamera}
            disabled={isStartingCamera}
          >
            {isCameraOpen ? 'Close Camera' : isStartingCamera ? 'Starting Camera...' : 'Use Webcam'}
          </button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={handleUpload}
          />
          <p className="source-hint">or paste an image with Cmd+V / Ctrl+V</p>
        </div>
      </section>

      <section className="workspace">
        <div className="preview-panel">
          <div className="preview-frame">
            {isCameraOpen ? (
              <div className="camera-stage">
                <video
                  ref={videoRef}
                  className="camera-preview"
                  autoPlay
                  playsInline
                  muted
                />
                {captureCountdown === null ? (
                  <div className="camera-overlay-actions">
                    <button
                      className="primary-button compact-button"
                      onClick={handleCaptureFromCamera}
                    >
                      Capture
                    </button>
                    <button
                      className="secondary-button compact-button"
                      onClick={handleCloseCamera}
                    >
                      Stop
                    </button>
                  </div>
                ) : (
                  <div className="camera-countdown" aria-live="assertive">
                    {captureCountdown}
                  </div>
                )}
              </div>
            ) : (
              <canvas
                ref={previewCanvasRef}
                className={`preview-canvas${image ? ' is-editable' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="Lolcat preview"
              />
            )}
          </div>
          <p className="hint">
            {isCameraOpen
              ? 'Position your webcam shot, then capture it to turn it into the meme source image.'
              : image
              ? 'Drag to reposition. Pinch to zoom on touch screens, or use the zoom slider.'
              : 'Upload, paste, or capture an image to start editing.'}
          </p>
          {cameraError ? <p className="camera-error">{cameraError}</p> : null}
        </div>

        <aside className="controls-panel">
          <label className="field">
            <span>Top text</span>
            <input
              type="text"
              value={topText}
              onChange={(event) => setTopText(event.target.value)}
              placeholder="I CAN HAZ"
            />
          </label>

          <label className="field">
            <span>Bottom text</span>
            <input
              type="text"
              value={bottomText}
              onChange={(event) => setBottomText(event.target.value)}
              placeholder="CHEEZBURGER?"
            />
          </label>

          <label className="field">
            <span>Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Text size</span>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.01"
              value={textScale}
              onChange={(event) => setTextScale(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Outline weight</span>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.01"
              value={strokeScale}
              onChange={(event) => setStrokeScale(Number(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Filename</span>
            <input
              type="text"
              value={downloadName}
              onChange={(event) => setDownloadName(sanitizeFilename(event.target.value))}
              placeholder="lolcat"
            />
          </label>

          <label className="field">
            <span>JPG quality</span>
            <input
              type="range"
              min="0.4"
              max="1"
              step="0.01"
              value={quality}
              onChange={(event) => setQuality(Number(event.target.value))}
            />
          </label>

          <div className="download-actions">
            <button className="primary-button" onClick={() => handleDownload('png')} disabled={!image}>
              Download PNG
            </button>
            <button className="secondary-button" onClick={() => handleDownload('jpg')} disabled={!image}>
              Download JPG
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
) {
  context.font = `${fontSize}px ${fontFamily}`;

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load image.'));
    image.src = url;
  });
}

function stripExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, '');
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '');
}

function stopCamera(streamRef: { current: MediaStream | null }) {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

function clearCaptureCountdown(timeoutRef: { current: number | null }) {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Camera access was denied. Allow webcam permission and try again.';
    }

    if (error.name === 'NotFoundError') {
      return 'No webcam was found on this device.';
    }

    if (error.name === 'NotReadableError') {
      return 'The webcam is already in use by another app.';
    }
  }

  return 'The webcam could not be started.';
}

export default App;
