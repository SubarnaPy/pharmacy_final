import redisCacheService from './src/services/cache/RedisCacheService.js';
import logger from './src/services/LoggerService.js';

async function testBasicCaching() {
  console.log('🚀 Testing Basic Caching Functionality...\n');

  try {
    // Test 1: Test without Redis (fallback mode)
    console.log('1. Testing cache operations without Redis...');
    
    // Test basic cache operations
    const testKey = 'test:basic:1';
    const testData = { message: 'Hello Cache', timestamp: Date.now() };
    
    console.log('Setting cache data...');
    const setResult = await redisCacheService.set(testKey, testData, 300);
    console.log(`✅ Set result: ${setResult}`);
    
    console.log('Getting cache data...');
    const getData = await redisCacheService.get(testKey);
    console.log(`✅ Get result:`, getData);
    
    // Test user preferences
    console.log('\n2. Testing user preferences caching...');
    const userId = 'user123';
    const preferences = {
      email: { enabled: true },
      sms: { enabled: false }
    };
    
    const prefSetResult = await redisCacheService.setUserPreferences(userId, preferences);
    console.log(`✅ User preferences set: ${prefSetResult}`);
    
    const prefGetResult = await redisCacheService.getUserPreferences(userId);
    console.log(`✅ User preferences get:`, prefGetResult);
    
    // Test template caching
    console.log('\n3. Testing template caching...');
    const templateKey = 'email_welcome';
    const template = {
      subject: 'Welcome!',
      body: 'Hello {{name}}'
    };
    
    const templateSetResult = await redisCacheService.setTemplate(templateKey, template);
    console.log(`✅ Template set: ${templateSetResult}`);
    
    const templateGetResult = await redisCacheService.getTemplate(templateKey);
    console.log(`✅ Template get:`, templateGetResult);
    
    // Test health check
    console.log('\n4. Testing health check...');
    const health = await redisCacheService.healthCheck();
    console.log(`✅ Health check:`, health);
    
    console.log('\n🎉 Basic caching tests completed!');
    
  } catch (error) {
    console.error('❌ Error during basic caching tests:', error);
  }
}

// Run the test
testBasicCaching().catch(console.error);