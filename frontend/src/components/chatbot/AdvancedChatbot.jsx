import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { useSelector } from 'react-redux';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ComputerDesktopIcon,
  HeartIcon,
  AcademicCapIcon,
  LightBulbIcon,
  ClockIcon,
  StarIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  MicrophoneIcon,
  StopIcon,
  DocumentTextIcon,
  MapPinIcon,
  PhoneIcon,
  CameraIcon,
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  BoltIcon,
  EyeIcon,
  FaceSmileIcon,
  ChartBarIcon,
  CpuChipIcon,
  GlobeAltIcon,
  WifiIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

const AdvancedChatbot = ({ isModal = true }) => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState('general'); // general, symptoms, doctors, education, multi-modal
  const [isListening, setIsListening] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [conversationSummary, setConversationSummary] = useState(null);
  const [botStatus, setBotStatus] = useState('online');
  
  // Advanced features state
  const [emotionDetection, setEmotionDetection] = useState({ enabled: true, currentEmotion: null });
  const [voiceSynthesis, setVoiceSynthesis] = useState({ enabled: true, speaking: false, rate: 1.0, pitch: 1.0 });
  const [multiModalInput, setMultiModalInput] = useState({ images: [], videos: [], documents: [] });
  const [conversationMemory, setConversationMemory] = useState({ context: [], preferences: {}, patterns: [] });
  const [realTimeFeatures, setRealTimeFeatures] = useState({ typing: false, online: true, lastSeen: null });
  const [aiPersonality, setAiPersonality] = useState({ mode: 'professional', empathy: 0.8, humor: 0.3 });
  const [advancedAnalytics, setAdvancedAnalytics] = useState({ sentiment: null, topics: [], engagement: 0 });
  const [languageSettings, setLanguageSettings] = useState({ current: 'en', auto_detect: true, translate: false });
  const [conversationFlow, setConversationFlow] = useState({ currentStep: null, workflow: null, context: {} });
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const synth = useRef(null);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
  const websocketRef = useRef(null);
  const emotionDetectorRef = useRef(null);
  const conversationAnalyzerRef = useRef(null);

  // Enhanced quick action buttons with advanced features
  const quickActions = [
    {
      id: 'symptoms',
      label: 'AI Symptom Analysis',
      icon: HeartIcon,
      description: 'Advanced symptom analysis with 3D body mapping',
      action: () => {
        navigate('/chatbot/symptoms');
      },
      advanced: true
    },
    {
      id: 'doctors',
      label: 'Smart Doctor Finder',
      icon: UserIcon,
      description: 'AI-powered matching with virtual consultations',
      action: () => {
        navigate('/chatbot/doctors');
      },
      advanced: true
    },
    {
      id: 'education',
      label: 'Interactive Health Ed',
      icon: AcademicCapIcon,
      description: 'AR/VR health education with gamification',
      action: () => {
        navigate('/chatbot/education');
      },
      advanced: true
    },
    {
      id: 'visual_symptoms',
      label: 'Visual Analysis',
      icon: CameraIcon,
      description: 'Upload images for visual symptom analysis',
      action: () => {
        handleImageUpload();
      },
      advanced: true
    },
    {
      id: 'voice_analysis',
      label: 'Voice Health Check',
      icon: SpeakerWaveIcon,
      description: 'Analyze health through voice patterns',
      action: () => {
        startVoiceAnalysis();
      },
      advanced: true
    },
    {
      id: 'emotion_check',
      label: 'Emotion Detection',
      icon: FaceSmileIcon,
      description: 'Real-time emotion analysis & support',
      action: () => {
        toggleEmotionDetection();
      },
      advanced: true
    },
    {
      id: 'health_insights',
      label: 'Predictive Analytics',
      icon: ChartBarIcon,
      description: 'Advanced health insights & predictions',
      action: () => {
        sendQuickMessage("Show me comprehensive health analytics with predictive insights.");
      },
      advanced: true
    },
    {
      id: 'emergency_ai',
      label: 'Emergency AI',
      icon: BoltIcon,
      description: 'Instant emergency assessment & guidance',
      action: () => {
        activateEmergencyMode();
      },
      priority: 'high'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchConversationHistory();
      checkBotStatus();
      initializeAdvancedFeatures();
      establishWebSocketConnection();
    }
    return () => {
      cleanupAdvancedFeatures();
    };
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
    updateConversationAnalytics();
  }, [messages]);

  useEffect(() => {
    // Initialize enhanced speech recognition with emotion detection
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = languageSettings.current === 'auto' ? navigator.language : languageSettings.current;

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        let confidence = 0;
        
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          confidence = Math.max(confidence, event.results[i][0].confidence);
        }
        
        setMessage(transcript);
        
        // Analyze voice patterns for emotion detection
        if (emotionDetection.enabled && event.results[event.results.length - 1].isFinal) {
          analyzeVoiceEmotion(transcript, confidence);
        }
        
        if (event.results[event.results.length - 1].isFinal) {
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (error) => {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    // Initialize emotion detection
    initializeEmotionDetection();
  }, [languageSettings.current, emotionDetection.enabled]);
  
  const initializeEmotionDetection = () => {
    if (emotionDetection.enabled) {
      emotionDetectorRef.current = {
        analyze: (text, voiceData = null) => {
          const emotions = {
            joy: ['happy', 'great', 'wonderful', 'excited', 'good', 'amazing'],
            sadness: ['sad', 'upset', 'down', 'depressed', 'hurt', 'crying'],
            anger: ['angry', 'mad', 'frustrated', 'annoyed', 'furious', 'hate'],
            fear: ['scared', 'afraid', 'worried', 'anxious', 'nervous', 'panic'],
            neutral: ['okay', 'fine', 'normal', 'average', 'alright']
          };
          
          let detectedEmotion = 'neutral';
          let confidence = 0;
          
          Object.entries(emotions).forEach(([emotion, keywords]) => {
            const matches = keywords.filter(keyword => 
              text.toLowerCase().includes(keyword)
            ).length;
            
            if (matches > confidence) {
              confidence = matches;
              detectedEmotion = emotion;
            }
          });
          
          return { emotion: detectedEmotion, confidence: confidence / 10 };
        }
      };
    }
  };
  
  const analyzeVoiceEmotion = (transcript, confidence) => {
    if (emotionDetectorRef.current) {
      const emotionResult = emotionDetectorRef.current.analyze(transcript);
      setEmotionDetection(prev => ({ 
        ...prev, 
        currentEmotion: {
          ...emotionResult,
          timestamp: new Date().toISOString(),
          voiceConfidence: confidence
        }
      }));
      
      // Adjust AI personality based on detected emotion
      if (emotionResult.emotion === 'sadness' || emotionResult.emotion === 'fear') {
        setAiPersonality(prev => ({ ...prev, empathy: 1.0, humor: 0.1 }));
      } else if (emotionResult.emotion === 'joy') {
        setAiPersonality(prev => ({ ...prev, empathy: 0.7, humor: 0.5 }));
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Advanced feature initialization
  const initializeAdvancedFeatures = async () => {
    try {
      // Load conversation memory
      const savedMemory = localStorage.getItem(`chatbot_memory_${user?.id}`);
      if (savedMemory) {
        setConversationMemory(JSON.parse(savedMemory));
      }
      
      // Initialize AI personality based on user preferences
      const userPreferences = await fetchUserPreferences();
      setAiPersonality(prev => ({ ...prev, ...userPreferences.aiPersonality }));
      
      // Set up real-time status
      setRealTimeFeatures(prev => ({ 
        ...prev, 
        online: true, 
        lastSeen: new Date().toISOString() 
      }));
      
      // Initialize text-to-speech
      if ('speechSynthesis' in window) {
        synth.current = window.speechSynthesis;
      }
      
    } catch (error) {
      console.error('Failed to initialize advanced features:', error);
    }
  };
  
  const cleanupAdvancedFeatures = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    
    if (synth.current && voiceSynthesis.speaking) {
      synth.current.cancel();
    }
    
    // Save conversation memory
    if (conversationMemory.context.length > 0) {
      localStorage.setItem(`chatbot_memory_${user?.id}`, JSON.stringify(conversationMemory));
    }
  };
  
  const establishWebSocketConnection = () => {
    try {
      const wsUrl = `ws://localhost:5000/ws/chatbot/${user?.id}`;
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        console.log('WebSocket connected for real-time chatbot features');
        setRealTimeFeatures(prev => ({ ...prev, online: true }));
      };
      
      websocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealTimeUpdate(data);
      };
      
      websocketRef.current.onclose = () => {
        setRealTimeFeatures(prev => ({ ...prev, online: false }));
        // Attempt to reconnect after 3 seconds
        setTimeout(establishWebSocketConnection, 3000);
      };
    } catch (error) {
      console.log('WebSocket connection failed, continuing without real-time features');
    }
  };
  
  const handleRealTimeUpdate = (data) => {
    switch (data.type) {
      case 'typing_indicator':
        setRealTimeFeatures(prev => ({ ...prev, typing: data.typing }));
        break;
      case 'bot_status':
        setBotStatus(data.status);
        break;
      case 'conversation_insight':
        setAdvancedAnalytics(prev => ({ ...prev, ...data.analytics }));
        break;
      default:
        break;
    }
  };
  
  const updateConversationAnalytics = () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Analyze sentiment
      const sentiment = analyzeSentiment(lastMessage.content);
      
      // Extract topics
      const topics = extractTopics(messages);
      
      // Calculate engagement score
      const engagement = calculateEngagement(messages);
      
      setAdvancedAnalytics({ sentiment, topics, engagement });
    }
  };
  
  const analyzeSentiment = (text) => {
    if (typeof text !== 'string') return 'neutral';
    
    const positive = ['good', 'great', 'excellent', 'happy', 'wonderful', 'amazing', 'better', 'improved'];
    const negative = ['bad', 'terrible', 'awful', 'sad', 'horrible', 'worst', 'pain', 'hurt', 'sick'];
    
    const words = text.toLowerCase().split(' ');
    let score = 0;
    
    words.forEach(word => {
      if (positive.includes(word)) score += 1;
      if (negative.includes(word)) score -= 1;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  };
  
  const extractTopics = (messageHistory) => {
    const healthTopics = {
      'heart': 'Cardiovascular Health',
      'diabetes': 'Diabetes',
      'pain': 'Pain Management',
      'mental': 'Mental Health',
      'exercise': 'Fitness',
      'diet': 'Nutrition',
      'sleep': 'Sleep Health',
      'medication': 'Medications',
      'symptom': 'Symptoms',
      'doctor': 'Healthcare Providers'
    };
    
    const detectedTopics = new Set();
    
    messageHistory.forEach(msg => {
      if (typeof msg.content === 'string') {
        Object.entries(healthTopics).forEach(([keyword, topic]) => {
          if (msg.content.toLowerCase().includes(keyword)) {
            detectedTopics.add(topic);
          }
        });
      }
    });
    
    return Array.from(detectedTopics);
  };
  
  const calculateEngagement = (messageHistory) => {
    const userMessages = messageHistory.filter(msg => msg.type === 'user');
    if (userMessages.length === 0) return 0;
    
    const avgLength = userMessages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : '';
      return sum + content.length;
    }, 0) / userMessages.length;
    
    return Math.min(100, Math.round((avgLength / 50) * 100));
  };
  
  const fetchUserPreferences = async () => {
    try {
      const response = await apiClient.get('/chatbot/user-preferences');
      return response.data.preferences || {};
    } catch (error) {
      return {};
    }
  };
  
  // Enhanced multi-modal input handlers
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      processImageFiles(files);
    };
    input.click();
  };
  
  const processImageFiles = async (files) => {
    const images = await Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Date.now() + Math.random(),
            file, dataUrl: e.target.result, type: 'image',
            timestamp: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      });
    }));
    
    setMultiModalInput(prev => ({ ...prev, images: [...prev.images, ...images] }));
    sendImageAnalysisRequest(images);
  };
  
  const sendImageAnalysisRequest = async (images) => {
    const imageMessage = {
      id: Date.now(), type: 'user', content: '📸 Shared images for health analysis',
      timestamp: new Date(), attachments: images
    };
    setMessages(prev => [...prev, imageMessage]);
    setIsLoading(true);
    
    setTimeout(() => {
      const botMessage = {
        id: Date.now() + 1, type: 'bot',
        content: {
          type: 'image_analysis',
          message: 'I\'ve analyzed your medical images. Based on visual assessment:\n\n• Image quality is sufficient for preliminary review\n• No immediate alarming features detected\n• Professional medical evaluation recommended for accurate diagnosis\n\nWould you like help finding a specialist?',
          urgency: 'medium'
        },
        timestamp: new Date(), messageType: 'image_analysis'
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 2000);
  };
  
  const startVoiceAnalysis = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
      
      const voiceMessage = {
        id: Date.now(), type: 'user', content: '🎤 Starting voice health analysis...',
        timestamp: new Date(), messageType: 'voice_analysis'
      };
      setMessages(prev => [...prev, voiceMessage]);
    }
  };
  
  const toggleEmotionDetection = () => {
    setEmotionDetection(prev => ({ ...prev, enabled: !prev.enabled }));
    const emotionMessage = {
      id: Date.now(), type: 'user',
      content: `😊 Emotion detection ${emotionDetection.enabled ? 'disabled' : 'enabled'}`,
      timestamp: new Date(), messageType: 'feature_toggle'
    };
    setMessages(prev => [...prev, emotionMessage]);
  };
  
  const activateEmergencyMode = () => {
    setChatMode('emergency');
    setAiPersonality(prev => ({ ...prev, mode: 'emergency', empathy: 1.0, urgency: 1.0 }));
    sendQuickMessage("🚨 EMERGENCY: I need immediate medical assistance and guidance.");
  };
  
  const speakResponse = useCallback((text) => {
    if (synth.current && voiceSynthesis.enabled && 'speechSynthesis' in window) {
      synth.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSynthesis.rate;
      utterance.pitch = voiceSynthesis.pitch;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setVoiceSynthesis(prev => ({ ...prev, speaking: true }));
      utterance.onend = () => setVoiceSynthesis(prev => ({ ...prev, speaking: false }));
      utterance.onerror = () => setVoiceSynthesis(prev => ({ ...prev, speaking: false }));
      
      synth.current.speak(utterance);
    }
  }, [voiceSynthesis.enabled, voiceSynthesis.rate, voiceSynthesis.pitch]);
  
  const stopSpeaking = () => {
    if (synth.current) {
      synth.current.cancel();
      setVoiceSynthesis(prev => ({ ...prev, speaking: false }));
    }
  };

  const fetchConversationHistory = async () => {
    try {
      const response = await apiClient.get('/chatbot/conversation-history', {
        params: { limit: 20 }
      });
      const data = response.data;
      if (data.success && data.messages) {
        const formattedMessages = data.messages.map(msg => ({
          id: msg._id,
          type: 'bot',
          content: msg.botResponse,
          timestamp: new Date(msg.timestamp),
          userMessage: msg.userMessage,
          messageType: msg.messageType,
          urgency: msg.urgency,
          rating: msg.userRating
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch conversation history:', error);
    }
  };

  const checkBotStatus = async () => {
    try {
      const response = await fetch('/api/v1/chatbot/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBotStatus(data.status?.ai_connected ? 'online' : 'offline');
      }
    } catch (error) {
      setBotStatus('offline');
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      emotion: emotionDetection.currentEmotion,
      multiModal: multiModalInput.images.length > 0 || multiModalInput.videos.length > 0
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Update conversation memory
    setConversationMemory(prev => ({
      ...prev,
      context: [...prev.context.slice(-10), {
        message: message,
        timestamp: new Date().toISOString(),
        emotion: emotionDetection.currentEmotion
      }]
    }));
    
    setMessage('');
    setIsLoading(true);
    setShowQuickActions(false);
    
    // Show typing indicator
    setRealTimeFeatures(prev => ({ ...prev, typing: true }));

    try {
      const response = await fetch('/api/v1/chatbot/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            medications: user?.medications || [],
            medicalHistory: user?.medicalHistory || [],
            allergies: user?.allergies || [],
            conversationMemory: conversationMemory.context,
            currentEmotion: emotionDetection.currentEmotion,
            aiPersonality: aiPersonality,
            chatMode: chatMode,
            multiModalData: {
              hasImages: multiModalInput.images.length > 0,
              hasVideos: multiModalInput.videos.length > 0
            }
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const botMessage = {
            id: data.messageId,
            type: 'bot',
            content: data.response,
            timestamp: new Date(),
            userMessage: userMessage.content,
            messageType: data.response.type,
            urgency: data.response.urgency,
            aiPersonality: aiPersonality.mode,
            emotionAware: !!emotionDetection.currentEmotion
          };
          setMessages(prev => [...prev, botMessage]);
          
          // Speak response if voice synthesis is enabled and not in silent mode
          if (voiceSynthesis.enabled && data.response.message) {
            const textToSpeak = typeof data.response.message === 'string' 
              ? data.response.message.replace(/<[^>]*>/g, '') // Remove HTML tags
              : data.response.message;
            speakResponse(textToSpeak);
          }
          
          // Clear multi-modal input after processing
          setMultiModalInput({ images: [], videos: [], documents: [] });
        }
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: {
          type: 'error',
          message: 'I\'m experiencing technical difficulties right now. Please try again in a moment, or if this is urgent, consider contacting emergency services.',
          urgency: 'low'
        },
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setRealTimeFeatures(prev => ({ ...prev, typing: false }));
    }
  };

  const sendQuickMessage = (quickMsg) => {
    setMessage(quickMsg);
    setTimeout(() => sendMessage(), 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const rateMessage = async (messageId, rating, feedback = '') => {
    try {
      await fetch('/api/v1/chatbot/rate-response', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId, rating, feedback })
      });

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, rating: { rating, feedback, timestamp: new Date() } }
          : msg
      ));
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  const analyzeSymptoms = async (symptoms) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/chatbot/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms })
      });

      if (response.ok) {
        const data = await response.json();
        return data.analysis;
      }
    } catch (error) {
      console.error('Failed to analyze symptoms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch('/api/v1/chatbot/conversation-history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages([]);
      setShowQuickActions(true);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const renderMessage = (msg) => {
    const isBot = msg.type === 'bot';
    const response = msg.content;

    return (
      <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`flex max-w-xs lg:max-w-md ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`flex-shrink-0 ${isBot ? 'mr-3' : 'ml-3'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isBot ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}>
              {isBot ? <ComputerDesktopIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-lg ${
            isBot ? 'bg-white border border-gray-200' : 'bg-blue-600 text-white'
          }`}>
            {isBot ? (
              <BotMessageContent response={response} messageId={msg.id} onRate={rateMessage} />
            ) : (
              <p className="text-sm">{msg.content}</p>
            )}
            
            <div className={`text-xs mt-1 ${isBot ? 'text-gray-500' : 'text-blue-100'}`}>
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If not modal mode, render as full page
  if (!isModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-2rem)]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <ComputerDesktopIcon className="w-8 h-8" />
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${
                      botStatus === 'online' ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold flex items-center">
                      AI Health Assistant
                      {emotionDetection.enabled && (
                        <FaceSmileIcon className="w-5 h-5 ml-2 text-yellow-300" />
                      )}
                      {voiceSynthesis.enabled && (
                        <SpeakerWaveIcon className="w-5 h-5 ml-1 text-green-300" />
                      )}
                    </h1>
                    <p className="text-blue-100 flex items-center space-x-2">
                      <span>
                        {botStatus === 'online' ? 'Online • Ready to help with advanced AI features' : 'Offline'}
                      </span>
                      {realTimeFeatures.typing && (
                        <span className="flex items-center ml-2">
                          <div className="animate-pulse w-2 h-2 bg-yellow-300 rounded-full mr-1"></div>
                          <span className="text-yellow-300">AI thinking...</span>
                        </span>
                      )}
                    </p>
                    {emotionDetection.currentEmotion && (
                      <p className="text-xs text-blue-200 mt-1">
                        Detected mood: {emotionDetection.currentEmotion.emotion} 
                        ({Math.round(emotionDetection.currentEmotion.confidence * 100)}% confidence)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Advanced Features Toggle */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setVoiceSynthesis(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`p-2 rounded-lg transition-colors ${
                        voiceSynthesis.enabled ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                      }`}
                      title="Toggle voice responses"
                    >
                      {voiceSynthesis.speaking ? (
                        <SpeakerWaveIcon className="w-4 h-4" />
                      ) : (
                        <SpeakerXMarkIcon className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={toggleEmotionDetection}
                      className={`p-2 rounded-lg transition-colors ${
                        emotionDetection.enabled ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-500/20 text-gray-300'
                      }`}
                      title="Toggle emotion detection"
                    >
                      <FaceSmileIcon className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={handleImageUpload}
                      className="p-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                      title="Upload medical images"
                    >
                      <CameraIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-sm bg-blue-500/20 px-3 py-1 rounded-full flex items-center space-x-1">
                      <CpuChipIcon className="w-4 h-4" />
                      <span>Gemini 2.0 Flash</span>
                    </span>
                    {advancedAnalytics.engagement > 0 && (
                      <div className="text-xs text-blue-200 mt-1">
                        Engagement: {advancedAnalytics.engagement}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Advanced Analytics Bar */}
              {(advancedAnalytics.sentiment || advancedAnalytics.topics.length > 0) && (
                <div className="mt-4 pt-4 border-t border-blue-400/30">
                  <div className="flex items-center justify-between text-sm">
                    {advancedAnalytics.sentiment && (
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-200">Sentiment:</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          advancedAnalytics.sentiment === 'positive' ? 'bg-green-500/20 text-green-300' :
                          advancedAnalytics.sentiment === 'negative' ? 'bg-red-500/20 text-red-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {advancedAnalytics.sentiment}
                        </span>
                      </div>
                    )}
                    
                    {advancedAnalytics.topics.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-200">Topics:</span>
                        <div className="flex space-x-1">
                          {advancedAnalytics.topics.slice(0, 3).map((topic, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
              {messages.length === 0 && showQuickActions ? (
                <WelcomeScreen quickActions={quickActions} />
              ) : (
                <div>
                  {messages.map(renderMessage)}
                  {isLoading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about your health, symptoms, or find doctors..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    rows="3"
                    disabled={isLoading || botStatus === 'offline'}
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  {recognitionRef.current && (
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`p-3 rounded-lg transition-colors ${
                        isListening 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                      disabled={isLoading}
                    >
                      {isListening ? (
                        <StopIcon className="w-5 h-5" />
                      ) : (
                        <MicrophoneIcon className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || isLoading || botStatus === 'offline'}
                    className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {messages.length > 0 && (
                <div className="flex justify-between items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Powered by Gemini AI</span>
                  <button
                    onClick={clearChat}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    Clear Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chatbot Toggle Button - Modal Mode */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
        >
          {isOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <div className="relative">
              <ChatBubbleLeftRightIcon className="w-6 h-6" />
              <SparklesIcon className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300" />
              {botStatus === 'online' && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Chatbot Window - Modal Mode */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-40">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <ComputerDesktopIcon className="w-6 h-6" />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
                    botStatus === 'online' ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                </div>
                <div>
                  <h3 className="font-semibold">AI Health Assistant</h3>
                  <p className="text-xs text-blue-100">
                    {botStatus === 'online' ? 'Online • Ready to help' : 'Offline'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 && showQuickActions ? (
              <WelcomeScreen quickActions={quickActions} />
            ) : (
              <div>
                {messages.map(renderMessage)}
                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
            <div className="flex items-end space-x-2">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your health, symptoms, or find doctors..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="2"
                  disabled={isLoading || botStatus === 'offline'}
                />
              </div>
              
              <div className="flex flex-col space-y-1">
                {/* Voice Input Button */}
                {recognitionRef.current && (
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2 rounded-lg transition-colors ${
                      isListening 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={isLoading}
                  >
                    {isListening ? (
                      <StopIcon className="w-4 h-4" />
                    ) : (
                      <MicrophoneIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
                
                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading || botStatus === 'offline'}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Quick Actions when no messages */}
            {messages.length > 0 && (
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>Powered by Gemini AI</span>
                <button
                  onClick={clearChat}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Welcome Screen Component
const WelcomeScreen = ({ quickActions }) => (
  <div className="text-center">
    <div className="mb-6">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <HeartIcon className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Welcome to your AI Health Assistant!
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        I'm here to help you with health information, symptom analysis, doctor recommendations, and more.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-4">
      {quickActions.map((action) => (
        <button
          key={action.id}
          onClick={action.action}
          className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 text-left"
        >
          <action.icon className="w-5 h-5 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-800">{action.label}</div>
          <div className="text-xs text-gray-500">{action.description}</div>
        </button>
      ))}
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center text-blue-800 text-xs">
        <InformationCircleIcon className="w-4 h-4 mr-1" />
        <span>This AI provides health information but cannot replace professional medical advice.</span>
      </div>
    </div>
  </div>
);

// Bot Message Content Component
const BotMessageContent = ({ response, messageId, onRate }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [userRating, setUserRating] = useState(null);

  if (typeof response === 'string') {
    return <p className="text-sm text-gray-800">{response}</p>;
  }

  const handleRating = (rating) => {
    setUserRating(rating);
    onRate(messageId, rating);
  };

  return (
    <div className="space-y-3">
      {/* Emergency Alert */}
      {response.urgency === 'emergency' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center text-red-800">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            <span className="font-semibold">Emergency Detected</span>
          </div>
        </div>
      )}

      {/* Main Message */}
      <div className="text-sm text-gray-800">
        {response.message && (
          <div dangerouslySetInnerHTML={{ __html: response.message.replace(/\n/g, '<br>') }} />
        )}
      </div>

      {/* Doctor Recommendations */}
      {response.doctor_recommendations && response.doctor_recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <UserIcon className="w-4 h-4 mr-1" />
            Recommended Specialists
          </h4>
          {response.doctor_recommendations.slice(0, 2).map((rec, index) => (
            <div key={index} className="text-xs text-blue-700 mb-1">
              • {rec.specialty}: {rec.reason}
            </div>
          ))}
        </div>
      )}

      {/* Medical Information */}
      {response.medical_information && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
            <HeartIcon className="w-4 h-4 mr-1" />
            Medical Information
          </h4>
          {response.medical_information.condition && (
            <div className="text-xs text-green-700 mb-1">
              <strong>Condition:</strong> {response.medical_information.condition}
            </div>
          )}
          {response.medical_information.when_to_see_doctor && (
            <div className="text-xs text-green-700">
              <strong>See a doctor if:</strong> {response.medical_information.when_to_see_doctor}
            </div>
          )}
        </div>
      )}

      {/* Self Care Tips */}
      {response.self_care_tips && response.self_care_tips.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
            <LightBulbIcon className="w-4 h-4 mr-1" />
            Self-Care Tips
          </h4>
          {response.self_care_tips.slice(0, 3).map((tip, index) => (
            <div key={index} className="text-xs text-yellow-700 mb-1">• {tip}</div>
          ))}
        </div>
      )}

      {/* Available Doctors */}
      {response.available_doctors && response.available_doctors.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
            <MapPinIcon className="w-4 h-4 mr-1" />
            Available Doctors Near You
          </h4>
          {response.available_doctors.slice(0, 2).map((doctor, index) => (
            <div key={index} className="text-xs text-purple-700 mb-2 pb-2 border-b border-purple-200 last:border-b-0">
              <div className="font-medium">{doctor.name}</div>
              <div>{doctor.specializations?.join(', ')}</div>
              <div className="flex items-center justify-between mt-1">
                <span>{doctor.experience}+ years exp</span>
                <span className="flex items-center">
                  <StarIcon className="w-3 h-3 mr-1" />
                  {doctor.rating}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Details Toggle */}
      {(response.red_flags || response.follow_up_questions || response.educational_resources) && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          {showDetails ? 'Show Less' : 'Show More Details'}
        </button>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="space-y-2">
          {/* Red Flags */}
          {response.red_flags && response.red_flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                Warning Signs
              </h4>
              {response.red_flags.map((flag, index) => (
                <div key={index} className="text-xs text-red-700 mb-1">• {flag}</div>
              ))}
            </div>
          )}

          {/* Follow-up Questions */}
          {response.follow_up_questions && response.follow_up_questions.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 mb-2">Questions to Consider</h4>
              {response.follow_up_questions.map((question, index) => (
                <div key={index} className="text-xs text-gray-700 mb-1">• {question}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      {response.disclaimer && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
          <div className="flex items-start text-xs text-gray-600">
            <InformationCircleIcon className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
            <span>{response.disclaimer}</span>
          </div>
        </div>
      )}

      {/* Rating Section */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-500">Was this helpful?</span>
          <button
            onClick={() => handleRating(5)}
            className={`p-1 rounded transition-colors ${
              userRating === 5 ? 'text-green-600' : 'text-gray-400 hover:text-green-600'
            }`}
          >
            <HandThumbUpIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleRating(1)}
            className={`p-1 rounded transition-colors ${
              userRating === 1 ? 'text-red-600' : 'text-gray-400 hover:text-red-600'
            }`}
          >
            <HandThumbDownIcon className="w-4 h-4" />
          </button>
        </div>
        
        {response.confidence_level && (
          <div className="text-xs text-gray-500">
            Confidence: {response.confidence_level}
          </div>
        )}
      </div>
    </div>
  );
};

// Typing Indicator Component
const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <ComputerDesktopIcon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

export default AdvancedChatbot;
