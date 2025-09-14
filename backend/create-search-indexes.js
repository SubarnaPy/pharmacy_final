const mongoose = require('mongoose');
const Medicine = require('./src/models/Medicine.js').default;

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/healthcare');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Create search indexes
const createSearchIndexes = async () => {
  try {
    console.log('🔍 Creating search indexes for Medicine collection...');
    
    // Drop existing text indexes to recreate them
    try {
      await Medicine.collection.dropIndex('name_text_brandName_text_genericName_text_alternativeNames_text_searchTags_text_aiSearchOptimization.semanticTags_text');
      console.log('🗑️ Dropped existing text index');
    } catch (error) {
      console.log('ℹ️ No existing text index to drop');
    }
    
    // Create comprehensive text index
    await Medicine.collection.createIndex({
      name: 'text',
      brandName: 'text',
      genericName: 'text',
      'alternativeNames': 'text',
      'searchTags': 'text',
      'aiSearchOptimization.semanticTags': 'text',
      'composition.activeIngredient': 'text',
      'manufacturer.name': 'text',
      'therapeutic.therapeuticClass': 'text'
    }, {
      weights: {
        name: 10,
        brandName: 10,
        genericName: 8,
        'alternativeNames': 6,
        'composition.activeIngredient': 5,
        'searchTags': 4,
        'therapeutic.therapeuticClass': 3,
        'manufacturer.name': 2,
        'aiSearchOptimization.semanticTags': 1
      },
      name: 'medicine_search_index'
    });
    
    console.log('✅ Created comprehensive text search index');
    
    // Create other useful indexes
    const indexes = [
      { 'status': 1, 'verificationStatus': 1 },
      { 'composition.activeIngredient': 1 },
      { 'dosageForm.form': 1 },
      { 'manufacturer.name': 1 },
      { 'therapeutic.therapeuticClass': 1 },
      { 'popularityScore': -1 },
      { 'isPopular': 1 },
      { 'barcodes.value': 1 }
    ];
    
    for (const index of indexes) {
      try {
        await Medicine.collection.createIndex(index);
        console.log(`✅ Created index:`, Object.keys(index)[0]);
      } catch (error) {
        if (error.code === 11000 || error.code === 85) {
          console.log(`ℹ️ Index already exists:`, Object.keys(index)[0]);
        } else {
          console.error(`❌ Failed to create index:`, Object.keys(index)[0], error.message);
        }
      }
    }
    
    // List all indexes
    const allIndexes = await Medicine.collection.indexes();
    console.log('\n📋 All indexes on Medicine collection:');
    allIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Test search functionality
const testSearch = async () => {
  try {
    console.log('\n🔧 Testing search functionality...');
    
    // Test text search
    console.log('\n1️⃣ Testing MongoDB text search...');
    try {
      const textResults = await Medicine.find({
        $text: { $search: 'Augmentin' },
        status: 'active',
        verificationStatus: { $in: ['verified', 'pending'] }
      }).limit(5);
      
      console.log(`   📝 Text search results: ${textResults.length} found`);
      textResults.forEach((medicine, index) => {
        console.log(`     ${index + 1}. ${medicine.name} - ${medicine.verificationStatus}`);
      });
    } catch (error) {
      console.error('   ❌ Text search failed:', error.message);
    }
    
    // Test regex search as fallback
    console.log('\n2️⃣ Testing regex search...');
    const regexResults = await Medicine.find({
      $or: [
        { name: { $regex: 'Augmentin', $options: 'i' } },
        { brandName: { $regex: 'Augmentin', $options: 'i' } },
        { genericName: { $regex: 'Augmentin', $options: 'i' } }
      ],
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    }).limit(5);
    
    console.log(`   📝 Regex search results: ${regexResults.length} found`);
    regexResults.forEach((medicine, index) => {
      console.log(`     ${index + 1}. ${medicine.name} - ${medicine.verificationStatus}`);
    });
    
    // Test partial search
    console.log('\n3️⃣ Testing partial search...');
    const partialResults = await Medicine.find({
      $or: [
        { name: { $regex: '625', $options: 'i' } },
        { brandName: { $regex: '625', $options: 'i' } }
      ],
      status: 'active',
      verificationStatus: { $in: ['verified', 'pending'] }
    }).limit(5);
    
    console.log(`   📝 Partial search results: ${partialResults.length} found`);
    partialResults.forEach((medicine, index) => {
      console.log(`     ${index + 1}. ${medicine.name} - ${medicine.verificationStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Search test failed:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createSearchIndexes();
  await testSearch();
  
  // Check medicine count
  const totalCount = await Medicine.countDocuments();
  const verifiedCount = await Medicine.countDocuments({ verificationStatus: 'verified' });
  
  console.log(`\n📊 Database status:
  - Total medicines: ${totalCount}
  - Verified medicines: ${verifiedCount}`);
  
  if (totalCount > 0) {
    console.log('\n📝 Sample medicines:');
    const samples = await Medicine.find().limit(3).select('name brandName verificationStatus status');
    samples.forEach((medicine, index) => {
      console.log(`  ${index + 1}. ${medicine.name} - Status: ${medicine.status}, Verification: ${medicine.verificationStatus}`);
    });
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Script completed successfully');
};

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});