# meem makr

`meem makr` is a client-side React + TypeScript web app for creating lolcat-style meme images. It lets you upload a local image, paste one from the clipboard, or capture one from your webcam, crop and resize it in the browser, add classic top and bottom meme captions, and export the result as a PNG or JPG.

## Features

- Local image upload with no server-side components
- Clipboard image paste with `Cmd+V` / `Ctrl+V`
- Webcam capture with an in-preview 3-2-1 countdown
- Drag-to-reposition crop with zoom control
- Top and bottom caption fields
- Impact-style meme text rendering with white fill and black outline
- PNG and JPG export

## Tech Stack

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local URL shown by Vite, typically:

```text
http://127.0.0.1:5173/
```

## Using the App

- Upload an image from your device, paste one from the clipboard, or open the webcam and capture a frame after the countdown.
- Drag the image preview to reposition the crop and use the zoom slider for framing.
- Enter top and bottom caption text, then export the result as PNG or JPG.

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment (josh.earth)

The app is served at `/meem-makr/` via pm2 + [serve](https://github.com/vercel/serve) on port 4001.

**First deploy** (run once on the server to set up the directory):

```bash
pm2 deploy ecosystem.config.cjs production setup
```

**Deploy:**

```bash
pm2 deploy ecosystem.config.cjs production
```

**Nginx config** — nginx proxies `/meem-makr/` to the local serve process. The trailing slash on `proxy_pass` strips the prefix before forwarding, so `serve` sees plain paths rooted at `dist/`:

```nginx
location /meem-makr/ {
    proxy_pass http://localhost:4001/;
    proxy_set_header Host $host;
}
```

## Notes

- The app runs entirely in the browser and does not upload images to a server.
- Clipboard paste depends on the browser providing image data through the paste event.
- Webcam capture requires browser camera permission.
- Exact Impact rendering depends on whether the font is available on the local system. The app falls back to similar heavy sans-serif fonts when needed.
