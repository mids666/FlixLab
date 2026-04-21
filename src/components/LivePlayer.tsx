import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface LivePlayerProps {
  url: string;
  autoPlay?: boolean;
}

export default function LivePlayer({ url, autoPlay = true }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;

    const startPlayback = async () => {
      try {
        if (autoPlay && video.paused) {
          await video.play();
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Video auto-play failed:', err);
        }
      }
    };

    // Standard HTML5 playback for Safari/iOS
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.onloadedmetadata = () => {
        if (isMounted) startPlayback();
      };
    } 
    // Use HLS.js for other browsers
    else if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // Don't auto-start loading until attached
        autoStartLoad: false
      });

      hlsRef.current = hls;
      
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(url);
      });
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isMounted) startPlayback();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && isMounted) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    }

    return () => {
      isMounted = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [url, autoPlay]);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-xl shadow-2xl">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        muted={autoPlay}
      />
    </div>
  );
}
