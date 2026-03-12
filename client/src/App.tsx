import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="v3-full-screen v3-flex-center">
                <p style={{ color: 'var(--v3-text-muted)', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.3em' }}>
                    INITIALIZING PROTOCOL...
                </p>
            </div>
        );
    }

    return (
        <div className="v3-full-screen">
            {user ? <Dashboard user={user} /> : <Auth />}
        </div>
    );
};

export default App;
