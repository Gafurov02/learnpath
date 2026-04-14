export default function OfflineFallback() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', textAlign: 'center', padding: 24 }}>
            <div>
                <div style={{ fontSize: 56, marginBottom: 16 }}>📡</div>
                <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 8 }}>No connection</h1>
                <p style={{ color: '#888', fontSize: 14 }}>Check your internet connection and try again.</p>
            </div>
        </div>
    );
}