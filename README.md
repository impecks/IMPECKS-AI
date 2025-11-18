# IMPECKS-AI - AI-Powered Development Environment

🚀 **World-Class AI Coding Engine** - Transform your development workflow with AI assistance

## Overview

IMPECKS-AI is a next-generation AI-powered development environment that combines the power of VS Code with advanced AI intelligence. Built for Next.js, Electron.js, and AWS serverless development.

## ✨ Key Features

### 🎯 Professional IDE Interface
- **Monaco-Style Editor**: Full VS Code editing experience
- **File Explorer**: Tree navigation with folder/file management
- **Multi-Tab System**: Handle multiple files simultaneously
- **AI Chat Panel**: Real-time AI assistance with GLM 4.6
- **Terminal Interface**: Command execution and output
- **Resizable Panels**: Flexible workspace layout

### 🤖 AI-Powered Development
- **Code Generation**: Intelligent code creation with GLM 4.6
- **Auto-Refactoring**: Smart code optimization and improvements
- **Bug Detection**: AI-assisted debugging and error fixing
- **Performance Optimization**: Automated code enhancement
- **Documentation Generation**: Auto-generate code documentation

### ☁️ Cloud-Native Architecture
- **AWS Serverless**: Deploy to Lambda, API Gateway, DynamoDB
- **S3 Integration**: File storage and backup solutions
- **Real-time Collaboration**: Multi-user workspace support
- **Version Control**: Integrated Git functionality

## 🏗️ Technology Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript 5** for type safety
- **Tailwind CSS 4** with shadcn/ui
- **Framer Motion** for animations
- **React 19** with modern hooks

### Backend
- **z-ai-web-dev-sdk** for GLM 4.6 integration
- **Prisma ORM** with SQLite
- **NextAuth.js** for authentication
- **AWS SDK** for cloud services

### Development Tools
- **ESLint** for code quality
- **Prettier** for code formatting
- **TypeScript** strict mode
- **Hot reload** development

## 💰 Subscription Plans

| Plan | Price | Tokens | Features |
|------|-------|---------|----------|
| **Free** | $0 | 150/day | Educational use, basic features |
| **Basic** | $6/mo | 25K/mo | Personal projects, standard speed |
| **Starter** | $15/mo | 60K/mo | Medium refactors, test automation |
| **Pro** | $25/mo | 150K/mo | Multi-file edits, fast inference ⭐ |
| **Developer** | $50/mo | 400K/mo | Large codebases, batch editing |
| **Team** | $99/mo | 1M/mo | Team collaboration, priority |
| **Enterprise** | $299/mo | 5M/mo | Unlimited concurrency, SLA |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/impecks-ai.git
cd impecks-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. **Set up the database**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create `.env.local` with the following:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
ZAI_API_KEY="your-z-ai-api-key"

# AWS (optional for deployment)
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"

# Payment (optional)
PAYSTACK_SECRET_KEY="your-paystack-secret"
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── ai/           # AI integration endpoints
│   │   ├── auth/         # Authentication
│   │   └── subscription/ # Billing management
│   ├── workspace/         # Main IDE interface
│   └── (auth)/           # Authentication pages
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui components
│   ├── auth/            # Authentication components
│   └── ide/             # IDE-specific components
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
└── types/               # TypeScript definitions
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:push          # Push schema to database
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:reset         # Reset database

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

## 🎯 Core Features

### AI Chat Integration
- Real-time conversation with GLM 4.6
- Code-specific assistance
- Context-aware responses
- Token-based billing

### Code Generation
- Intelligent code creation
- Multi-language support
- Best practices enforcement
- Error handling integration

### Workspace Management
- File tree navigation
- Multi-tab editing
- Real-time collaboration
- Version control integration

### Terminal Interface
- Command execution
- Build process integration
- Deployment automation
- Real-time output

## 🔐 Authentication & Security

- **NextAuth.js** for secure authentication
- **JWT tokens** for session management
- **Role-based access control** (RBAC)
- **Encryption** for sensitive data
- **Rate limiting** for API protection

## 💳 Payment Integration

### Supported Payment Methods
- **Paystack** (Africa - Primary)
- **Google Pay** (Global)
- **Credit/Debit Cards**

### Subscription Management
- Automated billing cycles
- Webhook handling
- Token quota management
- Usage analytics

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### AWS Serverless
```bash
# Configure AWS credentials
aws configure

# Deploy using serverless framework
npm run deploy:aws
```

### Docker
```bash
# Build image
docker build -t impecks-ai .

# Run container
docker run -p 3000:3000 impecks-ai
```

## 📊 Usage Analytics

Track your development productivity:
- Token consumption monitoring
- Code generation statistics
- Performance metrics
- Usage patterns analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Full documentation](https://docs.impecks.ai)
- **Discord Community**: [Join our community](https://discord.gg/impecks)
- **Issues**: [GitHub Issues](https://github.com/your-username/impecks-ai/issues)
- **Email**: support@impecks.ai

## 🎯 Roadmap

### v2.0 (Coming Soon)
- [ ] Electron.js desktop application
- [ ] Advanced collaboration features
- [ ] More AI model options
- [ ] Plugin system
- [ ] Advanced debugging tools

### v1.5 (In Development)
- [ ] Code review AI
- [ ] Automated testing generation
- [ ] Performance profiling
- [ ] Custom themes

## 🏆 Acknowledgments

- **GLM 4.6** for AI model capabilities
- **shadcn/ui** for beautiful UI components
- **Vercel** for hosting platform
- **Next.js** team for the amazing framework

---

**Built with ❤️ by the IMPECKS-AI Team**

*Transform your development workflow with AI-powered assistance*