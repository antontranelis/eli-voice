"""
Eli Voice — Whisper Transkription Server
=========================================

Einfacher WebSocket-Server der Audio-Chunks empfängt
und mit faster-whisper transkribiert.

Start: python whisper-server.py [--model small] [--port 9090]
"""

import argparse
import asyncio
import json
import io
import struct
import tempfile
import wave
from pathlib import Path

import numpy as np
import websockets
from faster_whisper import WhisperModel


class TranscriptionServer:
    def __init__(self, model_size: str = "small", device: str = "cpu"):
        print(f"Lade Whisper Modell '{model_size}' auf {device}...")
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type="int8" if device == "cpu" else "float16",
        )
        print("Modell geladen!")
        self.sample_rate = 16000

    async def handle_client(self, websocket):
        print(f"Client verbunden: {websocket.remote_address}")
        audio_buffer = bytearray()
        config = None

        try:
            async for message in websocket:
                # First message is config (JSON)
                if config is None and isinstance(message, str):
                    try:
                        config = json.loads(message)
                        print(f"Config: {config}")
                        await websocket.send(json.dumps({"status": "ready"}))
                    except json.JSONDecodeError:
                        pass
                    continue

                # Flush command: transcribe whatever is in the buffer now
                if isinstance(message, str):
                    try:
                        cmd = json.loads(message)
                        if cmd.get("flush"):
                            if len(audio_buffer) > 3200:
                                text = await self.transcribe(bytes(audio_buffer))
                                audio_buffer.clear()
                                if text.strip():
                                    await websocket.send(
                                        json.dumps({
                                            "text": text.strip(),
                                            "is_final": True,
                                        })
                                    )
                                else:
                                    await websocket.send(json.dumps({"flushed": True}))
                            else:
                                audio_buffer.clear()
                                await websocket.send(json.dumps({"flushed": True}))
                    except json.JSONDecodeError:
                        pass
                    continue

                # Audio data (Int16 PCM bytes)
                if isinstance(message, (bytes, bytearray)):
                    audio_buffer.extend(message)

                    # Transcribe every ~10 seconds of audio (320000 bytes = 10s at 16kHz 16-bit)
                    if len(audio_buffer) >= 320000:
                        text = await self.transcribe(bytes(audio_buffer))
                        audio_buffer.clear()

                        if text.strip():
                            await websocket.send(
                                json.dumps({
                                    "text": text.strip(),
                                    "is_final": True,
                                })
                            )

            # Transcribe remaining audio
            if len(audio_buffer) > 3200:  # At least 0.1s
                text = await self.transcribe(bytes(audio_buffer))
                if text.strip():
                    await websocket.send(
                        json.dumps({
                            "text": text.strip(),
                            "is_final": True,
                        })
                    )

        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"Fehler bei Client {websocket.remote_address}: {e}")
        finally:
            print(f"Client getrennt: {websocket.remote_address}")

    async def transcribe(self, audio_bytes: bytes) -> str:
        """Transkribiert Int16 PCM Audio-Bytes."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._transcribe_sync, audio_bytes)

    def _transcribe_sync(self, audio_bytes: bytes) -> str:
        """Synchrone Transkription."""
        # Convert Int16 PCM to float32 numpy array
        int16_array = np.frombuffer(audio_bytes, dtype=np.int16)
        float32_array = int16_array.astype(np.float32) / 32768.0

        segments, info = self.model.transcribe(
            float32_array,
            beam_size=1,
            language="de",
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=300,
                threshold=0.4,
            ),
            condition_on_previous_text=False,
        )

        texts = []
        for segment in segments:
            texts.append(segment.text)

        return " ".join(texts)

    async def run(self, host: str = "0.0.0.0", port: int = 9090):
        print(f"Whisper Server auf ws://{host}:{port}")
        async with websockets.serve(self.handle_client, host, port):
            await asyncio.Future()  # Run forever


def main():
    parser = argparse.ArgumentParser(description="Eli Voice Whisper Server")
    parser.add_argument("--model", default="small", help="Whisper model (tiny, base, small, medium, large, or HuggingFace repo)")
    parser.add_argument("--port", type=int, default=9090, help="WebSocket port")
    parser.add_argument("--device", default="cpu", help="Device (cpu or cuda)")
    args = parser.parse_args()

    server = TranscriptionServer(model_size=args.model, device=args.device)
    asyncio.run(server.run(port=args.port))


if __name__ == "__main__":
    main()
