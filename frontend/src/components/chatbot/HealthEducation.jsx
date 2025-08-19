import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import {
  AcademicCapIcon,
  BookOpenIcon,
  LightBulbIcon,
  HeartIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  ShareIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';

const HealthEducation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [educationContent, setEducationContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTopics, setSavedTopics] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  // Health education categories
  const categories = [
    {
      id: 'chronic-diseases',
      name: 'Chronic Diseases',
      icon: '🫀',
      description: 'Diabetes, hypertension, heart disease',
      topics: ['Diabetes Management', 'Heart Disease Prevention', 'Hypertension Control', 'Arthritis Care']
    },
    {
      id: 'mental-health',
      name: 'Mental Health',
      icon: '🧠',
      description: 'Depression, anxiety, stress management',
      topics: ['Stress Management', 'Anxiety Disorders', 'Depression Understanding', 'Sleep Hygiene']
    },
    {
      id: 'nutrition',
      name: 'Nutrition & Diet',
      icon: '🥗',
      description: 'Healthy eating, weight management',
      topics: ['Balanced Diet', 'Weight Management', 'Diabetes Diet', 'Heart-Healthy Eating']
    },
    {
      id: 'exercise',
      name: 'Exercise & Fitness',
      icon: '🏃',
      description: 'Physical activity, exercise routines',
      topics: ['Cardio Exercises', 'Strength Training', 'Yoga Benefits', 'Exercise for Seniors']
    },
    {
      id: 'preventive-care',
      name: 'Preventive Care',
      icon: '🛡️',
      description: 'Screenings, vaccinations, check-ups',
      topics: ['Health Screenings', 'Vaccination Schedule', 'Cancer Prevention', 'Oral Health']
    },
    {
      id: 'womens-health',
      name: "Women's Health",
      icon: '👩',
      description: 'Reproductive health, pregnancy',
      topics: ['Pregnancy Care', 'Menstrual Health', 'Menopause', 'Breast Health']
    },
    {
      id: 'mens-health',
      name: "Men's Health",
      icon: '👨',
      description: 'Prostate health, testosterone',
      topics: ['Prostate Health', 'Heart Disease in Men', 'Mental Health', 'Fitness Guidelines']
    },
    {
      id: 'pediatric',
      name: 'Child Health',
      icon: '👶',
      description: 'Child development, pediatric care',
      topics: ['Child Development', 'Vaccination for Kids', 'Nutrition for Children', 'Child Safety']
    },
    {
      id: 'senior-health',
      name: 'Senior Health',
      icon: '👴',
      description: 'Aging, elderly care',
      topics: ['Healthy Aging', 'Fall Prevention', 'Memory Health', 'Senior Nutrition']
    },
    {
      id: 'infectious-diseases',
      name: 'Infectious Diseases',
      icon: '🦠',
      description: 'Infections, immunity, prevention',
      topics: ['COVID-19 Info', 'Flu Prevention', 'Food Safety', 'Travel Health']
    }
  ];

  // Popular health topics
  const popularTopics = [
    'COVID-19 Prevention',
    'Diabetes Management',
    'Heart Disease',
    'Mental Health',
    'Weight Loss',
    'High Blood Pressure',
    'Healthy Diet',
    'Exercise Benefits',
    'Sleep Disorders',
    'Stress Management',
    'Vaccination',
    'Cancer Prevention'
  ];

  useEffect(() => {
    // Load saved topics from localStorage
    const saved = localStorage.getItem('savedHealthTopics');
    if (saved) {
      setSavedTopics(JSON.parse(saved));
    }

    // Load recent searches
    const recent = localStorage.getItem('recentHealthSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  }, []);

  const searchHealthTopic = async (topic = searchQuery) => {
    if (!topic.trim()) {
      alert('Please enter a health topic');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/chatbot/health-education/${encodeURIComponent(topic)}`);

      if (response.data.success) {
        setEducationContent(response.data.education);
        
        // Add to recent searches
        const newRecentSearches = [topic, ...recentSearches.filter(s => s !== topic)].slice(0, 10);
        setRecentSearches(newRecentSearches);
        localStorage.setItem('recentHealthSearches', JSON.stringify(newRecentSearches));
      }
    } catch (error) {
      console.error('Error fetching health education:', error);
      alert('Failed to fetch health information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickSearch = (topic) => {
    setSearchQuery(topic);
    searchHealthTopic(topic);
  };

  const saveTopicToFavorites = (topic) => {
    const newSavedTopics = [...savedTopics, {
      topic: topic,
      savedAt: new Date().toISOString(),
      content: educationContent
    }];
    setSavedTopics(newSavedTopics);
    localStorage.setItem('savedHealthTopics', JSON.stringify(newSavedTopics));
  };

  const shareTopic = (topic) => {
    if (navigator.share) {
      navigator.share({
        title: `Health Information: ${topic}`,
        text: `Learn about ${topic} - Health Education`,
        url: window.location.href
      });
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(`Health Information: ${topic} - ${window.location.href}`);
      alert('Link copied to clipboard!');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchHealthTopic();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AcademicCapIcon className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Health Education Center</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Get evidence-based health information on any medical topic. Learn about conditions, 
          treatments, prevention, and healthy living from AI-powered educational content.
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Health Topics</h2>
        
        <div className="flex space-x-3 mb-6">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search for any health topic... (e.g., diabetes, heart disease, nutrition)"
            />
          </div>
          <button
            onClick={() => searchHealthTopic()}
            disabled={!searchQuery.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Popular Topics */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Topics</h3>
          <div className="flex flex-wrap gap-2">
            {popularTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => quickSearch(topic)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-blue-100 hover:text-blue-700 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <ClockIcon className="w-4 h-4 mr-1" />
              Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => quickSearch(search)}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedCategory(category.id)}
            >
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">{category.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-600">{category.description}</p>
                </div>
              </div>
              <div className="space-y-1">
                {category.topics.slice(0, 3).map((topic, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      quickSearch(topic);
                    }}
                    className="block text-left text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    • {topic}
                  </button>
                ))}
                {category.topics.length > 3 && (
                  <div className="text-xs text-gray-500">+{category.topics.length - 3} more topics</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education Content */}
      {educationContent && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <BookOpenIcon className="w-7 h-7 mr-3 text-blue-600" />
              {educationContent.topic}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => saveTopicToFavorites(educationContent.topic)}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                title="Save to favorites"
              >
                <BookmarkIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => shareTopic(educationContent.topic)}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                title="Share"
              >
                <ShareIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Overview */}
          {educationContent.overview && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
              <div className="prose max-w-none text-gray-700">
                <p>{educationContent.overview}</p>
              </div>
            </div>
          )}

          {/* Key Points */}
          {educationContent.key_points && educationContent.key_points.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <LightBulbIcon className="w-5 h-5 mr-2 text-yellow-600" />
                Key Points
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {educationContent.key_points.map((point, index) => (
                  <div key={index} className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <CheckCircleIcon className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-900">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Prevention */}
            {educationContent.prevention && educationContent.prevention.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <HeartIcon className="w-5 h-5 mr-2 text-green-600" />
                  Prevention
                </h3>
                <div className="space-y-3">
                  {educationContent.prevention.map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Management */}
            {educationContent.management && educationContent.management.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Management
                </h3>
                <div className="space-y-3">
                  {educationContent.management.map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lifestyle Factors */}
          {educationContent.lifestyle_factors && educationContent.lifestyle_factors.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <StarIcon className="w-5 h-5 mr-2 text-purple-600" />
                Lifestyle Factors
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {educationContent.lifestyle_factors.map((factor, index) => (
                  <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-sm text-purple-900">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Myths vs Facts */}
          {educationContent.myths_vs_facts && educationContent.myths_vs_facts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Myths vs Facts</h3>
              <div className="space-y-4">
                {educationContent.myths_vs_facts.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          Myth
                        </h4>
                        <p className="text-sm text-red-700">{item.myth}</p>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                          Fact
                        </h4>
                        <p className="text-sm text-green-700">{item.fact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* When to Seek Help */}
          {educationContent.when_to_seek_help && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3 flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                When to Seek Medical Help
              </h3>
              <p className="text-sm text-yellow-700">{educationContent.when_to_seek_help}</p>
            </div>
          )}

          {/* Additional Resources */}
          {educationContent.additional_resources && educationContent.additional_resources.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h3>
              <div className="space-y-2">
                {educationContent.additional_resources.map((resource, index) => (
                  <div key={index} className="flex items-center text-blue-600 hover:text-blue-700">
                    <BookOpenIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm">{resource}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Takeaway Message */}
          {educationContent.takeaway_message && (
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Key Takeaway</h3>
              <p className="text-sm text-blue-700">{educationContent.takeaway_message}</p>
            </div>
          )}

          {/* Related Topics */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Explore Related Topics</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Heart Disease Prevention',
                'Healthy Diet Tips',
                'Exercise Guidelines',
                'Stress Management',
                'Sleep Hygiene',
                'Preventive Care'
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => quickSearch(topic)}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-blue-100 hover:text-blue-700 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Topics */}
      {savedTopics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <BookmarkIcon className="w-6 h-6 mr-2 text-green-600" />
            Saved Topics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedTopics.slice(0, 6).map((saved, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-2">{saved.topic}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Saved on {new Date(saved.savedAt).toLocaleDateString()}
                </p>
                <button
                  onClick={() => quickSearch(saved.topic)}
                  className="text-sm text-green-600 hover:text-green-700 transition-colors"
                >
                  Read Again →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <strong>Educational Purpose Only:</strong> This content is for educational purposes and should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns and before making health decisions.
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthEducation;
