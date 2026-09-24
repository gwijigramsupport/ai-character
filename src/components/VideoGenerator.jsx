import React, { useState, useEffect } from 'react';

export default function VideoGenerator({ characterName }) {
  const [prompt, setPrompt] = useState(`Highly detailed animation of ${characterName}, symmetric face, photorealistic`);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, completed, failed
  const [videoUrl, setVideoUrl] = useState(null);

  const handleGenerate = async () => {
    setStatus('processing');
    try {
      const response = await fetch('http://localhost:8000/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      setJobId(data.job_id);
    } catch (err) {
      setStatus('failed');
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const checkStatus = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/video/status/${jobId}`);
        const data = await response.json();
        
        if (data.status === 'completed') {
          setVideoUrl(data.video_url);
          setStatus('completed');
          clearInterval(checkStatus);
        } else if (data.status === 'failed') {
          setStatus('failed');
          clearInterval(checkStatus);
        }
      } catch (err) {
        setStatus('failed');
        clearInterval(checkStatus);
      }
    }, 3000); // Poll status every 3 seconds

    return () => clearInterval(checkStatus);
  }, [jobId]);

  return (
    <div className="video-gen-box" style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', color: '#fff' }}>
      <h4>Generate Clip with {characterName}</h4>
      <textarea 
        value={prompt} 
        onChange={(e) => setPrompt(e.target.value)} 
        style={{ width: '100%', background: '#2b2d31', color: '#fff', border: '1px solid #4e5058', borderRadius: '4px', padding: '8px' }}
      />
      <button 
        onClick={handleGenerate} 
        disabled={status === 'processing'}
        style={{ marginTop: '10px', background: '#00e5ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {status === 'processing' ? 'Generating Video Engine...' : 'Generate Clip'}
      </button>

      {status === 'processing' && <p style={{ color: '#39ff14' }}>⏳ Cloud GPU is diffusing your animation loops... Please stay tuned.</p>}
      {status === 'failed' && <p style={{ color: '#ff4444' }}>❌ Generation failed. Check backend worker logs.</p>}
      
      {status === 'completed' && videoUrl && (
        <div style={{ marginTop: '15px' }}>
          <img src={videoUrl} alt="Generated Asset" style={{ width: '100%', borderRadius: '6px' }} />
        </div>
      )}
    </div>
  );
}
