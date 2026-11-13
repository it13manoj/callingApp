import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Volume2, CheckCircle2 } from 'lucide-react';

export default function DeviceSettingsModal({ onClose }) {
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  
  const [micVolume, setMicVolume] = useState(0);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Checking hardware devices...');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Initialize preview stream & devices
  useEffect(() => {
    let isMounted = true;

    async function initPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setStatusMessage('Camera & Microphone working normally');

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vList = devices.filter(d => d.kind === 'videoinput');
        const aList = devices.filter(d => d.kind === 'audioinput');

        setVideoDevices(vList);
        setAudioDevices(aList);
        if (vList.length > 0) setSelectedVideo(vList[0].deviceId);
        if (aList.length > 0) setSelectedAudio(aList[0].deviceId);

        // Setup real-time audio volume visualizer
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (!isMounted) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalize volume 0 - 100
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.warn('Hardware preview failed:', err);
        setStatusMessage('Could not access all media devices. Check browser permissions.');
      }
    }

    initPreview();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleCam = () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamEnabled(track.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const track = streamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicEnabled(track.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-slate-700/80">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hardware & Device Check</h3>
              <p className="text-xs text-slate-400">{statusMessage}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="mt-5 relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${!isCamEnabled ? 'hidden' : ''}`}
          />
          {!isCamEnabled && (
            <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
              <VideoOff className="w-10 h-10 text-slate-600" />
              <span className="text-xs font-medium">Camera is turned off</span>
            </div>
          )}

          {/* Quick toggle overlay */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={toggleCam}
              className={`p-2 rounded-xl backdrop-blur-md transition ${
                isCamEnabled ? 'bg-slate-900/80 text-white' : 'bg-rose-600 text-white'
              }`}
              title={isCamEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCamEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMic}
              className={`p-2 rounded-xl backdrop-blur-md transition ${
                isMicEnabled ? 'bg-slate-900/80 text-white' : 'bg-rose-600 text-white'
              }`}
              title={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isMicEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Mic Volume Level Meter */}
        <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              Microphone Sensitivity
            </span>
            <span className="text-slate-400">{isMicEnabled ? `${micVolume}%` : 'Muted'}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                micVolume > 60
                  ? 'bg-rose-500'
                  : micVolume > 30
                  ? 'bg-emerald-400'
                  : 'bg-indigo-500'
              }`}
              style={{ width: isMicEnabled ? `${micVolume}%` : '0%' }}
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Speak into your mic to test input activity.
          </p>
        </div>

        {/* Device Selectors */}
        <div className="mt-4 space-y-3">
          {videoDevices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Camera Device
              </label>
              <select
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="w-full py-2 px-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {audioDevices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Microphone Device
              </label>
              <select
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(e.target.value)}
                className="w-full py-2 px-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {audioDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition text-xs"
        >
          Save & Return to Dashboard
        </button>
      </div>
    </div>
  );
}
