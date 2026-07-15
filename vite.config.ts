import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function getBuildNumber() {
  try {
    return execSync('git rev-list --count HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  base: '/meem-makr/',
  plugins: [react()],
  define: {
    __BUILD_NUMBER__: JSON.stringify(getBuildNumber()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
