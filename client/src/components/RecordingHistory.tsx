import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Play, Pause, Calendar, Clock, Trash2, HardDrive } from 'lucide-react';

interface Recording {
    id: number;
    name: string;
    storage_path: string;
    created_at: string;
}

interface Props {
    onPlay: (track: Recording) => void;
    currentTrackUrl?: string;
    isPlaying: boolean;
}

export const RecordingHistory: React.FC<Props> = ({ onPlay, currentTrackUrl, isPlaying }) => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        const { data, error } = await supabase
            .from('recordings')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setRecordings(data);
        setLoading(false);
    };

    const deleteRecording = async (e: React.MouseEvent, id: number, path: string) => {
        e.stopPropagation();
        await supabase.from('recordings').delete().eq('id', id);
        await supabase.storage.from('audio-recordings').remove([path]);
        fetchRecordings();
    };

    if (loading) return <p style={{ textAlign: 'center', padding: '10rem', fontWeight: 800, color: 'var(--v3-text-muted)', letterSpacing: '0.2em' }}>SYNCING VAULT...</p>;

    return (
        <div className="v3-animate-slide-up" style={{ paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2.5rem', letterSpacing: '-0.03em' }}>Node Archives</h2>

            {recordings.length === 0 ? (
                <div className="v3-card" style={{ textAlign: 'center', padding: '6rem' }}>
                    <HardDrive size={48} style={{ color: '#222', marginBottom: '1.5rem' }} />
                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>VAULT_EMPTY</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--v3-text-muted)', letterSpacing: '0.1em', marginTop: '0.5rem' }}>No data captured on this node yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {recordings.map((rec) => {
                        const isCurrent = currentTrackUrl?.includes(rec.storage_path);
                        return (
                            <div key={rec.id}
                                className="v3-card"
                                style={{
                                    padding: '1.5rem 2.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderRadius: '2rem',
                                    border: isCurrent ? '1px solid var(--v3-accent)' : '1px solid var(--v3-glass-border)',
                                    background: isCurrent ? 'rgba(0,102,255,0.03)' : 'var(--v3-glass)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    <button
                                        onClick={() => onPlay(rec)}
                                        style={{
                                            width: '56px', height: '56px',
                                            background: isCurrent && isPlaying ? 'var(--v3-accent)' : 'white',
                                            border: 'none', borderRadius: '1.25rem',
                                            color: isCurrent && isPlaying ? 'white' : 'black',
                                            cursor: 'pointer', transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {isCurrent && isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                    </button>
                                    <div>
                                        <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{rec.name}</p>
                                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--v3-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Calendar size={12} /> {new Date(rec.created_at).toLocaleDateString()}
                                            </p>
                                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--v3-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={12} /> {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => deleteRecording(e, rec.id, rec.storage_path)}
                                    style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#333')}
                                >
                                    <Trash2 size={24} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
