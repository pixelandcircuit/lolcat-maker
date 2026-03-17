# meem makr

`meem makr` is a client-side React + TypeScript web app for creating lolcat-style meme images. It lets you upload a local image, crop and resize it in the browser, add classic top and bottom meme captions, and export the result as a PNG or JPG.

## Features

- Local image upload with no server-side components
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

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Notes

- The app runs entirely in the browser and does not upload images to a server.
- Exact Impact rendering depends on whether the font is available on the local system. The app falls back to similar heavy sans-serif fonts when needed.
