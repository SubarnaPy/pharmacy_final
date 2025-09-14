import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  BookmarkIcon,
  PlayIcon,
  PauseIcon,
  TrophyIcon,
  FireIcon,
  BoltIcon,
  EyeIcon,
  CubeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  ArrowPathIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  SparklesIcon,
  BeakerIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  GiftIcon,
  MapIcon,
  PuzzlePieceIcon,
  WrenchScrewdriverIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const HealthEducation = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [educationContent, setEducationContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTopics, setSavedTopics] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  
  // Advanced Interactive Learning State
  const [interactiveLearning, setInteractiveLearning] = useState({
    enabled: true,
    currentMode: 'guided', // guided, self-paced, interactive, vr
    completedModules: [],
    currentProgress: 0,
    learningPath: [],
    adaptiveDifficulty: 'intermediate',
    preferredLearningStyle: 'visual' // visual, auditory, kinesthetic, reading
  });
  
  // AR/VR Integration State
  const [vrIntegration, setVrIntegration] = useState({
    enabled: false,
    vrMode: 'ar', // ar, vr, mixed
    available3DModels: [],
    currentVisualization: null,
    immersiveExperiences: [],
    deviceCompatibility: { ar: false, vr: false },
    spatialLearning: { enabled: false, tracking: null }
  });
  
  // Personalized Learning Paths
  const [personalizedLearning, setPersonalizedLearning] = useState({
    enabled: true,
    userProfile: { interests: [], medicalHistory: [], learningGoals: [] },
    customizedPath: [],
    adaptiveContent: [],
    progressTracking: { completed: 0, inProgress: 0, recommended: 0 },
    aiRecommendations: [],
    learningAnalytics: { timeSpent: 0, accuracy: 0, engagement: 0 }
  });
  
  // Gamification System
  const [gamification, setGamification] = useState({
    enabled: true,
    userLevel: 1,
    experiencePoints: 0,
    badges: [],
    achievements: [],
    streaks: { current: 0, longest: 0 },
    challenges: { active: [], completed: [], available: [] },
    leaderboard: { position: 0, friends: [], global: [] },
    rewards: { unlocked: [], pending: [] }
  });
  
  // Interactive Content Features
  const [interactiveFeatures, setInteractiveFeatures] = useState({
    quizzes: { enabled: true, currentQuiz: null, results: [] },
    simulations: { enabled: true, activeSimulation: null, scenarios: [] },
    animations: { enabled: true, playingAnimation: null, library: [] },
    voiceNarration: { enabled: true, isPlaying: false, currentNarration: null },
    realTimeQA: { enabled: true, chatBot: null, activeSession: false },
    collaborativeLearning: { enabled: true, groupSessions: [], peers: [] }
  });
  
  // Advanced Analytics & AI
  const [learningAnalytics, setLearningAnalytics] = useState({
    enabled: true,
    behaviorTracking: { clickPatterns: [], timeSpent: {}, engagementMetrics: {} },
    comprehensionAssessment: { realTime: true, adaptiveQuestions: [], accuracy: 0 },
    personalizedRecommendations: [],
    learningEfficiencyMetrics: { retention: 0, speed: 0, quality: 0 },
    predictiveInsights: { nextBestAction: null, strugglingAreas: [], strengths: [] }
  });
  
  // Refs for advanced features
  const arViewerRef = useRef(null);
  const vrCanvasRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const interactionTrackingRef = useRef(null);

  // Enhanced Health education categories with advanced features
  const categories = [
    {
      id: 'chronic-diseases',
      name: 'Chronic Diseases',
      icon: '🫀',
      description: 'Diabetes, hypertension, heart disease',
      topics: ['Diabetes Management', 'Heart Disease Prevention', 'Hypertension Control', 'Arthritis Care'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'advanced',
        difficultyRange: ['beginner', 'intermediate', 'advanced']
      },
      learningPaths: {
        beginner: ['Understanding Basics', 'Symptoms Recognition', 'Lifestyle Changes'],
        intermediate: ['Management Strategies', 'Medication Adherence', 'Monitoring'],
        advanced: ['Complications Prevention', 'Advanced Care', 'Research Updates']
      }
    },
    {
      id: 'mental-health',
      name: 'Mental Health',
      icon: '🧠',
      description: 'Depression, anxiety, stress management',
      topics: ['Stress Management', 'Anxiety Disorders', 'Depression Understanding', 'Sleep Hygiene'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'high',
        difficultyRange: ['beginner', 'intermediate', 'advanced']
      },
      learningPaths: {
        beginner: ['Mental Health Basics', 'Recognition Signs', 'Self-Care'],
        intermediate: ['Coping Strategies', 'Professional Help', 'Support Systems'],
        advanced: ['Advanced Therapies', 'Research', 'Advocacy']
      }
    },
    {
      id: 'nutrition',
      name: 'Nutrition & Diet',
      icon: '🥗',
      description: 'Healthy eating, weight management',
      topics: ['Balanced Diet', 'Weight Management', 'Diabetes Diet', 'Heart-Healthy Eating'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: false,
        hasSimulations: true,
        gamificationLevel: 'medium',
        difficultyRange: ['beginner', 'intermediate']
      },
      learningPaths: {
        beginner: ['Nutrition Basics', 'Food Groups', 'Meal Planning'],
        intermediate: ['Special Diets', 'Nutrition Science', 'Advanced Planning']
      }
    },
    {
      id: 'exercise',
      name: 'Exercise & Fitness',
      icon: '🏃',
      description: 'Physical activity, exercise routines',
      topics: ['Cardio Exercises', 'Strength Training', 'Yoga Benefits', 'Exercise for Seniors'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'high',
        difficultyRange: ['beginner', 'intermediate', 'advanced']
      },
      learningPaths: {
        beginner: ['Exercise Basics', 'Safety First', 'Getting Started'],
        intermediate: ['Workout Plans', 'Equipment Use', 'Progress Tracking'],
        advanced: ['Athletic Training', 'Performance Optimization', 'Injury Prevention']
      }
    },
    {
      id: 'preventive-care',
      name: 'Preventive Care',
      icon: '🛡️',
      description: 'Screenings, vaccinations, check-ups',
      topics: ['Health Screenings', 'Vaccination Schedule', 'Cancer Prevention', 'Oral Health'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: false,
        hasSimulations: true,
        gamificationLevel: 'medium',
        difficultyRange: ['beginner', 'intermediate']
      },
      learningPaths: {
        beginner: ['Prevention Basics', 'Health Screenings', 'Lifestyle Factors'],
        intermediate: ['Advanced Screenings', 'Risk Assessment', 'Personalized Care']
      }
    },
    {
      id: 'womens-health',
      name: "Women's Health",
      icon: '👩',
      description: 'Reproductive health, pregnancy',
      topics: ['Pregnancy Care', 'Menstrual Health', 'Menopause', 'Breast Health'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'advanced',
        difficultyRange: ['beginner', 'intermediate', 'advanced']
      },
      learningPaths: {
        beginner: ['Reproductive Health Basics', 'Menstrual Cycle', 'General Wellness'],
        intermediate: ['Pregnancy Planning', 'Hormonal Health', 'Preventive Care'],
        advanced: ['Advanced Reproductive Health', 'Specialized Care', 'Research Updates']
      }
    },
    {
      id: 'mens-health',
      name: "Men's Health",
      icon: '👨',
      description: 'Prostate health, testosterone',
      topics: ['Prostate Health', 'Heart Disease in Men', 'Mental Health', 'Fitness Guidelines'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'advanced',
        difficultyRange: ['beginner', 'intermediate', 'advanced']
      },
      learningPaths: {
        beginner: ['Men\'s Health Basics', 'Common Issues', 'Prevention'],
        intermediate: ['Specialized Care', 'Fitness & Nutrition', 'Mental Wellness'],
        advanced: ['Advanced Health Management', 'Performance Optimization', 'Research']
      }
    },
    {
      id: 'pediatric',
      name: 'Child Health',
      icon: '👶',
      description: 'Child development, pediatric care',
      topics: ['Child Development', 'Vaccination for Kids', 'Nutrition for Children', 'Child Safety'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: false,
        hasSimulations: true,
        gamificationLevel: 'high',
        difficultyRange: ['beginner', 'intermediate']
      },
      learningPaths: {
        beginner: ['Child Development Basics', 'Safety First', 'Nutrition Fundamentals'],
        intermediate: ['Advanced Care', 'Behavioral Health', 'Educational Support']
      }
    },
    {
      id: 'senior-health',
      name: 'Senior Health',
      icon: '👴',
      description: 'Aging, elderly care',
      topics: ['Healthy Aging', 'Fall Prevention', 'Memory Health', 'Senior Nutrition'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'medium',
        difficultyRange: ['beginner', 'intermediate']
      },
      learningPaths: {
        beginner: ['Aging Basics', 'Safety at Home', 'Staying Active'],
        intermediate: ['Advanced Care Planning', 'Complex Health Management', 'Quality of Life']
      }
    },
    {
      id: 'infectious-diseases',
      name: 'Infectious Diseases',
      icon: '🦠',
      description: 'Infections, immunity, prevention',
      topics: ['COVID-19 Info', 'Flu Prevention', 'Food Safety', 'Travel Health'],
      interactiveFeatures: {
        has3DModels: true,
        hasVRExperience: true,
        hasSimulations: true,
        gamificationLevel: 'advanced',
        difficultyRange: ['beginner', 'intermediate', 'advanced']
      },
      learningPaths: {
        beginner: ['Infection Basics', 'Prevention Methods', 'Hygiene Practices'],
        intermediate: ['Disease Mechanisms', 'Treatment Options', 'Public Health'],
        advanced: ['Epidemiology', 'Research Advances', 'Global Health']
      }
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
  
  // Advanced Learning Challenges & Gamification
  const learningChallenges = {
    daily: [
      { id: 'daily_read', name: 'Daily Reader', description: 'Read one health article today', xp: 10, type: 'reading' },
      { id: 'quiz_master', name: 'Quiz Master', description: 'Complete a health quiz', xp: 15, type: 'quiz' },
      { id: 'vr_explorer', name: 'VR Explorer', description: 'Try a VR health experience', xp: 25, type: 'vr' }
    ],
    weekly: [
      { id: 'knowledge_seeker', name: 'Knowledge Seeker', description: 'Learn about 5 different health topics', xp: 50, type: 'exploration' },
      { id: 'interactive_learner', name: 'Interactive Learner', description: 'Complete 3 interactive simulations', xp: 75, type: 'simulation' },
      { id: 'health_advocate', name: 'Health Advocate', description: 'Share 3 health articles with friends', xp: 40, type: 'social' }
    ],
    monthly: [
      { id: 'expert_level', name: 'Expert Level', description: 'Reach expert level in any health category', xp: 200, type: 'mastery' },
      { id: 'ar_pioneer', name: 'AR Pioneer', description: 'Complete all AR anatomy lessons', xp: 150, type: 'ar' },
      { id: 'community_leader', name: 'Community Leader', description: 'Help 10 community members', xp: 100, type: 'community' }
    ]
  };
  
  // Achievement Badges
  const achievementBadges = {
    learning: [
      { id: 'first_steps', name: 'First Steps', description: 'Complete your first lesson', icon: '🎆', rarity: 'common' },
      { id: 'quick_learner', name: 'Quick Learner', description: 'Complete 10 lessons in one day', icon: '⚡', rarity: 'rare' },
      { id: 'knowledge_master', name: 'Knowledge Master', description: 'Complete all topics in a category', icon: '🏆', rarity: 'epic' }
    ],
    social: [
      { id: 'helpful_friend', name: 'Helpful Friend', description: 'Share your first health tip', icon: '🤝', rarity: 'common' },
      { id: 'community_supporter', name: 'Community Supporter', description: 'Help 50 community members', icon: '🎆', rarity: 'rare' },
      { id: 'health_influencer', name: 'Health Influencer', description: 'Reach 1000 community points', icon: '🌟', rarity: 'legendary' }
    ],
    technical: [
      { id: 'vr_enthusiast', name: 'VR Enthusiast', description: 'Complete 5 VR experiences', icon: '🥽', rarity: 'rare' },
      { id: 'ar_expert', name: 'AR Expert', description: 'Master all AR anatomy models', icon: '🔭', rarity: 'epic' },
      { id: 'tech_pioneer', name: 'Tech Pioneer', description: 'Try all advanced features', icon: '🚀', rarity: 'legendary' }
    ]
  };
  
  // VR/AR Experiences
  const immersiveExperiences = {
    anatomy: [
      { id: 'heart_3d', name: '3D Heart Exploration', description: 'Explore the human heart in 3D', type: 'ar', difficulty: 'beginner' },
      { id: 'brain_journey', name: 'Brain Journey', description: 'Navigate through the human brain', type: 'vr', difficulty: 'intermediate' },
      { id: 'circulatory_system', name: 'Circulatory System', description: 'Follow blood flow through the body', type: 'ar', difficulty: 'advanced' }
    ],
    procedures: [
      { id: 'cpr_training', name: 'CPR Training', description: 'Learn CPR in virtual environment', type: 'vr', difficulty: 'intermediate' },
      { id: 'surgery_observation', name: 'Surgery Observation', description: 'Observe surgical procedures safely', type: 'vr', difficulty: 'advanced' },
      { id: 'first_aid', name: 'First Aid Training', description: 'Practice first aid scenarios', type: 'ar', difficulty: 'beginner' }
    ],
    education: [
      { id: 'disease_simulation', name: 'Disease Simulation', description: 'Understand how diseases affect the body', type: 'vr', difficulty: 'intermediate' },
      { id: 'medication_journey', name: 'Medication Journey', description: 'See how medications work in the body', type: 'ar', difficulty: 'beginner' },
      { id: 'lifestyle_impact', name: 'Lifestyle Impact', description: 'Visualize lifestyle effects on health', type: 'vr', difficulty: 'beginner' }
    ]
  };
  
  // Interactive Learning Modes
  const learningModes = {
    guided: { name: 'Guided Learning', description: 'Step-by-step instruction with AI guidance', icon: '🧭' },
    self_paced: { name: 'Self-Paced', description: 'Learn at your own speed', icon: '👤' },
    interactive: { name: 'Interactive', description: 'Hands-on learning with simulations', icon: '🎮' },
    collaborative: { name: 'Collaborative', description: 'Learn with peers in group sessions', icon: '👥' },
    immersive: { name: 'Immersive VR/AR', description: 'Virtual and augmented reality experiences', icon: '🥽' },
    adaptive: { name: 'AI Adaptive', description: 'AI customizes content to your learning style', icon: '🤖' }
  };

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
    
    // Initialize advanced features
    initializeAdvancedLearningFeatures();
    
    // Initialize AR/VR capabilities
    initializeImmersiveFeatures();
    
    // Initialize gamification system
    initializeGamificationSystem();
    
    // Initialize personalized learning
    initializePersonalizedLearning();
    
    // Load user progress and analytics
    loadUserLearningData();
    
  }, []);
  
  // Initialize advanced learning features
  const initializeAdvancedLearningFeatures = useCallback(async () => {
    try {
      // Set up interactive learning preferences
      setInteractiveLearning(prev => ({
        ...prev,
        enabled: true,
        currentMode: localStorage.getItem('preferredLearningMode') || 'guided'
      }));
      
      // Initialize interactive features
      setInteractiveFeatures(prev => ({
        ...prev,
        quizzes: { ...prev.quizzes, enabled: true },
        simulations: { ...prev.simulations, enabled: true },
        animations: { ...prev.animations, enabled: true },
        voiceNarration: { ...prev.voiceNarration, enabled: 'speechSynthesis' in window }
      }));
      
      console.log('✅ Advanced Learning Features initialized');
    } catch (error) {
      console.error('Failed to initialize advanced learning features:', error);
    }
  }, []);
  
  // Initialize AR/VR capabilities
  const initializeImmersiveFeatures = useCallback(async () => {
    try {
      // Check for WebXR support
      if ('xr' in navigator) {
        const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
        const isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
        
        setVrIntegration(prev => ({
          ...prev,
          enabled: isARSupported || isVRSupported,
          deviceCompatibility: { ar: isARSupported, vr: isVRSupported },
          available3DModels: immersiveExperiences.anatomy
        }));
        
        console.log('✅ AR/VR capabilities detected:', { ar: isARSupported, vr: isVRSupported });
      } else {
        // Fallback to basic 3D without full VR
        setVrIntegration(prev => ({
          ...prev,
          enabled: true,
          vrMode: 'ar',
          deviceCompatibility: { ar: true, vr: false }
        }));
        
        console.log('✅ Basic 3D visualization enabled (WebXR not available)');
      }
    } catch (error) {
      console.error('AR/VR initialization failed:', error);
      // Enable basic mode as fallback
      setVrIntegration(prev => ({ ...prev, enabled: true, vrMode: 'ar' }));
    }
  }, []);
  
  // Initialize gamification system
  const initializeGamificationSystem = useCallback(() => {
    try {
      // Load user gamification data
      const savedGamification = localStorage.getItem('healthEducationGamification');
      if (savedGamification) {
        const parsed = JSON.parse(savedGamification);
        setGamification(prev => ({ ...prev, ...parsed }));
      } else {
        // Initialize new user
        setGamification(prev => ({
          ...prev,
          enabled: true,
          userLevel: 1,
          experiencePoints: 0,
          challenges: {
            ...prev.challenges,
            available: [...learningChallenges.daily, ...learningChallenges.weekly.slice(0, 2)]
          }
        }));
      }
      
      console.log('✅ Gamification system initialized');
    } catch (error) {
      console.error('Gamification initialization failed:', error);
    }
  }, []);
  
  // Initialize personalized learning
  const initializePersonalizedLearning = useCallback(async () => {
    try {
      // Create user learning profile
      const userProfile = {
        interests: [],
        medicalHistory: [],
        learningGoals: [],
        preferredStyle: 'visual'
      };
      
      // Generate AI recommendations based on profile
      const recommendations = await generatePersonalizedRecommendations(userProfile);
      
      setPersonalizedLearning(prev => ({
        ...prev,
        enabled: true,
        userProfile,
        aiRecommendations: recommendations,
        customizedPath: generateLearningPath(userProfile)
      }));
      
      console.log('✅ Personalized learning initialized');
    } catch (error) {
      console.error('Personalized learning initialization failed:', error);
    }
  }, []);
  
  // Load user learning data
  const loadUserLearningData = async () => {
    try {
      // Simulate loading user analytics
      const mockAnalytics = {
        timeSpent: 120, // minutes
        accuracy: 85, // percentage
        engagement: 78, // percentage
        completedModules: 15,
        currentStreak: 3
      };
      
      setLearningAnalytics(prev => ({
        ...prev,
        learningEfficiencyMetrics: {
          retention: mockAnalytics.accuracy,
          speed: 75,
          quality: mockAnalytics.engagement
        }
      }));
      
      // Update gamification based on analytics
      setGamification(prev => ({
        ...prev,
        streaks: { ...prev.streaks, current: mockAnalytics.currentStreak }
      }));
      
    } catch (error) {
      console.error('Failed to load user learning data:', error);
    }
  };
  
  // Generate personalized recommendations
  const generatePersonalizedRecommendations = async (userProfile) => {
    try {
      // AI-powered recommendation logic
      const recommendations = [
        {
          topic: 'Heart Health Basics',
          reason: 'Perfect starting point for cardiovascular health',
          difficulty: 'beginner',
          estimatedTime: '15 minutes',
          hasVR: true
        },
        {
          topic: 'Stress Management Techniques',
          reason: 'Popular among users with similar interests',
          difficulty: 'beginner',
          estimatedTime: '20 minutes',
          hasInteractive: true
        },
        {
          topic: 'Nutrition Science',
          reason: 'Builds on your completed topics',
          difficulty: 'intermediate',
          estimatedTime: '25 minutes',
          hasSimulation: true
        }
      ];
      
      return recommendations;
    } catch (error) {
      return [];
    }
  };
  
  // Generate custom learning path
  const generateLearningPath = (userProfile) => {
    const basicPath = [
      { id: 'intro', name: 'Health Education Introduction', completed: false },
      { id: 'basics', name: 'Health Fundamentals', completed: false },
      { id: 'prevention', name: 'Prevention Strategies', completed: false },
      { id: 'advanced', name: 'Advanced Topics', completed: false }
    ];
    
    return basicPath;
  };
  
  // Start VR/AR experience
  const startImmersiveExperience = async (experienceId) => {
    try {
      const experience = Object.values(immersiveExperiences)
        .flat()
        .find(exp => exp.id === experienceId);
      
      if (!experience) {
        alert('Experience not found');
        return;
      }
      
      if (experience.type === 'vr' && !vrIntegration.deviceCompatibility.vr) {
        alert('VR not supported on this device. Try AR version instead.');
        return;
      }
      
      // Set current visualization
      setVrIntegration(prev => ({
        ...prev,
        currentVisualization: experience
      }));
      
      // Award XP for trying VR/AR
      awardExperiencePoints(25, 'vr_exploration');
      
      console.log('Starting immersive experience:', experience.name);
      
      // In a real implementation, this would launch the VR/AR session
      alert(`Starting ${experience.name} - ${experience.description}`);
      
    } catch (error) {
      console.error('Failed to start immersive experience:', error);
      alert('Failed to start experience. Please try again.');
    }
  };
  
  // Award experience points
  const awardExperiencePoints = (points, reason) => {
    setGamification(prev => {
      const newXP = prev.experiencePoints + points;
      const newLevel = Math.floor(newXP / 100) + 1;
      
      // Check for level up
      if (newLevel > prev.userLevel) {
        // Award level up bonus
        setTimeout(() => {
          alert(`🎉 Level Up! You've reached level ${newLevel}!`);
        }, 500);
      }
      
      // Save to localStorage
      const updatedGamification = {
        ...prev,
        experiencePoints: newXP,
        userLevel: newLevel
      };
      
      localStorage.setItem('healthEducationGamification', JSON.stringify(updatedGamification));
      
      return updatedGamification;
    });
  };
  
  // Complete challenge
  const completeChallenge = (challengeId) => {
    setGamification(prev => {
      const challenge = prev.challenges.available.find(c => c.id === challengeId);
      if (!challenge) return prev;
      
      const updatedChallenges = {
        active: prev.challenges.active.filter(c => c.id !== challengeId),
        completed: [...prev.challenges.completed, { ...challenge, completedAt: new Date().toISOString() }],
        available: prev.challenges.available.filter(c => c.id !== challengeId)
      };
      
      // Award XP
      const newXP = prev.experiencePoints + challenge.xp;
      
      return {
        ...prev,
        experiencePoints: newXP,
        challenges: updatedChallenges
      };
    });
    
    alert(`🎆 Challenge completed! You earned ${learningChallenges.daily.find(c => c.id === challengeId)?.xp || 0} XP!`);
  };
  
  // Start interactive quiz
  const startInteractiveQuiz = (topic) => {
    const quiz = {
      id: Date.now(),
      topic: topic,
      questions: generateQuizQuestions(topic),
      startTime: new Date().toISOString()
    };
    
    setInteractiveFeatures(prev => ({
      ...prev,
      quizzes: {
        ...prev.quizzes,
        currentQuiz: quiz
      }
    }));
    
    console.log('Starting interactive quiz for:', topic);
  };
  
  // Generate quiz questions
  const generateQuizQuestions = (topic) => {
    // Sample questions - in real implementation, these would be fetched from backend
    const questions = [
      {
        id: 1,
        question: `What is the most important factor in ${topic}?`,
        options: ['Exercise', 'Diet', 'Sleep', 'All of the above'],
        correct: 3,
        explanation: 'All factors work together for optimal health.'
      },
      {
        id: 2,
        question: `How often should you monitor ${topic}?`,
        options: ['Daily', 'Weekly', 'Monthly', 'Depends on condition'],
        correct: 3,
        explanation: 'Monitoring frequency depends on individual health conditions.'
      }
    ];
    
    return questions;
  };
  
  // Start voice narration
  const startVoiceNarration = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        setInteractiveFeatures(prev => ({
          ...prev,
          voiceNarration: { ...prev.voiceNarration, isPlaying: true }
        }));
      };
      
      utterance.onend = () => {
        setInteractiveFeatures(prev => ({
          ...prev,
          voiceNarration: { ...prev.voiceNarration, isPlaying: false }
        }));
      };
      
      speechSynthesis.speak(utterance);
    }
  };
  
  // Stop voice narration
  const stopVoiceNarration = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setInteractiveFeatures(prev => ({
        ...prev,
        voiceNarration: { ...prev.voiceNarration, isPlaying: false }
      }));
    }
  };

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
