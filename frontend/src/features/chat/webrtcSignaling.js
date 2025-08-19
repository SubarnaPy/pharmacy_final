import socket from './chatAPI';

const peerConnections = {};
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export const joinRoom = async (roomId, localStream, onRemoteStream) => {
  socket.emit('join-room', { roomId });

  socket.on('user-joined', ({ userId }) => {
    const pc = new RTCPeerConnection(config);
    peerConnections[userId] = pc;

    // Add local tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Create offer
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      socket.emit('signal', { to: userId, description: offer });
    });

    // Handle remote track
    pc.ontrack = (event) => {
      onRemoteStream(event.streams[0]);
    };

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit('signal', { to: userId, candidate });
      }
    };
  });

  socket.on('signal', async ({ from, description, candidate }) => {
    let pc = peerConnections[from];
    if (!pc) {
      pc = new RTCPeerConnection(config);
      peerConnections[from] = pc;
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      pc.ontrack = (event) => onRemoteStream(event.streams[0]);
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) socket.emit('signal', { to: from, candidate });
      };
    }
    if (description) {
      await pc.setRemoteDescription(description);
      if (description.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('signal', { to: from, description: answer });
      }
    }
    if (candidate) {
      await pc.addIceCandidate(candidate);
    }
  });
};

export const leaveRoom = (roomId) => {
  socket.emit('leave-room', { roomId });
  Object.values(peerConnections).forEach(pc => pc.close());
  for (let key in peerConnections) delete peerConnections[key];
};
