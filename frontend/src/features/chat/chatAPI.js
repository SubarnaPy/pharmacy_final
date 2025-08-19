import io from 'socket.io-client';

const SOCKET_URL ='http://localhost:5000';
const socket = io(SOCKET_URL + '/communication', {
  auth: () => ({ token: localStorage.getItem('token') }),
  transports: ['polling', 'websocket'],
  autoConnect: false
});

export default socket;
