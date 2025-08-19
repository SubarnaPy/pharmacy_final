import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'simple-peer';
import { toast } from 'react-hot-toast';

export const useWebRTC = (socket, consultationId, isInitiator = false) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  
  const peerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Get user media
  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  }, []);

  // Initialize peer connection
  const initializePeer = useCallback(async (stream) => {
    if (!socket) return;

    const peer = new Peer({
      initiator: isInitiator,
      trickle: true,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:numb.viagenie.ca',
            username: 'webrtc@live.com',
            credential: 'muazkh'
          }
        ]
      }
    });

    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socket.emit('video-offer', {
          consultationId,
          offer: data
        });
      } else if (data.type === 'answer') {
        socket.emit('video-answer', {
          consultationId,
          answer: data
        });
      } else if (data.candidate) {
        socket.emit('ice-candidate', {
          consultationId,
          candidate: data
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.on('connect', () => {
      setConnectionState('connected');
      toast.success('Video call connected');
    });

    peer.on('close', () => {
      setConnectionState('disconnected');
      toast.info('Video call ended');
    });

    peer.on('error', (error) => {
      console.error('Peer error:', error);
      setConnectionState('error');
      toast.error('Connection error occurred');
    });

    peerRef.current = peer;
    return peer;
  }, [socket, consultationId, isInitiator]);

  // Handle incoming signals
  useEffect(() => {
    if (!socket) return;

    const handleVideoOffer = async (data) => {
      try {
        setConnectionState('connecting');
        const stream = await getUserMedia();
        const peer = await initializePeer(stream);
        peer.signal(data.offer);
      } catch (error) {
        console.error('Error handling video offer:', error);
      }
    };

    const handleVideoAnswer = (data) => {
      if (peerRef.current) {
        peerRef.current.signal(data.answer);
      }
    };

    const handleIceCandidate = (data) => {
      if (peerRef.current) {
        peerRef.current.signal(data.candidate);
      }
    };

    const handleUserToggleAudio = (data) => {
      // Update UI to show remote user's audio status
      console.log(`User ${data.userId} audio: ${data.isEnabled}`);
    };

    const handleUserToggleVideo = (data) => {
      // Update UI to show remote user's video status
      console.log(`User ${data.userId} video: ${data.isEnabled}`);
    };

    socket.on('video-offer', handleVideoOffer);
    socket.on('video-answer', handleVideoAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-toggle-audio', handleUserToggleAudio);
    socket.on('user-toggle-video', handleUserToggleVideo);

    return () => {
      socket.off('video-offer', handleVideoOffer);
      socket.off('video-answer', handleVideoAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-toggle-audio', handleUserToggleAudio);
      socket.off('user-toggle-video', handleUserToggleVideo);
    };
  }, [socket, getUserMedia, initializePeer]);

  // Start call
  const startCall = useCallback(async () => {
    try {
      setConnectionState('connecting');
      const stream = await getUserMedia();
      await initializePeer(stream);
    } catch (error) {
      console.error('Error starting call:', error);
      setConnectionState('error');
    }
  }, [getUserMedia, initializePeer]);

  // End call
  const endCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }

    setRemoteStream(null);
    setConnectionState('disconnected');
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        if (socket) {
          socket.emit('toggle-audio', {
            consultationId,
            isEnabled: audioTrack.enabled
          });
        }
      }
    }
  }, [localStream, socket, consultationId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        if (socket) {
          socket.emit('toggle-video', {
            consultationId,
            isEnabled: videoTrack.enabled
          });
        }
      }
    }
  }, [localStream, socket, consultationId]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!peerRef.current) return;

    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        
        // Replace screen stream with camera stream
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerRef.current._pc.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
        
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        
        if (socket) {
          socket.emit('screen-share', {
            consultationId,
            isSharing: false
          });
        }
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Replace camera stream with screen stream
        const sender = peerRef.current._pc.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        
        setIsScreenSharing(true);
        
        // Handle screen share end
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
        if (socket) {
          socket.emit('screen-share', {
            consultationId,
            isSharing: true
          });
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
        toast.error('Failed to share screen');
      }
    }
  }, [isScreenSharing, localStream, socket, consultationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  };
};
