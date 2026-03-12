import os
import asyncio
import json
import logging
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack
from aiortc.mediastreams import AudioFrame
import pyaudio
import numpy as np
from fractions import Fraction

load_dotenv()

# Logger settings
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Audio Config
CHANNELS = 1
RATE = 48000
CHUNK = 960 # 20ms at 48kHz

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

pc = None

class MicrophoneStreamTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self):
        super().__init__()
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )

    async def recv(self):
        try:
            data = self.stream.read(CHUNK, exception_on_overflow=False)
            
            # Monitoring audio levels (RMS)
            audio_data = np.frombuffer(data, dtype=np.int16).astype(np.float64)
            rms = np.sqrt(np.mean(audio_data**2))
            
            if not hasattr(self, "_log_counter"):
                self._log_counter = 0
            self._log_counter += 1
            if self._log_counter % 50 == 0: # Every ~1 second
                logger.info(f"Audio Level (RMS): {rms:.2f}")

            frame = AudioFrame(format='s16', layout='mono', samples=CHUNK)
            frame.planes[0].update(data)
            frame.sample_rate = RATE
            frame.time_base = Fraction(1, RATE)
            
            # Manage timestamps (pts)
            if not hasattr(self, "_pts"):
                self._pts = 0
            frame.pts = self._pts
            self._pts += CHUNK
            
            return frame
        except Exception as e:
            logger.error(f"Error in microphone recv: {e}")
            raise e

async def handle_signaling(message, channel):
    global pc
    payload = message.get('payload', {})
    event = message.get('event')
    
    logger.info(f"!!! SIGNALING EVENT: {event} !!!")

    try:
        if event == 'webrtc-offer':
            logger.info("Processing WebRTC Offer...")
            if pc:
                logger.info("Closing existing PeerConnection")
                await pc.close()
                
            pc = RTCPeerConnection()
            
            @pc.on("connectionstatechange")
            async def on_connectionstatechange():
                logger.info(f"Connection state changed to: {pc.connectionState}")

            @pc.on("iceconnectionstatechange")
            async def on_iceconnectionstatechange():
                logger.info(f"ICE Connection state: {pc.iceConnectionState}")

            # Add microphone track
            pc.addTrack(MicrophoneStreamTrack())

            offer = RTCSessionDescription(sdp=payload['sdp'], type=payload['type'])
            await pc.setRemoteDescription(offer)
            logger.info("Remote description set.")

            answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            logger.info("Local description (answer) set. Gathering ICE candidates...")

            # Wait for ICE gathering to complete (non-trickle)
            retry_count = 0
            while pc.iceGatheringState != 'complete' and retry_count < 20:
                await asyncio.sleep(0.1)
                retry_count += 1
            
            logger.info(f"ICE gathering complete ({pc.iceGatheringState}). Sending Answer.")

            # Send Answer back via Broadcast using the channel instance
            # The python SDK uses positional arguments: send_broadcast(event, payload)
            await channel.send_broadcast(
                "webrtc-answer",
                {'sdp': pc.localDescription.sdp, 'type': pc.localDescription.type}
            )
            logger.info("!!! Answer sent successfully !!!")
        
        elif event == 'ice-candidate':
            # Non-trickle doesn't strictly need these but we log them
            logger.info("Received remote ICE candidate (ignoring for non-trickle flow)")
            
    except Exception as e:
        logger.error(f"Error in handle_signaling: {e}", exc_info=True)

async def start_listening():
    logger.info("--- Python Host Sanity Check: I AM ALIVE ---")
    logger.info("Starting listener...")
    
    try:
        supabase: AsyncClient = await create_async_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase Async Client initialized.")

        # Setup Realtime for Commands table
        def on_command(payload):
            async def process():
                logger.info(f"DB Change detected: {payload}")
                new_record = payload.get('new', {})
                if new_record.get('command_type') == 'start_listen':
                    logger.info("!!! START_LISTEN command received via DB !!!")
                elif new_record.get('command_type') == 'stop_listen':
                    logger.info("!!! STOP_LISTEN command received via DB !!!")
            asyncio.create_task(process())

        channel = supabase.channel('public:commands')
        channel.on_postgres_changes(
            event='INSERT', 
            schema='public', 
            table='commands', 
            callback=on_command
        )
        await channel.subscribe()
        logger.info("Subscribed to commands table changes.")

        # Setup Signaling Channel
        signaling_channel = supabase.channel('signaling')
        
        # Handle both Offer and ICE Candidates
        signaling_channel.on_broadcast(
            event='webrtc-offer', 
            callback=lambda msg: asyncio.create_task(handle_signaling(msg, signaling_channel))
        )
        signaling_channel.on_broadcast(
            event='ice-candidate', 
            callback=lambda msg: asyncio.create_task(handle_signaling(msg, signaling_channel))
        )
        
        await signaling_channel.subscribe()
        logger.info("Subscribed to signaling broadcast.")

        logger.info("Host is fully operational. Waiting for UI triggers...")
        while True:
            await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"Startup error: {e}")

if __name__ == "__main__":
    asyncio.run(start_listening())
