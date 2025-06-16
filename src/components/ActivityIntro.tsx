// src/components/ActivityIntro.tsx
"use client";

export default function ActivityIntro() {
  return (
    <div className="activity-intro">
      <h2>In this activity you will...</h2>
      
      <div className="intro-steps">
        <div className="intro-step">
          <div className="step-header">
            <h3>Nominate Sub-Topics to Explore</h3>
          </div>
          <div className="step-content">
            <div className="topic-badges">
              <span className="topic-badge money">Money</span>
              <span className="topic-badge education">Education</span>
              <span className="topic-badge nature">Nature</span>
              <span className="topic-badge trust">Trust</span>
              <span className="topic-badge innovation">Innovation</span>
              <span className="topic-badge work">Work</span>
            </div>
            <div className="input-section">
              <div className="input-box">
                <input type="text" placeholder="Enter Sub-topic" disabled />
                <button className="add-button" disabled>+</button>
              </div>
            </div>
          </div>
        </div>

        <div className="intro-step">
          <div className="step-header">
            <h3>Map Your Personal Context</h3>
          </div>
          <div className="step-content">
            <div className="mapping-grid">
              <div className="axis-label top">Useful</div>
              <div className="axis-label left">Collective</div>
              <div className="axis-label right">Personal</div>
              <div className="axis-label bottom">Destructive</div>
              <div className="mapping-axis-arrows">
                <div className="arrow up"></div>
                <div className="arrow down"></div>
                <div className="arrow left"></div>
                <div className="arrow right"></div>
              </div>
              <div className="mapping-dots">
                <div className="dot orange" style={{top: '20%', left: '15%'}}></div>
                <div className="dot burgundy" style={{top: '15%', right: '15%'}}></div>
                <div className="dot yellow" style={{top: '40%', left: '50%', transform: 'translateX(-50%)'}}></div>
                <div className="dot beige" style={{bottom: '30%', left: '20%'}}></div>
                <div className="dot coral" style={{bottom: '20%', right: '20%'}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="intro-step">
          <div className="step-header">
            <h3>Explore the Social Map</h3>
          </div>
          <div className="step-content">
            <div className="social-map">
              <div className="axis-arrows">
                <div className="arrow up"></div>
                <div className="arrow left"></div>
                <div className="arrow right"></div>
                <div className="arrow down"></div>
              </div>
              <div className="story-bubbles">
                <div className="story-bubble large">
                  <p>"Money: large corporate impunity..."</p>
                </div>
                <div className="story-bubble small">
                  <p>"Money: my entrepreneur grandfather..."</p>
                </div>
              </div>
              <div className="map-dots">
                <div className="map-dot large-circle" style={{top: '45%', left: '30%', transform: 'translate(-50%, -50%)'}}></div>
                <div className="map-dot small-circle" style={{top: '20%', left: '15%'}}></div>
                <div className="map-dot small-circle" style={{top: '15%', right: '20%'}}></div>
                <div className="map-dot small-circle" style={{top: '30%', left: '70%'}}></div>
                <div className="map-dot small-circle" style={{top: '60%', left: '20%'}}></div>
                <div className="map-dot small-circle" style={{bottom: '25%', right: '25%'}}></div>
                <div className="map-dot small-circle" style={{bottom: '15%', left: '60%'}}></div>
                <div className="map-dot small-circle" style={{top: '35%', left: '85%'}}></div>
                <div className="map-dot small-circle" style={{bottom: '35%', left: '15%'}}></div>
                <div className="map-dot small-circle" style={{top: '70%', right: '15%'}}></div>
                <div className="map-dot small-circle" style={{bottom: '40%', right: '35%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .activity-intro {
          margin: 2rem auto;
          padding: 1.5rem;
          background-color: rgba(248, 245, 235, 0.8);
          border-radius: 12px;
          border: 1px solid rgba(232, 196, 160, 0.3);
          max-width: 400px;
        }

        .activity-intro h2 {
          text-align: center;
          margin-top: 0;
          margin-bottom: 2rem;
          color: var(--carafe-brown);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .intro-steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .intro-step {
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          padding: 1.5rem;
          border: 1px solid rgba(232, 196, 160, 0.2);
        }

        .step-header h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          color: var(--carafe-brown);
          font-size: 1.1rem;
          font-weight: 600;
          text-align: center;
        }

        .step-content {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        /* Step 1 - Topic Badges */
        .topic-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
          justify-content: center;
        }

        .topic-badge {
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
          border: none;
          cursor: default;
        }

        .topic-badge.money {
          background-color: #F5B700;
          color: var(--carafe-brown);
        }

        .topic-badge.education {
          background-color: #8B4513;
          color: white;
        }

        .topic-badge.nature {
          background-color: #F5B700;
          color: var(--carafe-brown);
        }

        .topic-badge.trust {
          background-color: #8B4513;
          color: white;
        }

        .topic-badge.innovation {
          background-color: #E86C2B;
          color: white;
        }

        .topic-badge.work {
          background-color: var(--carafe-brown);
          color: white;
        }

        .input-section {
          width: 100%;
          max-width: 250px;
        }

        .input-box {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .input-box input {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid rgba(232, 196, 160, 0.5);
          border-radius: 6px;
          background-color: rgba(255, 255, 255, 0.8);
          color: var(--warm-earth);
        }

        .add-button {
          width: 36px;
          height: 36px;
          background-color: #F5B700;
          color: var(--carafe-brown);
          border: none;
          border-radius: 6px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Step 2 - Mapping Grid */
        .mapping-grid {
          position: relative;
          width: 160px;
          height: 160px;
          background-color: rgba(255, 255, 255, 0.5);
        }

        .mapping-grid::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--carafe-brown);
          transform: translateY(-50%);
        }

        .mapping-grid::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: var(--carafe-brown);
          transform: translateX(-50%);
        }

        .axis-label {
          position: absolute;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--carafe-brown);
        }

        .axis-label.top {
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
        }

        .axis-label.bottom {
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
        }

        .axis-label.left {
          left: -55px;
          top: 40%;
          transform: translateY(-50%);
        }

        .axis-label.right {
          right: -45px;
          top: 60%;
          transform: translateY(-50%);
        }

        .mapping-dots {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .mapping-axis-arrows {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .mapping-axis-arrows .arrow {
          position: absolute;
          width: 0;
          height: 0;
        }

        .mapping-axis-arrows .arrow.up {
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 8px solid var(--carafe-brown);
        }

        .mapping-axis-arrows .arrow.down {
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid var(--carafe-brown);
        }

        .mapping-axis-arrows .arrow.left {
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-right: 8px solid var(--carafe-brown);
        }

        .mapping-axis-arrows .arrow.right {
          right: -5px;
          top: 50%;
          transform: translateY(-50%);
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 8px solid var(--carafe-brown);
        }

        .dot {
          position: absolute;
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .dot.orange {
          background-color: #E86C2B;
        }

        .dot.burgundy {
          background-color: #8B4513;
        }

        .dot.yellow {
          background-color: #F5B700;
        }

        .dot.beige {
          background-color: #C4A484;
        }

        .dot.coral {
          background-color: #E86C2B;
        }

        /* Step 3 - Social Map */
        .social-map {
          position: relative;
          width: 250px;
          height: 200px;
          background-color: rgba(248, 245, 235, 0.5);
          border-radius: 8px;
          padding: 1rem;
        }

        .social-map::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 1rem;
          right: 1rem;
          height: 2px;
          background-color: var(--carafe-brown);
          transform: translateY(-50%);
        }

        .social-map::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 1rem;
          bottom: 1rem;
          width: 2px;
          background-color: var(--carafe-brown);
          transform: translateX(-50%);
        }

        .axis-arrows {
          position: absolute;
          width: calc(100% - 2rem);
          height: calc(100% - 2rem);
          top: 1rem;
          left: 1rem;
        }

        .arrow {
          position: absolute;
          width: 0;
          height: 0;
        }

        .arrow.up {
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 8px solid var(--carafe-brown);
        }

        .arrow.down {
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid var(--carafe-brown);
        }

        .arrow.left {
          left: -5px;
          top: 50%;
          transform: translateY(-50%);
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-right: 8px solid var(--carafe-brown);
        }

        .arrow.right {
          right: -5px;
          top: 50%;
          transform: translateY(-50%);
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 8px solid var(--carafe-brown);
        }

        .story-bubbles {
          position: relative;
          z-index: 2;
        }

        .story-bubble {
          position: absolute;
          background-color: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          padding: 0.5rem;
          border: 1px solid rgba(232, 196, 160, 0.3);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .story-bubble.large {
          width: 120px;
          top: 80px;
          right: 20px;
        }

        .story-bubble.small {
          width: 100px;
          top: 20px;
          right: 20px;
        }

        .story-bubble p {
          margin: 0;
          font-size: 0.7rem;
          color: var(--carafe-brown);
          line-height: 1.2;
        }

        .map-dots {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .map-dot {
          position: absolute;
          border-radius: 50%;
        }

        .map-dot.large-circle {
          width: 60px;
          height: 60px;
          background-color: rgba(169, 199, 152, 0.3);
          border: 2px dashed #A9C798;
        }

        .map-dot.small-circle {
          width: 8px;
          height: 8px;
          background-color: #A9C798;
        }

        /* Mobile Layout */
        @media (max-width: 768px) {
          .intro-steps {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .intro-step {
            padding: 1rem;
          }

          .step-content {
            min-height: 150px;
          }

          .topic-badges {
            gap: 0.3rem;
          }

          .topic-badge {
            font-size: 0.8rem;
            padding: 0.3rem 0.6rem;
          }

          .mapping-grid {
            width: 120px;
            height: 120px;
          }

          .social-map {
            width: 200px;
            height: 150px;
          }

          .story-bubble.large {
            width: 100px;
          }

          .story-bubble.small {
            width: 80px;
          }

          .story-bubble p {
            font-size: 0.6rem;
          }
        }
      `}</style>
    </div>
  );
}