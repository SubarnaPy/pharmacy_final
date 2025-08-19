class ConsultationSocketService {
  constructor(io) {
    this.io = io;
    this.consultationNamespace = io.of('/consultation');
    this.activeConsultations = new Map();
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.consultationNamespace.on('connection', (socket) => {
      console.log(`🩺 Consultation client connected: ${socket.id}`);

      socket.on('join-consultation', (consultationId) => {
        socket.join(consultationId);
        console.log(`👨‍⚕️ User joined consultation: ${consultationId}`);
      });

      socket.on('leave-consultation', (consultationId) => {
        socket.leave(consultationId);
        console.log(`👋 User left consultation: ${consultationId}`);
      });

      socket.on('webrtc-offer', (data) => {
        socket.to(data.consultationId).emit('webrtc-offer', data);
      });

      socket.on('webrtc-answer', (data) => {
        socket.to(data.consultationId).emit('webrtc-answer', data);
      });

      socket.on('webrtc-ice-candidate', (data) => {
        socket.to(data.consultationId).emit('webrtc-ice-candidate', data);
      });

      socket.on('consultation-message', (data) => {
        socket.to(data.consultationId).emit('consultation-message', data);
      });

      socket.on('disconnect', () => {
        console.log(`🩺 Consultation client disconnected: ${socket.id}`);
      });
    });
  }

  notifyConsultationUpdate(consultationId, update) {
    this.consultationNamespace.to(consultationId).emit('consultation-update', update);
  }

  getActiveConsultations() {
    return this.activeConsultations.size;
  }
}

export default ConsultationSocketService;