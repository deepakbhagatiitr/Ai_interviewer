# CodeSage - Dual Portal Live Coding Interview Platform

A comprehensive AI-powered platform for conducting live coding interviews with real-time code analysis, intelligent hints, and detailed performance reporting. Features separate **Admin Portal** and **Candidate Portal** with role-based access control.

## 🚀 Features

### Dual Portal System
- **Admin Portal**: AI interview dashboard with comprehensive analytics and reporting
- **Candidate Portal**: Interactive coding interview with CodeSage chat interface
- **Role-Based Authentication**: Separate login flows for admins and candidates
- **Hardcoded Test Users**: Pre-configured users for easy testing

### Core Functionality
- **Real-time Code Analysis**: AI-powered analysis of code as candidates type
- **Intelligent Hint System**: Progressive hint system (Nudge → Guide → Direction)
- **AI Chat Interface**: Interactive CodeSage with follow-up questions
- **Live Test Execution**: Real-time code testing with comprehensive test cases
- **Comprehensive Scoring**: Multi-dimensional performance evaluation
- **Session Tracking**: Complete interview session monitoring and analytics

### Technical Features
- **Multi-language Support**: JavaScript, Python, C++ (restricted to these three)
- **Code Quality Assessment**: Syntax checking, logic analysis, and best practices
- **Test Execution**: Automated test case running and validation
- **Performance Metrics**: Code complexity, readability, and efficiency analysis
- **AI Interaction Tracking**: Complete database logging of all AI interactions
- **Detailed Reporting**: Comprehensive interview reports and analytics

### User Experience
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Code Editor**: Monaco Editor with syntax highlighting and IntelliSense
- **Real-time Updates**: WebSocket-based live updates
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **Auto-popup Chat**: AI responses automatically open in chat interface

## 🏗️ Architecture

### Backend (Node.js + Express)
- **RESTful API**: RESTful endpoints for all operations
- **WebSocket Server**: Real-time communication using Socket.IO
- **AI Integration**: OpenAI GPT-4 for code analysis and hints (with fallback)
- **Database**: MongoDB for data persistence
- **Authentication**: JWT-based authentication system
- **AI Interaction Tracking**: Comprehensive logging of all AI interactions

### Frontend (React + TypeScript)
- **Component-based**: Modular React components
- **State Management**: Context API for state management
- **Real-time Updates**: Socket.IO client for live updates
- **Code Editor**: Monaco Editor integration
- **Charts & Analytics**: Recharts for data visualization
- **Dual Portal System**: Separate admin and candidate interfaces

### AI Services
- **Code Analysis**: Real-time syntax and logic analysis
- **Hint Generation**: Context-aware hint suggestions
- **Performance Scoring**: Multi-dimensional scoring system
- **Feedback Generation**: Comprehensive interview feedback
- **Test-based Analysis**: AI analysis based on test results
- **Interview Assessment**: Complete performance evaluation

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB 6.0+
- OpenAI API Key (optional - has fallback)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai_interviewer
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ../client
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template (optional)
   cp .env.example .env
   
   # Edit .env file with your configuration (optional)
   nano .env
   ```

4. **Configure Environment Variables** (Optional - defaults provided)
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/ai-interviewer
   
   # OpenAI Configuration (optional - has fallback)
   OPENAI_API_KEY=your_openai_api_key_here
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_here
   ```

5. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:6.0
   
   # Or install MongoDB locally
   # Follow MongoDB installation guide for your OS
   ```

6. **Start the application**
   ```bash
   # Start backend server
   cd server
   node index.js
   
   # In a new terminal, start frontend
   cd client
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

## 👥 User Accounts

### Pre-configured Users

**Admin Account:**
- Email: `admin@gmail.com`
- Password: `admin123`
- Role: Administrator
- Access: Full admin dashboard with analytics and reporting

**Test Candidate Accounts:**
- Email: `user1@gmail.com` | Password: `user1`
- Email: `user2@gmail.com` | Password: `user2`
- Email: `user3@gmail.com` | Password: `user3`
- Role: Candidate
- Access: Coding interview interface

## 🎯 Usage Guide

### For Candidates
1. **Login**: Use one of the test candidate accounts
2. **Start Interview**: AI interviewer will ask initial questions
3. **Coding Round**: Transition to coding editor after 5-second countdown
4. **Code Solution**: Write code in C++ (language restricted)
5. **Run Tests**: Test your solution against provided test cases
6. **AI Feedback**: Receive real-time AI analysis and hints
7. **Complete Interview**: Submit final solution

### For Administrators
1. **Login**: Use admin account (`admin@gmail.com` / `admin123`)
2. **Dashboard Overview**: View recent interviews and analytics
3. **Reports Section**: Access comprehensive interview completion data
4. **AI Insights**: View detailed AI interaction metrics
5. **Performance Analysis**: Review candidate performance summaries

### Interview Process
- **Duration**: 45 minutes total
- **Problems**: 2 LeetCode problems (3Sum, Product of Array Except Self)
- **Languages**: C++ only
- **AI Assistance**: Progressive hints (max 3 per problem)
- **Auto-progression**: Moves to next problem after 2 minutes of inactivity

## 📊 Database Schema

### Collections
- **users**: User accounts and profiles
- **interviews**: Interview sessions and data
- **interviewSessions**: Detailed interview tracking
- **chatMessages**: AI chat conversation history
- **aiInteractions**: Comprehensive AI interaction logging

### AI Interaction Types
- `code_analysis`: Real-time code analysis
- `test_feedback`: Test result analysis
- `hint`: AI-generated hints
- `system_message`: System notifications
- `interview_completion`: Complete interview summary

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login (supports hardcoded users)
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Interview Endpoints
- `GET /api/interview-sessions/sessions` - Get all interview sessions
- `GET /api/interview-sessions/:id` - Get specific session
- `GET /api/interview-sessions/analytics` - Get session analytics

### AI Interaction Endpoints
- `GET /api/ai-interactions/candidate/:email` - Get candidate interactions
- `GET /api/ai-interactions/session/:sessionId` - Get session interactions
- `GET /api/ai-interactions/metrics` - Get aggregated metrics
- `GET /api/ai-interactions/interview-completions` - Get completed interviews
- `GET /api/ai-interactions/interview-analytics` - Get interview analytics
- `PUT /api/ai-interactions/:id` - Update interaction record

### Reports Endpoints
- `GET /api/reports/analytics` - Get basic analytics
- `GET /api/reports/comprehensive-analytics` - Get detailed analytics

### WebSocket Events
- `start_interview_session` - Start interview tracking
- `code_change` - Send code changes
- `run_tests` - Execute test cases
- `complete_interview_session` - Complete interview
- `test_connection` - Test socket connectivity

## 🎨 UI Components

### Admin Portal
- **AdminDashboard**: Main dashboard with analytics
- **AdminLogin**: Admin authentication
- **Reports Section**: Comprehensive interview data
- **AI Insights**: AI interaction metrics and summaries

### Candidate Portal
- **CandidateLogin**: Candidate authentication
- **CandidateCoding**: Main coding interface
- **ChatInterface**: CodeSage chat
- **TestResults**: Test execution results
- **CodeEditor**: Monaco editor integration

## 🔍 Key Features

### CodeSage Chat
- **Read-only Interface**: Candidates cannot send messages
- **Auto-popup**: Opens automatically when AI responds
- **Progressive Hints**: Nudge → Guide → Direction system
- **Follow-up Questions**: AI asks probing questions
- **Session Messages**: Local storage, resets on refresh

### Real-time Analysis
- **Code Monitoring**: Continuous code analysis
- **Performance Metrics**: Big O, maintainability, execution time
- **Error Detection**: Syntax and logic error identification
- **Test Execution**: Real-time test case running
- **AI Feedback**: Contextual suggestions and hints

### Comprehensive Reporting
- **Interview Completion Data**: Complete session summaries
- **AI Interaction Metrics**: Detailed AI assistance tracking
- **Performance Analytics**: Multi-dimensional scoring
- **Human-readable Summaries**: AI-generated performance assessments
- **Candidate Comparison**: Side-by-side performance analysis

## 🚀 Deployment

### Production Checklist
- [ ] Set strong JWT secret
- [ ] Configure production MongoDB
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment variables
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Performance Optimization
- Enable MongoDB indexing
- Configure Redis caching (optional)
- Set up CDN for static assets
- Optimize Docker images
- Configure load balancing

## 🧪 Testing

### Manual Testing
1. **Admin Login**: Test admin dashboard functionality
2. **Candidate Login**: Test interview flow with each test user
3. **Code Analysis**: Verify real-time analysis works
4. **Test Execution**: Confirm test cases run correctly
5. **AI Interactions**: Check AI responses and chat interface
6. **Reports**: Verify admin reports show candidate data

### Test Data
- Use pre-configured test accounts
- Complete interviews to generate test data
- Check admin dashboard for data display

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with both portals
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

## 🔮 Roadmap

### Upcoming Features
- [ ] Video interview support
- [ ] Additional programming languages
- [ ] Advanced AI models integration
- [ ] Mobile app development
- [ ] Integration with popular IDEs
- [ ] Advanced analytics and insights
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Advanced security features

## 📈 Recent Updates

### Version 2.0 - Dual Portal System
- ✅ Separated admin and candidate portals
- ✅ Implemented role-based authentication
- ✅ Added comprehensive AI interaction tracking
- ✅ Created detailed reporting system
- ✅ Integrated AI chat interface
- ✅ Added real-time test execution
- ✅ Implemented progressive hint system
- ✅ Added interview session tracking
- ✅ Created human-readable performance summaries

---

**Built with ❤️ by the CortexCoders Team**