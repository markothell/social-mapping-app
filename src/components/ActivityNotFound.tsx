"use client";

import Link from 'next/link';

export default function ActivityNotFound() {
  return (
    <div className="not-found-container">
      <div className="error-content">
        <h1>Activity Not Found</h1>
        <p>The activity you're looking for doesn't exist or has been deleted.</p>
        <Link href="https://socialinsight.tools" className="link-button">
          Go to Dashboard
        </Link>
      </div>

      <style jsx>{`
        .not-found-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 70vh;
        }
        
        .error-content {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          text-align: center;
          max-width: 500px;
        }
        
        h1 {
          margin-top: 0;
          color: #ea4335;
        }
        
        p {
          margin-bottom: 2rem;
          color: #5f6368;
        }
        
        .link-button {
          display: inline-block;
          background-color: #1a73e8;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          text-decoration: none;
          font-weight: 500;
          transition: background-color 0.2s;
        }
        
        .link-button:hover {
          background-color: #1765cc;
        }
      `}</style>
    </div>
  );
}