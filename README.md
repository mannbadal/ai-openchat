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

## Environment Variables

Create a `.env` file in the root directory with the following variables:

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
VITE_OPENAI_BACKEND_URL=your_backend_url (Only required if using other than OpenAI)
```

## Setup & Installation

1. Clone the repository

```bash
git clone <repository-url>
cd ai-openchat
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

- Create a `.env` file
- Add the required environment variables as shown above

4. Start the development server

```bash
npm run dev
```

## Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication and Firestore in your project
3. Make sure that your domain name or local IP address is added to authorised domain in Firebase Authentication.
4. Get your Firebase configuration from Project Settings > General > Your Apps
5. Set up Firestore Security Rules in Firebase Console:

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

These security rules ensure that:

- Users can only access their own data
- Each user has their own isolated chat space
- Messages are protected and private to the user

## Building for Production

```bash
npm run build
```

## Running with Docker

Then run the following commands:

```bash
# Run Docker container with environment variables passed inline
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
  -p 3000:3000 ghcr.io/mannbadal/ai-openchat:latest
```

You can also use Docker Compose.

```yaml
services:
  ai-openchat:
    image: ghcr.io/mannbadal/ai-openchat:latest
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
