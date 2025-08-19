# Video Calling and Chat Feature Documentation

## Overview
This document describes the video calling and chat functionality implemented for patient-doctor consultations in the healthcare platform.

## Features Implemented

### 1. Real-time Video Calling
- **WebRTC-based peer-to-peer video communication**
- High-quality video and audio streaming
- Screen sharing capability for medical reports/documents
- Picture-in-picture mode for local video preview

### 2. Real-time Chat
- **Socket.io-powered instant messaging**
- Message history persistence in MongoDB
- Typing indicators
- File attachment support (prepared for future implementation)
- Automatic chat history loading

### 3. Call Controls
- **Audio toggle** - Mute/unmute microphone
- **Video toggle** - Enable/disable camera
- **Screen share** - Share screen for documents/reports
- **End call** - Terminate consultation session
- **Chat toggle** - Show/hide chat sidebar

## Technical Implementation

### Backend Components

#### 1. Socket Server (`backend/src/socket/socketServer.js`)
- Handles WebSocket connections for real-time communication
- Manages consultation rooms
- JWT-based authentication
- Event handlers for:
  - Video signaling (offer/answer/ICE candidates)
  - Chat messages
  - User presence (join/leave)
  - Call controls

#### 2. Chat Message Model (`backend/src/models/ChatMessage.js`)
- Stores chat messages with metadata
- Supports different message types (text, image, file, prescription)
- Soft delete functionality
- Read receipts

#### 3. Consultation Controller Updates
- `startVideoConsultation` - Generates meeting links
- Authorization checks for consultation access
- Meeting link generation and storage

### Frontend Components

#### 1. VideoConsultationRoom Component
Main consultation interface with:
- Full-screen video display
- Chat sidebar
- Call controls toolbar
- Connection status indicators
- Call duration timer

#### 2. Custom Hooks

##### `useConsultationSocket`
- Manages Socket.io connection
- Handles chat messages
- Manages participant list
- Typing indicators

##### `useWebRTC`
- WebRTC peer connection management
- Media stream handling
- Screen sharing
- Audio/video toggle controls

## Setup Instructions

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
npm install socket.io simple-peer uuid
```

2. **Environment Variables**
Add to `.env`:
```
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-jwt-secret
```

3. **Start Server**
```bash
npm run dev
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install socket.io-client simple-peer
```

2. **Environment Variables**
Add to `.env`:
```
VITE_API_URL=http://localhost:5000
```

3. **Start Development Server**
```bash
npm run dev
```

## Usage Flow

### For Patients

1. **Book Consultation**
   - Select doctor and consultation type (video/chat)
   - Choose available time slot
   - Confirm booking

2. **Join Consultation**
   - Navigate to "My Consultations"
   - Click "Join Consultation" button
   - Allow camera/microphone permissions
   - Click "Start Call" to initiate video

3. **During Consultation**
   - Use chat for text communication
   - Toggle audio/video as needed
   - Share screen for documents
   - End call when consultation is complete

### For Doctors

1. **View Scheduled Consultations**
   - Access consultation dashboard
   - See upcoming appointments

2. **Join Consultation**
   - Click on consultation to join
   - System automatically connects when patient joins

3. **Consultation Tools**
   - Video call with patient
   - Chat for written instructions
   - Screen share for explaining reports
   - Take notes during consultation

## Security Features

1. **Authentication**
   - JWT token verification for socket connections
   - User authorization checks for consultation access

2. **Data Protection**
   - Encrypted WebRTC connections
   - Secure WebSocket connections
   - Chat message persistence with user validation

3. **Access Control**
   - Only consultation participants can join rooms
   - Automatic cleanup on disconnection
   - Session timeout handling

## Browser Requirements

### Minimum Requirements
- Chrome 74+
- Firefox 66+
- Safari 12.1+
- Edge 79+

### Required Permissions
- Camera access
- Microphone access
- Screen share (optional)

## API Endpoints

### Consultation Endpoints
- `POST /api/v1/consultations/:id/start` - Start video consultation
- `GET /api/v1/consultations/my-bookings` - Get patient consultations
- `PATCH /api/v1/consultations/:id/cancel` - Cancel consultation

### Socket Events

#### Client to Server
- `join-consultation` - Join consultation room
- `send-message` - Send chat message
- `video-offer` - Send WebRTC offer
- `video-answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate
- `toggle-audio` - Toggle audio state
- `toggle-video` - Toggle video state
- `end-consultation` - End consultation

#### Server to Client
- `consultation-joined` - Confirmation of room join
- `new-message` - New chat message
- `user-joined` - Participant joined
- `user-left` - Participant left
- `consultation-ended` - Consultation terminated

## Testing

### Manual Testing Steps

1. **Test Video Call**
   - Create two user accounts (patient and doctor)
   - Book a consultation
   - Join from both accounts
   - Test video/audio quality
   - Test screen sharing

2. **Test Chat**
   - Send messages during call
   - Verify message history
   - Test typing indicators

3. **Test Controls**
   - Toggle audio/video
   - End call functionality
   - Reconnection handling

## Known Limitations

1. **TURN Server**: Currently using public STUN/TURN servers. For production, use dedicated TURN servers.
2. **Recording**: Video recording not implemented yet
3. **Group Calls**: Currently supports only 1-to-1 calls
4. **Mobile Optimization**: Desktop-first design, mobile UI needs enhancement

## Future Enhancements

1. **Advanced Features**
   - Video recording and playback
   - Virtual backgrounds
   - Noise cancellation
   - Prescription generation during call
   - Integration with medical devices

2. **UI/UX Improvements**
   - Mobile-responsive design
   - Waiting room functionality
   - Pre-call device testing
   - Connection quality indicators

3. **Analytics**
   - Call quality metrics
   - Consultation duration tracking
   - Patient satisfaction ratings
   - Technical issue reporting

## Troubleshooting

### Common Issues

1. **Camera/Microphone Not Working**
   - Check browser permissions
   - Ensure devices are not used by other applications
   - Try refreshing the page

2. **Connection Failed**
   - Check internet connectivity
   - Verify firewall settings
   - Try using a different browser

3. **Poor Video Quality**
   - Check internet bandwidth
   - Close unnecessary applications
   - Reduce video resolution in settings

## Support

For technical support or bug reports, please contact the development team or create an issue in the project repository.
