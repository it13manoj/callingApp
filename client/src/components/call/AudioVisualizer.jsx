import React, { useEffect, useRef } from 'react';

export default function AudioVisualizer({ stream, isMuted = false, height = 120, width = 360 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let analyser = null;
    let dataArray = null;

    if (stream && stream.getAudioTracks().length > 0 && !isMuted) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (e) {
        console.warn('AudioContext visualization setup:', e);
      }
    }

    let phase = 0;

    const render = () => {
      animRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      const numBars = 36;
      const barWidth = Math.floor(width / numBars) - 3;
      const centerY = height / 2;

      if (analyser && dataArray && !isMuted) {
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < numBars; i++) {
          const index = Math.floor((i / numBars) * dataArray.length);
          const val = dataArray[index] || 0;
          const barHeight = Math.max(6, (val / 255) * (height - 16));

          const x = i * (barWidth + 3);
          const y = centerY - barHeight / 2;

          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#818cf8');
          grad.addColorStop(0.5, '#6366f1');
          grad.addColorStop(1, '#a855f7');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 4);
          ctx.fill();
        }
      } else {
        // Procedural gentle resting wave when idle or muted
        phase += 0.04;
        for (let i = 0; i < numBars; i++) {
          const factor = Math.sin(phase + i * 0.2);
          const barHeight = isMuted ? 4 : Math.max(6, (factor + 1) * 12);
          const x = i * (barWidth + 3);
          const y = centerY - barHeight / 2;

          ctx.fillStyle = isMuted ? 'rgba(100, 116, 139, 0.4)' : 'rgba(99, 102, 241, 0.35)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      }
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, isMuted, width, height]);

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-2xl"
      />
    </div>
  );
}
