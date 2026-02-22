import { useCallback, useEffect, useRef, useState } from "react";

interface UseWhisperOptions {
  host?: string;
  port?: number;
  onTranscript: (text: string, isFinal: boolean) => void;
}

export function useWhisper({
  host = "localhost",
  port = 9090,
  onTranscript,
}: UseWhisperOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0..1 normalized
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // ScriptProcessor to capture raw PCM (deprecated but simple + works)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Connect WebSocket to WhisperLive
      const ws = new WebSocket(`ws://${host}:${port}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Config message for our whisper-server.py
        ws.send(
          JSON.stringify({
            language: "de",
            model: "small",
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.segments) {
            for (const seg of data.segments) {
              onTranscriptRef.current(seg.text, seg.completed ?? false);
            }
          } else if (data.text) {
            onTranscriptRef.current(data.text, true);
          }
        } catch {
          // Binary or unknown message
        }
      };

      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);

      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);

        // Compute RMS audio level (0..1)
        let sum = 0;
        for (let i = 0; i < float32.length; i++) {
          sum += float32[i] * float32[i];
        }
        const rms = Math.sqrt(sum / float32.length);
        // Scale up so normal speech is ~0.3-0.7, clamp to 1
        setAudioLevel(Math.min(1, rms * 5));

        if (ws.readyState === WebSocket.OPEN) {
          // Convert Float32 to Int16 PCM
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          ws.send(int16.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsRecording(true);
    } catch (err) {
      console.error("Mikrofon-Fehler:", err);
    }
  }, [host, port]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    wsRef.current?.close();
    setIsRecording(false);
    setIsConnected(false);
  }, []);

  // Flush: tell server to transcribe whatever is in the buffer right now
  // Returns a promise that resolves when the transcription result arrives
  const flush = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        resolve();
        return;
      }

      // Listen for the next transcript message (= flush result)
      const onMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text || data.flushed) {
            ws.removeEventListener("message", onMessage);
            resolve();
          }
        } catch {
          // ignore
        }
      };
      ws.addEventListener("message", onMessage);

      // Timeout fallback in case buffer was empty (no response)
      setTimeout(() => {
        ws.removeEventListener("message", onMessage);
        resolve();
      }, 3000);

      ws.send(JSON.stringify({ flush: true }));
    });
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isRecording, isConnected, audioLevel, start, stop, flush };
}
