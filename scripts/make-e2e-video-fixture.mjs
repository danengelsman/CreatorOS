// F4.5: regenerates e2e/fixtures/mock-video.webm — the 1-frame VP8/WebM clip
// the e2e smoke spec serves as a mocked completed Gemini video render.
//
// Playwright's bundled ffmpeg (no external install, no new npm deps) only
// ships an MJPEG decoder and a VP8/libvpx encoder, so the pipeline is:
// any JPEG on disk -> image2pipe -> libvpx -> tiny .webm. Usage:
//
//   node scripts/make-e2e-video-fixture.mjs [source.jpg]
//
// Defaults to a Windows wallpaper JPEG when no source is given (this script is
// a dev convenience; the generated fixture is committed so CI never needs it).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const sourceArg = process.argv[2];
const candidates = sourceArg
  ? [sourceArg]
  : [
      'C:/Windows/Web/Wallpaper/Windows/img19.jpg',
      ...(fs.existsSync('C:/Windows/Web/Wallpaper')
        ? fs
            .readdirSync('C:/Windows/Web/Wallpaper', { recursive: true })
            .map((f) => `C:/Windows/Web/Wallpaper/${f}`)
            .filter((f) => f.toLowerCase().endsWith('.jpg'))
        : []),
    ];
const source = candidates.find((p) => fs.existsSync(p));
if (!source) throw new Error(`No source JPEG found (tried: ${candidates.join(', ')})`);

const localAppData = process.env.LOCALAPPDATA || '';
const ffmpegCandidates = fs.existsSync(localAppData)
  ? fs
      .readdirSync(path.join(localAppData, 'ms-playwright'))
      .filter((d) => d.startsWith('ffmpeg-'))
      .map((d) => path.join(localAppData, 'ms-playwright', d, 'ffmpeg-win64.exe'))
  : [];
const ffmpeg = ffmpegCandidates.find((p) => fs.existsSync(p));
if (!ffmpeg) throw new Error(`Playwright ffmpeg not found (tried: ${ffmpegCandidates.join(', ')})`);

const out = 'e2e/fixtures/mock-video.webm';
fs.mkdirSync(path.dirname(out), { recursive: true });
execFileSync(
  ffmpeg,
  [
    '-f',
    'image2pipe',
    '-c:v',
    'mjpeg',
    '-r',
    '10',
    '-i',
    'pipe:0',
    '-y',
    '-loglevel',
    'error',
    '-c:v',
    'libvpx',
    '-auto-alt-ref',
    '0',
    '-b:v',
    '100k',
    '-s',
    '128x128',
    '-r',
    '10',
    out,
  ],
  { input: fs.readFileSync(source), stdio: ['pipe', 'ignore', 'inherit'] },
);
console.log(`wrote ${out} (${fs.statSync(out).size} bytes) from ${source}`);
