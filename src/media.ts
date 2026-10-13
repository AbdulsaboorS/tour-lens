export async function openCamera() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment", width: { ideal: 1280 } },
    audio: { echoCancellation: true, noiseSuppression: true },
  });
}

export function grabFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 512 / video.videoWidth);

  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.75);
}

export function startRecording(stream: MediaStream) {
  const audioOnly = new MediaStream(stream.getAudioTracks());
  const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
  const recorder = new MediaRecorder(audioOnly, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => chunks.push(event.data);
  recorder.start();

  return () =>
    new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.stop();
    });
}

// Safari only plays audio from a context that was resumed inside a tap, so create it on the first tap.
export function createSpeaker() {
  const context = new AudioContext();
  let current: AudioBufferSourceNode | undefined;

  return {
    unlock: () => context.resume(),
    stop: () => current?.stop(),
    async play(base64: string) {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const buffer = await context.decodeAudioData(bytes.buffer);
      const source = context.createBufferSource();

      current?.stop();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
      current = source;
    },
  };
}
