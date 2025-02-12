[![GitHub release (latest by date)](https://img.shields.io/github/v/release/mannbadal/ai-openchat)](https://github.com/mannbadal/ai-openchat/releases)
[![GitHub issues](https://img.shields.io/github/issues/mannbadal/ai-openchat)](https://github.com/mannbadal/ai-openchat/issues)
[![GitHub stars](https://img.shields.io/github/stars/mannbadal/ai-openchat)](https://github.com/mannbadal/ai-openchat/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# AI Chat Application

A modern chat application built with React, Firebase, and OpenAI API integration.

![image](https://github.com/user-attachments/assets/b21ff3fe-d202-42e2-ab79-c43aff8cf03d)

![image](https://github.com/user-attachments/assets/1ac20c53-2cd5-49be-8bef-8dde2c3d66db)

## Features

- Real-time chat interface
- Code syntax highlighting
- Markdown support
- Chat history management
- User authentication (Sign up, Sign in, Password reset)
- Responsive design for mobile and desktop
- Message streaming
- Conversation management

## Technologies Used

- React + Vite
- Firebase (Authentication & Firestore)
- OpenAI API
- React Router
- Markdown-to-JSX
- Syntax Highlighter

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Firebase account
- OpenAI API key

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/mannbadal/ai-openchat.git

# Navigate to project directory
cd ai-openchat

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory with the following configuration:

```properties
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_OPENAI_BACKEND_URL=your_backend_url
```

### 3. Firebase Configuration

1. Create a new project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** and **Firestore** services
3. Add your domain/localhost to authorized domains in Authentication settings
4. Set up Firestore security rules:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticatedUser(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId} {
      allow read, write: if isAuthenticatedUser(userId);
      match /chats/{chatId} {
        allow read, write: if isAuthenticatedUser(userId);
        match /messages/{messageId} {
          allow read, write: if isAuthenticatedUser(userId);
        }
      }
    }
  }
}
```

### 4. Launch Application

```bash
# Start development server
npm run dev

# Or build for production
npm run build
```

### Docker Deployment (Optional)

Run using Docker:

```bash
# Build the Docker image
docker build -t ai-openchat .

# Run the container using the built image
docker run \
  -e VITE_FIREBASE_API_KEY=your_api_key \
  -e VITE_FIREBASE_AUTH_DOMAIN=your_api_domain \
  -e VITE_FIREBASE_PROJECT_ID=your_project_id \
  -e VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket \
  -e VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id \
  -e VITE_FIREBASE_APP_ID=your_app_id \
  -e VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id \
  -e VITE_OPENAI_API_KEY=your_openai_api_key \
  -e VITE_OPENAI_BACKEND_URL=your_backend_url \
  -p 3000:3000 ai-openchat
```

Or use Docker Compose:

```yaml
services:
  ai-openchat:
    build: .
    image: ai-openchat
    environment:
      - VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY}
      - VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN}
      - VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID}
      - VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET}
      - VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID}
      - VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID}
      - VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID}
      - VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}
      - VITE_OPENAI_BACKEND_URL=${VITE_OPENAI_BACKEND_URL}
    ports:
      - "3000:3000"
```

## Project Structure

```
ai-openchat/
├── src/
│   ├── components/
│   │   └── Auth/
│   │   └── ChatMessage.jsx
│   │   └── CodeBlock.jsx
│   │   └── Sidebar.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── ChatApp.jsx
│   ├── firebase.js
│   └── main.jsx
├── public/
├── .env
└── package.json
```

## Security Notes

- Never commit your `.env` file
- Implement proper security rules in Firebase
- Use environment variables for sensitive information

## License

MIT
