import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type ExportFormat = 'png' | 'jpg';

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
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

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

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image.url);
      }
    };
  }, [image]);

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

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

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
    setZoom(1);
    setOffsetX(0.5);
    setOffsetY(0.5);
    setDownloadName(stripExtension(file.name) || 'lolcat');
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) {
      return;
    }

    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offsetX,
      originY: offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;
    if (!image || !dragState) {
      return;
    }

    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height) * zoom;
    const sourceWidth = canvas.width / scale;
    const sourceHeight = canvas.height / scale;
    const maxSourceX = Math.max(0, image.width - sourceWidth);
    const maxSourceY = Math.max(0, image.height - sourceHeight);

    const deltaX = (event.clientX - dragState.startX) / rect.width;
    const deltaY = (event.clientY - dragState.startY) / rect.height;

    const nextOffsetX = clamp(
      dragState.originX - (deltaX * sourceWidth) / Math.max(maxSourceX, 1),
      0,
      1,
    );
    const nextOffsetY = clamp(
      dragState.originY - (deltaY * sourceHeight) / Math.max(maxSourceY, 1),
      0,
      1,
    );

    setOffsetX(Number.isFinite(nextOffsetX) ? nextOffsetX : 0.5);
    setOffsetY(Number.isFinite(nextOffsetY) ? nextOffsetY : 0.5);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
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
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={handleUpload}
          />
        </div>
      </section>

      <section className="workspace">
        <div className="preview-panel">
          <div className="preview-frame">
            <canvas
              ref={previewCanvasRef}
              className={`preview-canvas${image ? ' is-editable' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              aria-label="Lolcat preview"
            />
          </div>
          <p className="hint">
            {image
              ? 'Drag the image to reposition the crop. Use zoom for a tighter frame.'
              : 'Upload an image to start editing.'}
          </p>
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

export default App;
