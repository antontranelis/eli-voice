import { useCallback, useRef, useState } from "react";

interface UseTTSOptions {
  enabled?: boolean;
  voice?: string;
}

export function useTTS({ enabled = false, voice = "nova" }: UseTTSOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(
    async (rawText: string) => {
      // Strip stage directions like *hält inne*, *gibt den Redestab weiter*
      const text = rawText.replace(/\*[^*]+\*/g, "").replace(/\s{2,}/g, " ").trim();
      if (!text) return;

      if (!enabled) {
        return speakBrowser(text);
      }

      setIsSpeaking(true);
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice }),
        });

        if (!response.ok) {
          throw new Error(`TTS error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      } catch (err) {
        console.error("TTS-Fehler:", err);
        speakBrowser(text);
      }
    },
    [enabled, voice]
  );

  const speakBrowser = useCallback((text: string) => {
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stopSpeaking };
}
