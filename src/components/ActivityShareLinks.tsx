"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ActivityShareLinksProps {
  activityId: string;
}

export default function ActivityShareLinks({ activityId }: ActivityShareLinksProps) {
  const [copied, setCopied] = useState(false);
  const [participantLink, setParticipantLink] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/activity/${activityId}`;
      setParticipantLink(link);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`);
    }
  }, [activityId]);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(participantLink)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  if (!participantLink) {
    return null;
  }
  
  return (
    <div className="activity-share">
      <h3>Share this activity</h3>
      <p>Participants can join using this link:</p>
      
      <div className="share-link-container">
        <input 
          type="text" 
          value={participantLink} 
          readOnly 
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button 
          onClick={copyToClipboard}
          className={copied ? 'copied' : ''}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      <div className="qr-code-section">
        <p>Or scan this QR code:</p>
        <div className="qr-code">
          {qrCodeUrl && (
            <img 
              src={qrCodeUrl}
              alt="QR Code for activity link" 
              width={150}
              height={150}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .activity-share {
          margin-top: 2rem;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background-color: #f8f9fa;
          border-radius: 6px;
        }
        
        h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }
        
        .share-link-container {
          display: flex;
          margin-bottom: 1.5rem;
        }
        
        .share-link-container input {
          flex-grow: 1;
          padding: 0.75rem;
          border: 1px solid #dadce0;
          border-top-left-radius: 4px;
          border-bottom-left-radius: 4px;
          border-right: none;
          font-size: 0.9rem;
        }
        
        .share-link-container button {
          padding: 0.75rem 1rem;
          background-color: #1a73e8;
          color: white;
          border: none;
          border-top-right-radius: 4px;
          border-bottom-right-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .share-link-container button:hover {
          background-color: #1765cc;
        }
        
        .share-link-container button.copied {
          background-color: #34a853;
        }
        
        .qr-code-section {
          text-align: center;
        }
        
        .qr-code {
          display: inline-block;
          padding: 1rem;
          background-color: white;
          border-radius: 6px;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
        }
        
        .qr-code img {
          display: block;
        }
        
        @media (max-width: 600px) {
          .share-link-container {
            flex-direction: column;
          }
          
          .share-link-container input {
            border-right: 1px solid #dadce0;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
          }
          
          .share-link-container button {
            border-radius: 0 0 4px 4px;
          }
        }
      `}</style>
    </div>
  );
}