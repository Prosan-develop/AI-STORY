/**
 * Audio Processor using Web Audio API for Vocal Remover / Voice Isolation,
 * Voice Pitch Modulation, and WAV conversion.
 */

// Helper to convert AudioBuffer to WAV Blob
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Interleave channels
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1 and 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Perform DSP Center-Channel Vocal Extraction or Vocal Removal
 * balance: -1.0 (100% Instrumental / Karaoke), 0.0 (Original), 1.0 (100% Isolated Vocals)
 * bassPreserve: 0.0 to 1.0 (restores sub bass in karaoke mode)
 */
export async function processVocalSeparation(
  audioBuffer: AudioBuffer,
  balance: number, // -1 to 1
  bassPreserve: number = 0.5
): Promise<AudioBuffer> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const numChannels = audioBuffer.numberOfChannels;

  // If mono, simulate stereo
  const left = audioBuffer.getChannelData(0);
  const right = numChannels > 1 ? audioBuffer.getChannelData(1) : left;

  const outBuffer = ctx.createBuffer(2, length, sampleRate);
  const outL = outBuffer.getChannelData(0);
  const outR = outBuffer.getChannelData(1);

  // Single-pole low-pass filter state for bass preservation
  let bassL = 0;
  let bassR = 0;
  const dt = 1 / sampleRate;
  const cutoffFreq = 160; // preserve sub-bass kick/bassline
  const rc = 1 / (2 * Math.PI * cutoffFreq);
  const alpha = dt / (rc + dt);

  for (let i = 0; i < length; i++) {
    const l = left[i];
    const r = right[i];

    // Low-pass filter for bass
    bassL += alpha * (l - bassL);
    bassR += alpha * (r - bassR);
    const midBass = (bassL + bassR) * 0.5 * bassPreserve;

    const side = (l - r) * 0.5; // Instrumental side component
    const mid = (l + r) * 0.5;  // Center / Vocal component

    if (balance <= 0) {
      // Karaoke / Vocal Removal mode (-1 to 0)
      // At -1: full side + preserved bass
      // At 0: original
      const factor = -balance; // 0 to 1
      const instrumentalL = side + midBass;
      const instrumentalR = -side + midBass;

      outL[i] = l * (1 - factor) + instrumentalL * factor;
      outR[i] = r * (1 - factor) + instrumentalR * factor;
    } else {
      // Vocal Isolation mode (0 to +1)
      // At +1: isolated mid channel with high/low cut
      const factor = balance; // 0 to 1
      const centerVocal = mid - midBass * 0.7; // subtract deep bass rumble

      outL[i] = l * (1 - factor) + centerVocal * factor;
      outR[i] = r * (1 - factor) + centerVocal * factor;
    }
  }

  return outBuffer;
}

/**
 * Apply Voice Modulation / Pitch shift presets
 */
export async function applyVoiceEffects(
  audioBuffer: AudioBuffer,
  presetId: string,
  pitchShiftFactor: number = 1.0,
  playbackSpeed: number = 1.0
): Promise<AudioBuffer> {
  // Use OfflineAudioContext for fast-as-light rendering
  const sampleRate = audioBuffer.sampleRate;
  const newLength = Math.max(1, Math.round(audioBuffer.length / (playbackSpeed * pitchShiftFactor)));
  
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    newLength,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = playbackSpeed * pitchShiftFactor;

  let lastNode: AudioNode = source;

  // Preset-specific DSP filtering
  if (presetId === 'deep-narrator') {
    // Boost low fundamental (120-250Hz), smooth highs
    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 220;
    bass.gain.value = 6;

    const high = offlineCtx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 3500;
    high.gain.value = -3;

    lastNode.connect(bass);
    bass.connect(high);
    lastNode = high;
  } else if (presetId === 'female-anime') {
    // Boost presence and crispness
    const presence = offlineCtx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2800;
    presence.gain.value = 5;

    const lowCut = offlineCtx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 250;

    lastNode.connect(lowCut);
    lowCut.connect(presence);
    lastNode = presence;
  } else if (presetId === 'robot') {
    // Ring modulator / distortion effect
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 4;

    lastNode.connect(filter);
    lastNode = filter;
  } else if (presetId === 'radio') {
    // Telephone / walkie-talkie bandpass
    const hp = offlineCtx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 400;

    const lp = offlineCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;

    lastNode.connect(hp);
    hp.connect(lp);
    lastNode = lp;
  } else if (presetId === 'cave-echo') {
    // Simple delay/feedback echo
    const delay = offlineCtx.createDelay();
    delay.delayTime.value = 0.28;

    const feedback = offlineCtx.createGain();
    feedback.gain.value = 0.42;

    const dryGain = offlineCtx.createGain();
    dryGain.gain.value = 0.8;

    const wetGain = offlineCtx.createGain();
    wetGain.gain.value = 0.5;

    const merger = offlineCtx.createGain();

    lastNode.connect(dryGain);
    dryGain.connect(merger);

    lastNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(merger);

    lastNode = merger;
  }

  lastNode.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}
