// Runs after `expo export --platform web`.
// Adds PWA manifest + apple-touch-icon so the app logo shows
// when installed to the Android / iOS home screen from the browser.
// Also copies static pages (privacy policy, etc.) into the dist output.
const fs = require('fs');

fs.copyFileSync('logo/2.png', 'dist/apple-touch-icon.png');
fs.copyFileSync('public/privacy.html', 'dist/privacy.html');

fs.writeFileSync('dist/manifest.json', JSON.stringify({
  name: 'Tide',
  short_name: 'Tide',
  start_url: '/',
  display: 'standalone',
  background_color: '#edf0f6',
  theme_color: '#edf0f6',
  icons: [
    { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
}, null, 2));

let html = fs.readFileSync('dist/index.html', 'utf-8');
html = html.replace(
  '<link rel="icon"',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />\n  <link rel="manifest" href="/manifest.json" />\n  <link rel="icon"'
);
fs.writeFileSync('dist/index.html', html);

console.log('PWA assets injected.');
