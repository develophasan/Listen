import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import { LiveStream } from './LiveStream';
import { RecordingHistory } from './RecordingHistory';
import {
    LogOut, LayoutDashboard, History, Settings, Bell, Search, Hexagon,
    Play, Pause, X, Volume2, SkipBack, SkipForward
} from 'lucide-react';

export const Dashboard: React.FC<{ user: any }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'live' | 'history' | 'config'>('live');
    const [activeTrack, setActiveTrack] = useState<{ name: string, url: string } | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlayTrack = async (track: { name: string, storage_path: string }) => {
        const { data } = await supabase.storage.from('audio-recordings').createSignedUrl(track.storage_path, 3600);
        if (data?.signedUrl) {
            if (activeTrack?.url === data.signedUrl) {
                if (isPlaying) {
                    audioRef.current?.pause();
                    setIsPlaying(false);
                } else {
                    audioRef.current?.play();
                    setIsPlaying(true);
                }
            } else {
                setActiveTrack({ name: track.name, url: data.signedUrl });
                setIsPlaying(true);
            }
        }
    };

    useEffect(() => {
        if (activeTrack && audioRef.current) {
            audioRef.current.play();
        }
    }, [activeTrack]);

    const closePlayer = () => {
        audioRef.current?.pause();
        setActiveTrack(null);
        setIsPlaying(false);
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }} className="v3-dashboard-layout">
            <audio
                ref={audioRef}
                src={activeTrack?.url}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            {/* Sidebar */}
            <aside style={{
                width: '320px',
                background: '#050505',
                padding: '3rem 2rem',
                borderRight: '1px solid var(--v3-glass-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4rem',
                zIndex: 100,
                transition: 'all 0.3s ease'
            }} className="v3-sidebar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }} className="v3-sidebar-logo">
                    <div className="v3-flex-center" style={{ width: '48px', height: '48px', background: 'white', color: 'black', borderRadius: '1rem' }}>
                        <Hexagon size={24} fill="currentColor" />
                    </div>
                    <div>
                        <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white' }}>Acil Durum</p>
                        <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--v3-accent)', letterSpacing: '0.3em' }}>PLATFORM V4</p>
                    </div>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="v3-sidebar-nav">
                    <button
                        onClick={() => setActiveTab('live')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', border: 'none',
                            background: activeTab === 'live' ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: activeTab === 'live' ? 'white' : 'var(--v3-text-muted)',
                            cursor: 'pointer', fontWeight: 700, textAlign: 'left', transition: 'all 0.3s ease'
                        }}
                    >
                        <LayoutDashboard size={20} style={{ color: activeTab === 'live' ? 'var(--v3-accent)' : 'inherit' }} />
                        <span>Live Monitor</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', border: 'none',
                            background: activeTab === 'history' ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: activeTab === 'history' ? 'white' : 'var(--v3-text-muted)',
                            cursor: 'pointer', fontWeight: 700, textAlign: 'left', transition: 'all 0.3s ease'
                        }}
                    >
                        <History size={20} style={{ color: activeTab === 'history' ? 'var(--v3-accent)' : 'inherit' }} />
                        <span>Archives</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', border: 'none',
                            background: activeTab === 'config' ? 'rgba(255,255,255,0.05)' : 'transparent',
                            color: activeTab === 'config' ? 'white' : 'var(--v3-text-muted)',
                            cursor: 'pointer', fontWeight: 700, textAlign: 'left', transition: 'all 0.3s ease'
                        }}
                    >
                        <Settings size={20} style={{ color: activeTab === 'config' ? 'var(--v3-accent)' : 'inherit' }} />
                        <span>Config</span>
                    </button>
                </nav>

                <div className="v3-card v3-sidebar-user" style={{ padding: '1.5rem', borderRadius: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ width: '40px', height: '40px', background: '#111', borderRadius: '12px' }} />
                        <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>{user.email.split('@')[0]}</p>
                            <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--v3-accent)' }}>OPERATOR</p>
                        </div>
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        style={{
                            width: '100%', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)',
                            borderRadius: '0.75rem', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer'
                        }}
                    >
                        Terminate Link
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <header style={{
                    height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4rem',
                    borderBottom: '1px solid var(--v3-glass-border)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)'
                }} className="v3-main-header">
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
                            {activeTab === 'live' ? 'SYSTEM_MONITOR' : activeTab === 'history' ? 'VAULT_ACCESS' : 'CONFIG_NODE'}
                        </h2>
                        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--v3-text-muted)', letterSpacing: '0.3em' }}>NODE_STATUS: ACTIVE</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ position: 'relative' }} className="v3-search-box">
                            <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--v3-text-muted)' }} />
                            <input
                                type="text" placeholder="Search Protocol..."
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--v3-glass-border)', borderRadius: '2rem', padding: '0.75rem 1.5rem 0.75rem 3.5rem', color: 'white', fontSize: '0.75rem', width: '300px' }}
                            />
                        </div>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--v3-text-muted)', cursor: 'pointer' }}>
                            <Bell size={24} />
                        </button>
                    </div>
                </header>

                <div style={{ flex: 1, padding: '4rem', overflowY: 'auto' }} className="v3-main-content">
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        {activeTab === 'live' && <LiveStream />}
                        {activeTab === 'history' && <RecordingHistory onPlay={handlePlayTrack} currentTrackUrl={activeTrack?.url} isPlaying={isPlaying} />}
                        {activeTab === 'config' && (
                            <div className="v3-animate-slide-up">
                                <h1 style={{ fontWeight: 800, marginBottom: '2rem' }}>Node Configuration</h1>
                                <div className="v3-card">
                                    <p style={{ color: 'var(--v3-text-muted)', fontSize: '0.9rem' }}>System configuration is currently managed by central authority.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Global Player Bar */}
                {activeTrack && (
                    <div className="v3-player-bar v3-animate-slide-up">
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div className="v3-flex-center" style={{ width: '48px', height: '48px', background: 'var(--v3-accent)', borderRadius: '1rem', color: 'white' }}>
                                <Volume2 size={24} />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <p style={{ fontWeight: 800, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeTrack.name}</p>
                                <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--v3-accent)', letterSpacing: '0.1em' }}>VAULT_PLAYBACK</p>
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                            <button style={{ background: 'none', border: 'none', color: 'var(--v3-text-muted)', cursor: 'pointer' }}><SkipBack size={20} /></button>
                            <button
                                onClick={() => {
                                    if (isPlaying) audioRef.current?.pause();
                                    else audioRef.current?.play();
                                }}
                                style={{ width: '50px', height: '50px', background: 'white', color: 'black', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />}
                            </button>
                            <button style={{ background: 'none', border: 'none', color: 'var(--v3-text-muted)', cursor: 'pointer' }}><SkipForward size={20} /></button>
                        </div>

                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={closePlayer} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--v3-text-muted)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
