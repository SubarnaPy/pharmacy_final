const mongoose = require('mongoose');
const Medicine = require('./src/models/Medicine.js').default;

async function checkIndexes() {
  try {
    await mongoose.connect('mongodb://localhost:27017/pharmacy-management');
    console.log('✅ Connected to MongoDB');
    
    // Check indexes
    const indexes = await Medicine.collection.getIndexes();
    console.log('📊 Current indexes:', Object.keys(indexes));
    
    // Check if text index exists
    const hasTextIndex = Object.values(indexes).some(index => 
      typeof index === 'object' && index.name && index.name.includes('text')
    );
    console.log('🔍 Text index exists:', hasTextIndex);
    
    // Test search directly with text index
    console.log('\n🔍 Testing text search...');
    const textResults = await Medicine.find({
      $text: { $search: 'Augmentin 625 Duo Tablet' },
      status: 'active'
    });
    console.log('Text search results:', textResults.length);
    
    // Test without text search - simple regex
    console.log('\n🔍 Testing regex search...');
    const regexResults = await Medicine.find({
      name: /Augmentin/i,
      status: 'active'
    });
    console.log('Regex search results:', regexResults.length);
    
    if (regexResults.length > 0) {
      const med = regexResults[0];
      console.log('✅ Found medicine:', med.name);
      console.log('   Status:', med.status);
      console.log('   Verification:', med.verificationStatus);
      console.log('   SearchTags:', med.searchTags);
    }
    
    // Test with both statuses
    console.log('\n🔍 Testing with pending status...');
    const pendingResults = await Medicine.find({
      name: /Augmentin/i,
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    });
    console.log('Pending-inclusive results:', pendingResults.length);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkIndexes();