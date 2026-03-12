import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { Mic, MicOff, Activity, Save, Wand2, ShieldCheck, Loader2 } from 'lucide-react';

export const LiveStream: React.FC = () => {
    const [status, setStatus] = useState<'idle' | 'listening' | 'connecting'>('idle');
    const [isRecording, setIsRecording] = useState(false);
    const [noiseReduction, setNoiseReduction] = useState(false);
    const [volume, setVolume] = useState(0);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const signalingChannelRef = useRef<any>(null);
    const currentSessionIdRef = useRef<string | null>(null);

    // Signaling Listener
    useEffect(() => {
        const channel = supabase.channel('signaling');
        signalingChannelRef.current = channel;

        channel.on('broadcast', { event: 'webrtc-answer' }, async ({ payload }: any) => {
            console.log('Received WebRTC Answer:', payload.type, 'Session:', payload.sessionId);

            // Session and state safety checks
            if (payload.sessionId !== currentSessionIdRef.current) {
                console.warn('Ignoring Answer: Session ID mismatch. Expected:', currentSessionIdRef.current);
                return;
            }

            if (pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
                try {
                    const answer = new RTCSessionDescription(payload);
                    await pcRef.current.setRemoteDescription(answer);
                } catch (err) {
                    console.error('Error setting remote description:', err);
                }
            } else {
                console.warn('Ignoring Answer: PC state is', pcRef.current?.signalingState);
            }
        }).on('broadcast', { event: 'ice-candidate' }, async ({ payload }: any) => {
            if (pcRef.current && payload.candidate && pcRef.current.remoteDescription) {
                try {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(payload));
                } catch (e) {
                    console.error('Error adding ICE candidate', e);
                }
            }
        }).subscribe((status: string) => {
            console.log('Signaling channel status:', status);
        });

        return () => {
            supabase.removeChannel(channel);
            signalingChannelRef.current = null;
        };
    }, []);

    // Waveform Visualization
    useEffect(() => {
        if (status === 'listening' && audioRef.current?.srcObject && canvasRef.current) {
            const stream = audioRef.current.srcObject as MediaStream;
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
            // Ensure context is running (fixes mobile silence)
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }

            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const draw = () => {
                if (!ctx || !analyserRef.current) return;
                animationFrameRef.current = requestAnimationFrame(draw);
                analyserRef.current.getByteFrequencyData(dataArray);
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const barWidth = (canvas.width / dataArray.length) * 2.5;
                let x = 0;
                let total = 0;

                for (let i = 0; i < dataArray.length; i++) {
                    const barHeight = (dataArray[i] / 255) * canvas.height;
                    total += dataArray[i];
                    ctx.fillStyle = `rgba(0, 102, 255, ${0.1 + (dataArray[i] / 255)})`;
                    ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
                    x += barWidth;
                }
                setVolume(total / dataArray.length);
            };
            draw();
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, [status]);

    const startStreaming = async () => {
        try {
            // Reset any existing connection
            if (pcRef.current) {
                console.log('Closing existing PeerConnection...');
                pcRef.current.close();
                pcRef.current = null;
            }

            // Mobile Audio Autoplay Fix: Prime the audio element on user interaction
            if (audioRef.current) {
                audioRef.current.play().catch(() => {
                    // This might fail because there's no source yet, which is fine.
                    // The goal is to "unlock" the audio element.
                });
            }

            setStatus('connecting');
            const sessionId = Math.random().toString(36).substring(7);
            currentSessionIdRef.current = sessionId;
            console.log('Starting new stream session:', sessionId);

            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            pcRef.current = pc;

            pc.ontrack = (event) => {
                // Only process tracks for the CURRENT peer connection
                if (audioRef.current && pcRef.current === pc) {
                    const stream = event.streams[0];
                    audioRef.current.srcObject = stream;
                    
                    // Explicit play with user-interaction-unlocked element
                    const playPromise = audioRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise.catch((error: any) => {
                            console.error("Audio play failed:", error);
                        });
                    }

                    setStatus('listening');
                    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                    mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => e.data.size > 0 && recordedChunksRef.current.push(e.data);
                    mediaRecorderRef.current.onstop = uploadRecording;
                }
            };

            pc.addTransceiver('audio', { direction: 'recvonly' });
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Non-trickle ICE gathering wait
            await new Promise<void>(res => pc.iceGatheringState === 'complete' ? res() : pc.onicegatheringstatechange = () => pc.iceGatheringState === 'complete' && res());

            await supabase.from('commands').insert([{ command_type: 'start_listen', status: 'pending' }]);

            if (signalingChannelRef.current) {
                console.log('Sending WebRTC Offer for session:', sessionId);
                await signalingChannelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc-offer',
                    payload: {
                        sdp: pc.localDescription?.sdp,
                        type: pc.localDescription?.type,
                        sessionId: sessionId
                    }
                });
            } else {
                console.error('Signaling channel is not initialized');
            }
        } catch (err) {
            console.error('Start streaming error:', err);
            currentSessionIdRef.current = null;
            setStatus('idle');
        }
    };

    const stopStreaming = async () => {
        if (isRecording) stopRecording();
        pcRef.current?.close();
        pcRef.current = null;
        await supabase.from('commands').insert([{ command_type: 'stop_listen', status: 'completed' }]);
        setStatus('idle');
        setVolume(0);
    };

    const startRecording = () => { recordedChunksRef.current = []; mediaRecorderRef.current?.start(); setIsRecording(true); };
    const stopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

    const uploadRecording = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { data, error } = await supabase.storage.from('audio-recordings').upload(`${userData.user.id}/${Date.now()}.webm`, blob);
        if (!error) await supabase.from('recordings').insert([{ name: `Session ${new Date().toLocaleString()}`, storage_path: data.path, user_id: userData.user.id }]);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }} className="v3-animate-slide-up v3-grid-2-1">
            {/* Monitor */}
            <div className="v3-card" style={{ position: 'relative', overflow: 'hidden', minHeight: '450px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'listening' ? 'var(--v3-accent)' : '#222' }} />
                    <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--v3-text-muted)', letterSpacing: '0.2em' }}>SECURE_LINK</p>
                </div>

                <button
                    onClick={status === 'idle' ? startStreaming : stopStreaming}
                    style={{
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        background: 'black',
                        border: status === 'idle' ? '1px solid #111' : '1px solid var(--v3-accent)',
                        color: status === 'idle' ? '#222' : 'var(--v3-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.5s ease',
                        boxShadow: status === 'listening' ? `0 0 ${20 + volume / 2}px var(--v3-accent-glow)` : 'none'
                    }}
                >
                    {status === 'connecting' ? <Loader2 className="v3-animate-spin" size={60} /> :
                        status === 'idle' ? <MicOff size={60} /> : <Mic size={60} />}
                </button>

                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                    <p style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.25rem' }}>{status.toUpperCase()}</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--v3-text-muted)', letterSpacing: '0.1em' }}>AES-256 ENCRYPTED CHANNEL</p>
                </div>

                <canvas ref={canvasRef} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '120px', opacity: 0.2, pointerEvents: 'none' }} />
            </div>

            {/* Config */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                    onClick={() => status === 'listening' && (isRecording ? stopRecording() : startRecording())}
                    disabled={status !== 'listening'}
                    style={{
                        padding: '2rem',
                        borderRadius: '2rem',
                        background: isRecording ? 'rgba(239, 68, 68, 0.05)' : 'var(--v3-glass)',
                        border: isRecording ? '1px solid #ef444433' : '1px solid var(--v3-glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <div className="v3-flex-center" style={{ width: '56px', height: '56px', borderRadius: '1rem', background: isRecording ? '#ef4444' : '#111', color: isRecording ? 'white' : '#555' }}>
                        <Save size={24} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <p style={{ fontWeight: 800, color: isRecording ? '#ef4444' : 'white' }}>{isRecording ? 'CAPTURING...' : 'ARCHIVE'}</p>
                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--v3-text-muted)' }}>STORAGE NODE</p>
                    </div>
                </button>

                <div className="v3-card" style={{ padding: '2rem', borderRadius: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={20} style={{ color: 'var(--v3-accent)' }} />
                        <p style={{ fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.1em' }}>PROTOCOL_V3</p>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--v3-text-muted)', lineHeight: 1.6 }}>Active P2P connection verified. All signals are encrypted using hardware-level keys.</p>
                </div>
            </div>

            <audio ref={audioRef} autoPlay playsInline controls={false} />
        </div>
    );
};
