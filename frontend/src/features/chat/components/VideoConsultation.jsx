import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinRoom, leaveRoom } from '../webrtcSignaling';

function VideoConsultation() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // join the room
        joinRoom(roomId, stream, (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
      } catch (err) {
        console.error('Could not get media', err);
      }
    }
    initMedia();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      leaveRoom(roomId);
    };
  }, [roomId]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = muted);
      setMuted(prev => !prev);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = cameraOff);
      setCameraOff(prev => !prev);
    }
  };

  const handleLeave = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center p-4 h-full">
      <h2 className="text-2xl font-bold mb-4">Video Consultation</h2>
      <div className="flex space-x-4 mb-4">
        <video ref={localVideoRef} autoPlay muted className="w-1/3 h-auto bg-black" />
        <video ref={remoteVideoRef} autoPlay className="w-1/3 h-auto bg-black" />
      </div>
      <div className="space-x-2">
        <button onClick={toggleMute} className="bg-blue-500 text-white py-2 px-4 rounded">
          {muted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleCamera} className="bg-blue-500 text-white py-2 px-4 rounded">
          {cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        </button>
        <button onClick={handleLeave} className="bg-red-500 text-white py-2 px-4 rounded">
          End Call
        </button>
      </div>
    </div>
  );
}

export default VideoConsultation;
