'use client';

/**
 * Root-level error boundary. Required by the App Router to render a fallback
 * when an error bubbles past all nested boundaries (also avoids Next's
 * "could not find builtin global-error" dev overlay issue).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#020617',
          color: '#f1f5f9',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 480, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#FF6600' }}>
            Centro de Execução QA TMS
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>
            Ocorreu um erro inesperado ao renderizar a aplicação.
          </p>
          <pre
            style={{
              fontSize: 12,
              color: '#f87171',
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: 12,
              marginTop: 16,
              overflowX: 'auto',
              textAlign: 'left',
            }}
          >
            {error.message}
          </pre>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#FF6600',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
