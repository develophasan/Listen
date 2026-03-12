import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Shield, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'signup'>('login');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const { error: authError } = mode === 'login'
                ? await supabase.auth.signInWithPassword({ email, password })
                : await supabase.auth.signUp({ email, password });

            if (authError) throw authError;

            if (mode === 'signup') {
                setSuccess('CONFIRMATION_SENT: CHECK YOUR INBOX');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="v3-full-screen v3-flex-center" style={{ padding: '2rem' }}>
            <div className="v3-card v3-animate-slide-up" style={{ maxWidth: '450px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '3rem' }}>
                    <div className="v3-flex-center" style={{
                        width: '80px',
                        height: '80px',
                        background: 'white',
                        color: 'black',
                        borderRadius: '1.5rem',
                        margin: '0 auto 2rem',
                        boxShadow: '0 20px 40px rgba(255, 255, 255, 0.1)'
                    }}>
                        <Shield size={40} fill="currentColor" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.05em', marginBottom: '0.5rem' }}>
                        {mode === 'login' ? 'PROTOCOL_ENTRY' : 'CREATE_NODE'}
                    </h1>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--v3-text-muted)', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
                        Secure Surveillance Endpoint
                    </p>
                </div>

                <form onSubmit={handleAuth} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="v3-label">Operator ID</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--v3-text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="v3-input"
                                placeholder="name@secure.link"
                                style={{ paddingLeft: '3.5rem' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label className="v3-label">Security Key</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--v3-text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="v3-input"
                                placeholder="••••••••"
                                style={{ paddingLeft: '3.5rem' }}
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '1rem',
                            color: '#ef4444',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            marginBottom: '1.5rem',
                            textTransform: 'uppercase'
                        }}>
                            ERROR: {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            borderRadius: '1rem',
                            color: '#22c55e',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            marginBottom: '1.5rem',
                            textTransform: 'uppercase'
                        }}>
                            {success}
                        </div>
                    )}

                    <button disabled={loading} className="v3-button-primary" style={{ marginBottom: '1.5rem' }}>
                        {loading ? <Loader2 className="v3-animate-spin" size={20} /> : (
                            <>
                                <span>{mode === 'login' ? 'Establish Link' : 'Register Operator'}</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="v3-button-secondary"
                >
                    {mode === 'login' ? 'New Operator? Register' : 'Existing Operator? Login'}
                </button>
            </div>
        </div>
    );
};
