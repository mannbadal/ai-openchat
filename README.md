# AI Chat Application

A modern chat application built with React, Firebase, and OpenAI API integration.

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
cd chat-app
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

## Building for Production

```bash
npm run build
```

## Project Structure

```
chat-app/
├── src/
│   ├── components/
│   │   └── Auth/
│   ├── App.jsx
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
