"use client";

interface ConnectionStatusProps {
  status: {
    isConnected: boolean;
    error: string | null;
  };
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className={`connection-status ${status.isConnected ? 'connected' : 'disconnected'}`}>
      {status.isConnected 
        ? 'Connected to session' 
        : `Disconnected: ${status.error || 'trying to reconnect...'}`}
      
      <style jsx>{`
        .connection-status {
          margin-top: 2rem;
          padding: 0.75rem;
          border-radius: 4px;
          font-size: 0.9rem;
          text-align: center;
        }
        
        .connection-status.connected {
          background-color: #e6f4ea;
          color: #34a853;
        }
        
        .connection-status.disconnected {
          background-color: #fdeded;
          color: #ea4335;
        }
      `}</style>
    </div>
  );
}