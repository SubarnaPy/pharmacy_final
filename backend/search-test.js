const mongoose = require('mongoose');
const Medicine = require('./src/models/Medicine.js').default;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/healthcare')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ Connection failed:', err));

const testSearch = async () => {
  try {
    console.log('🔍 Testing different search methods for "Augmentin"...\n');
    
    // 1. Check total medicines
    const total = await Medicine.countDocuments();
    console.log(`📊 Total medicines in database: ${total}`);
    
    // 2. Find the specific medicine
    const augmentin = await Medicine.findOne({ name: /Augmentin/i });
    if (augmentin) {
      console.log(`✅ Found medicine: ${augmentin.name}`);
      console.log(`   Status: ${augmentin.status}`);
      console.log(`   Verification: ${augmentin.verificationStatus}`);
    } else {
      console.log('❌ No Augmentin found');
    }
    
    // 3. Test text search
    console.log('\n🔍 Testing $text search...');
    try {
      const textResults = await Medicine.find({
        $text: { $search: 'Augmentin' },
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      });
      console.log(`📝 Text search results: ${textResults.length}`);
    } catch (error) {
      console.log('❌ Text search failed:', error.message);
    }
    
    // 4. Test regex search
    console.log('\n🔍 Testing regex search...');
    const regexResults = await Medicine.find({
      $or: [
        { name: { $regex: 'Augmentin', $options: 'i' } },
        { brandName: { $regex: 'Augmentin', $options: 'i' } },
        { genericName: { $regex: 'Augmentin', $options: 'i' } }
      ],
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    });
    console.log(`📝 Regex search results: ${regexResults.length}`);
    regexResults.forEach((med, i) => {
      console.log(`   ${i+1}. ${med.name} - ${med.verificationStatus}`);
    });
    
    // 5. Test partial search
    console.log('\n🔍 Testing "625" search...');
    const partialResults = await Medicine.find({
      $or: [
        { name: { $regex: '625', $options: 'i' } },
        { brandName: { $regex: '625', $options: 'i' } }
      ],
      status: 'active'
    });
    console.log(`📝 "625" search results: ${partialResults.length}`);
    partialResults.forEach((med, i) => {
      console.log(`   ${i+1}. ${med.name} - ${med.verificationStatus}`);
    });
    
    // 6. Check indexes
    console.log('\n📋 Checking indexes...');
    const indexes = await Medicine.collection.indexes();
    console.log(`Total indexes: ${indexes.length}`);
    indexes.forEach((index, i) => {
      if (index.name.includes('text')) {
        console.log(`   ${i+1}. ${index.name}: ${JSON.stringify(index.key)}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  }
};

testSearch();