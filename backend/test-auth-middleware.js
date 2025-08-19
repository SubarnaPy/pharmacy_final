// Test the authorization middleware fix
import { authorize } from './src/middleware/authMiddleware.js';

console.log('🧪 Testing Authorization Middleware Fix...\n');

// Mock request object
const mockReq = {
  user: {
    id: '123',
    email: 'test@pharmacy.com',
    role: 'pharmacy'
  }
};

// Mock response object
const mockRes = {};

// Mock next function
const mockNext = () => {
  console.log('✅ Authorization passed - next() called');
};

// Test 1: Array format (current usage in routes)
console.log('1. Testing authorize([\'pharmacy\', \'admin\']) - Array format:');
try {
  const middleware1 = authorize(['pharmacy', 'admin']);
  middleware1(mockReq, mockRes, mockNext);
} catch (error) {
  console.log('❌ Test 1 failed:', error.message);
}

console.log('\n2. Testing authorize(\'pharmacy\', \'admin\') - Rest parameters format:');
try {
  const middleware2 = authorize('pharmacy', 'admin');
  middleware2(mockReq, mockRes, mockNext);
} catch (error) {
  console.log('❌ Test 2 failed:', error.message);
}

console.log('\n3. Testing authorize([\'patient\']) - Should fail:');
try {
  const middleware3 = authorize(['patient']);
  middleware3(mockReq, mockRes, mockNext);
} catch (error) {
  console.log('✅ Test 3 correctly failed:', error.message);
}

console.log('\n4. Testing authorize(\'patient\') - Should fail:');
try {
  const middleware4 = authorize('patient');
  middleware4(mockReq, mockRes, mockNext);
} catch (error) {
  console.log('✅ Test 4 correctly failed:', error.message);
}

console.log('\n✅ Authorization middleware tests completed!');
console.log('🚀 The pharmacy routes should now work correctly.');