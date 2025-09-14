# Advanced AI Symptom Analyzer System

A comprehensive, AI-powered healthcare symptom analysis system with advanced features including 3D body visualization, real-time monitoring, clinical decision support, and multi-modal input processing.

## 🎯 Features Overview

### Core Features
- **Advanced AI Analysis**: Google Gemini-powered comprehensive symptom analysis
- **3D Body Visualization**: Interactive anatomical visualization with pain mapping
- **Real-time Monitoring**: WebSocket-based continuous health monitoring
- **Clinical Decision Support**: Evidence-based medical recommendations
- **Multi-modal Input**: Voice, image, video, and drawing analysis
- **Risk Assessment**: Intelligent risk stratification and emergency detection
- **Specialist Matching**: AI-powered healthcare provider recommendations
- **Progression Tracking**: Longitudinal symptom monitoring and prediction

### Advanced AI Technologies
- **Emotion Detection**: Analyze emotional state from text and voice
- **Behavioral Analysis**: Pattern recognition and insights
- **Contextual Awareness**: Environmental and lifestyle factor analysis
- **Predictive Analytics**: Symptom progression predictions
- **Emergency Detection**: Automated critical condition alerts

## 🏗️ System Architecture

### Backend Components

#### 1. Route Handlers
- **`advancedSymptomAnalyzer.js`**: Main API routes for symptom analysis
  - `POST /analyze` - Comprehensive symptom analysis
  - `GET /history` - User symptom history
  - `POST /process-multimodal` - Multi-modal input processing
  - `POST /clinical-recommendations` - Clinical decision support
  - `GET /specialists` - Specialist recommendations

#### 2. AI Services
- **`AdvancedSymptomAnalyzer.js`**: Core AI analysis service
- **`BodyVisualizationService.js`**: 3D body visualization and mapping
- **`RiskAssessmentService.js`**: Medical risk stratification
- **`ClinicalDecisionSupport.js`**: Evidence-based recommendations
- **`ProgressionTrackingService.js`**: Longitudinal monitoring
- **`EmotionDetectionService.js`**: Emotional state analysis
- **`MultiModalInputProcessor.js`**: Multi-modal data processing
- **`RealTimeMonitoringService.js`**: Continuous monitoring

#### 3. Database Models
- **`SymptomHistory.js`**: Comprehensive symptom data storage
- **`Specialist.js`**: Healthcare provider information

#### 4. WebSocket Service
- **`SymptomMonitoringWebSocketService.js`**: Real-time monitoring and alerts

### Frontend Components

#### 1. Main Component
- **`SymptomAnalyzer.jsx`**: Advanced React component with full feature set

#### 2. API Integration
- **`AdvancedSymptomAnalyzerAPI.js`**: Frontend API service layer

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- MongoDB
- Google Gemini API key
- Redis (optional, for caching)

### Installation

1. **Clone and setup the project**
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file in backend directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/healthcare_app

   # Google AI
   GOOGLE_AI_API_KEY=your_gemini_api_key_here

   # Server
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # JWT
   JWT_SECRET=your_jwt_secret_here

   # WebSocket
   WS_URL=ws://localhost:5000
   ```

3. **Start the services**
   ```bash
   # Start both backend and frontend
   npm run dev
   
   # Or start individually
   cd backend && npm run dev
   cd frontend && npm start
   ```

### Quick Test
Run the integration test suite:
```bash
node test-advanced-symptom-analyzer.js
```

## 📊 API Documentation

### Symptom Analysis Endpoint

**POST** `/api/v1/symptom-analyzer/analyze`

Request body:
```json
{
  "symptoms": "I have a headache, fever, and fatigue",
  "additionalInfo": {
    "duration": "2 days",
    "severity": "moderate",
    "triggers": "stress",
    "medications": "none",
    "allergies": "none"
  },
  "advancedFeatures": {
    "bodyVisualization": {
      "selectedBodyParts": [
        {
          "name": "Head",
          "painLevel": 7,
          "subparts": ["forehead", "temples"]
        }
      ],
      "anatomyMode": "external",
      "gender": "neutral"
    },
    "aiAnalytics": {
      "emotionDetection": { "enabled": true },
      "behaviorAnalysis": { "enabled": true }
    },
    "realTimeMonitoring": {
      "enabled": true,
      "continuousAssessment": false
    }
  }
}
```

Response:
```json
{
  "success": true,
  "analysis": {
    "symptomAnalysis": {
      "primary_symptoms": ["headache", "fever", "fatigue"],
      "severity_assessment": "moderate",
      "confidence_score": 85
    },
    "bodySystemsInvolved": {
      "affectedSystems": [
        {
          "system": "nervous",
          "confidence": 0.8,
          "severity": "moderate"
        }
      ]
    },
    "recommendations": {
      "immediateActions": ["Rest", "Hydrate", "Monitor temperature"],
      "whenToSeeDoctor": "If symptoms worsen or persist beyond 3 days"
    }
  },
  "riskAnalysis": {
    "riskScore": 35,
    "urgencyLevel": "moderate",
    "riskFactors": [
      {
        "factor": "fever_present",
        "riskLevel": "moderate",
        "score": 15
      }
    ]
  },
  "clinicalRecommendations": {
    "differentialDiagnosis": [
      {
        "condition": "Viral infection",
        "likelihood": "high",
        "urgency": "routine"
      }
    ],
    "recommendedTests": [
      {
        "test": "Complete Blood Count",
        "priority": "routine",
        "reason": "Rule out bacterial infection"
      }
    ]
  },
  "specialists": [
    {
      "name": "Dr. Sarah Johnson",
      "specialty": "Internal Medicine",
      "rating": 4.8,
      "nextAvailable": "2024-01-15T10:00:00Z"
    }
  ],
  "metadata": {
    "analysisId": "analysis_123456",
    "timestamp": "2024-01-14T12:00:00Z",
    "processingTime": 1250
  }
}
```

### Real-time Monitoring WebSocket Events

#### Client → Server Events

**authenticate**
```json
{
  "token": "jwt_token_here"
}
```

**initialize_monitoring**
```json
{
  "analysisId": "analysis_123",
  "symptoms": "chest pain",
  "additionalInfo": {
    "severity": "severe"
  }
}
```

**update_vitals**
```json
{
  "heartRate": 95,
  "bloodPressure": "130/85",
  "temperature": 98.6,
  "oxygenSaturation": 98
}
```

#### Server → Client Events

**vitals_alert**
```json
{
  "alerts": [
    {
      "type": "tachycardia",
      "severity": "high",
      "message": "Heart rate is elevated",
      "recommendation": "Monitor closely"
    }
  ],
  "riskScore": 65,
  "urgencyLevel": "high"
}
```

## 🧪 Testing

### Integration Tests
The system includes comprehensive integration tests covering:

- ✅ Authentication and authorization
- ✅ Basic symptom analysis
- ✅ Advanced AI features
- ✅ Multi-modal input processing
- ✅ Real-time monitoring
- ✅ Clinical decision support
- ✅ Risk assessment
- ✅ Specialist recommendations
- ✅ Database integration
- ✅ Error handling

Run tests:
```bash
node test-advanced-symptom-analyzer.js
```

### Manual Testing Scenarios

#### 1. Emergency Scenario
```json
{
  "symptoms": "Severe chest pain, difficulty breathing, sweating",
  "additionalInfo": {
    "duration": "30 minutes",
    "severity": "extreme"
  }
}
```
**Expected**: High risk score, emergency urgency level, specialist recommendations

#### 2. Chronic Condition
```json
{
  "symptoms": "Joint pain, morning stiffness, fatigue",
  "additionalInfo": {
    "duration": "3 months",
    "severity": "moderate"
  }
}
```
**Expected**: Rheumatology referral, appropriate clinical pathway

#### 3. Minor Symptoms
```json
{
  "symptoms": "Mild headache, occasional fatigue",
  "additionalInfo": {
    "duration": "1 day",
    "severity": "mild"
  }
}
```
**Expected**: Low risk score, self-care recommendations

## 🔧 Configuration

### AI Service Configuration
Modify AI service behavior in service files:

```javascript
// In AdvancedSymptomAnalyzer.js
const ANALYSIS_CONFIG = {
  confidenceThreshold: 0.7,
  emergencyKeywords: ['chest pain', 'difficulty breathing'],
  riskFactorWeights: {
    age: 0.2,
    severity: 0.4,
    symptoms: 0.4
  }
};
```

### Body Visualization Configuration
Customize body parts and anatomical systems:

```javascript
// In BodyVisualizationService.js
const BODY_PARTS_CONFIG = {
  head: {
    systems: ['nervous', 'circulatory'],
    commonSymptoms: ['headache', 'dizziness']
  }
  // ... more configurations
};
```

### Risk Assessment Thresholds
Adjust risk scoring in RiskAssessmentService.js:

```javascript
const RISK_THRESHOLDS = {
  low: 0-25,
  moderate: 26-50,
  high: 51-75,
  critical: 76-100
};
```

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Configure production database URLs
   - Set secure JWT secrets
   - Configure CORS for production domains

2. **Security**
   - Enable rate limiting
   - Configure HTTPS
   - Set up proper authentication
   - Implement audit logging

3. **Performance**
   - Enable MongoDB indexes
   - Configure Redis caching
   - Set up load balancing
   - Monitor AI API usage

4. **Monitoring**
   - Set up health checks
   - Configure error tracking
   - Monitor WebSocket connections
   - Track AI service performance

### Docker Deployment
```dockerfile
# Example Dockerfile for backend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📈 Performance Considerations

### AI Service Optimization
- **Batch Processing**: Group similar requests
- **Caching**: Cache frequent symptom combinations
- **Load Balancing**: Distribute AI service calls
- **Timeout Handling**: Implement proper timeouts

### Database Optimization
- **Indexing**: Key fields for symptom history queries
- **Aggregation**: Efficient analytics queries
- **Partitioning**: Large symptom history collections
- **Archiving**: Old data management

### WebSocket Optimization
- **Connection Pooling**: Manage concurrent connections
- **Message Queuing**: Buffer high-frequency updates
- **Heartbeat**: Maintain connection health
- **Scaling**: Multiple WebSocket servers

## 🔒 Security

### Data Privacy
- **HIPAA Compliance**: Healthcare data protection
- **Encryption**: End-to-end data encryption
- **Anonymization**: Remove PII from logs
- **Audit Trails**: Complete access logging

### API Security
- **Authentication**: JWT-based auth
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **CORS**: Restrict cross-origin requests

### AI Security
- **Prompt Injection**: Protect against malicious inputs
- **Output Filtering**: Sanitize AI responses
- **API Key Management**: Secure credential storage
- **Usage Monitoring**: Track AI service usage

## 🐛 Troubleshooting

### Common Issues

1. **AI Service Errors**
   ```
   Error: Google AI API key not configured
   Solution: Set GOOGLE_AI_API_KEY in environment variables
   ```

2. **WebSocket Connection Issues**
   ```
   Error: WebSocket connection failed
   Solution: Check server is running and ports are open
   ```

3. **Database Connection Problems**
   ```
   Error: MongoDB connection timeout
   Solution: Verify MongoDB is running and connection string is correct
   ```

### Debug Mode
Enable debug logging:
```bash
DEBUG=symptom-analyzer:* npm run dev
```

### Monitoring WebSocket Connections
```javascript
// In browser console
const socket = io('http://localhost:5000');
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
```

## 📚 Additional Resources

### Documentation
- [Google Gemini AI Documentation](https://ai.google.dev/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Documentation](https://socket.io/docs/)
- [React Documentation](https://reactjs.org/docs/)

### Medical References
- [ICD-10 Classification](https://www.who.int/classifications/icd/en/)
- [Clinical Decision Support Systems](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3000765/)
- [Medical Risk Assessment Guidelines](https://www.ahrq.gov/clinical-guidelines.html)

## 🤝 Contributing

### Development Guidelines
1. Follow established code patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider HIPAA compliance for medical features
5. Test with realistic medical scenarios

### Code Structure
```
backend/
├── src/
│   ├── routes/
│   │   └── advancedSymptomAnalyzer.js
│   ├── services/
│   │   ├── AdvancedSymptomAnalyzer.js
│   │   ├── BodyVisualizationService.js
│   │   └── ...
│   ├── models/
│   │   ├── SymptomHistory.js
│   │   └── Specialist.js
│   └── middleware/
│       └── ...
└── server.js

frontend/
├── src/
│   ├── components/
│   │   └── chatbot/
│   │       └── SymptomAnalyzer.jsx
│   ├── services/
│   │   └── AdvancedSymptomAnalyzerAPI.js
│   └── ...
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above

---

**⚠️ Medical Disclaimer**: This system is for educational and demonstration purposes only. Always consult qualified healthcare professionals for medical advice and diagnosis.
