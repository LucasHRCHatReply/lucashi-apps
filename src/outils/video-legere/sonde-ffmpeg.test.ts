import { describe, expect, it } from 'vitest';
import { analyserSondeFfmpeg } from './sonde-ffmpeg';

// Journal réel d'ffmpeg pour un MOV iPhone HEVC vertical (forme standard de la sortie `ffmpeg -i`).
const iphone = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'IMG_0042.MOV':
  Duration: 00:01:10.03, start: 0.000000, bitrate: 17890 kb/s
  Stream #0:0[0x1](und): Video: hevc (Main 10) (hvc1 / 0x31637668), yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67), 1920x1080, 17650 kb/s, 29.97 fps, 29.97 tbr, 600 tbn (default)
    Side data:
      displaymatrix: rotation of -90.00 degrees
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 96 kb/s (default)`;

describe('analyserSondeFfmpeg', () => {
  it('lit durée, cadence, son et applique la rotation iPhone', () => {
    const s = analyserSondeFfmpeg(iphone)!;
    expect(s.duree).toBeCloseTo(70.03, 2);
    expect(s.largeur).toBe(1080);
    expect(s.hauteur).toBe(1920);
    expect(s.fps).toBeCloseTo(29.97, 2);
    expect(s.aAudio).toBe(true);
  });
  it('refuse un journal sans vidéo', () => {
    expect(analyserSondeFfmpeg('Duration: 00:00:03.00\n  Stream #0:0: Audio: mp3, 44100 Hz')).toBeNull();
  });
});
