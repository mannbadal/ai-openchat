FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build the app
RUN npm run build

# Create env.js that will be populated at runtime
RUN echo "window.env = {};" > dist/env.js

# Add script to populate env.js at container start
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'env | grep VITE_ | while read -r line; do' >> /docker-entrypoint.sh && \
    echo '  key=$(echo "$line" | cut -d "=" -f1)' >> /docker-entrypoint.sh && \
    echo '  value=$(echo "$line" | cut -d "=" -f2-)' >> /docker-entrypoint.sh && \
    echo '  echo "window.env[\"$key\"] = \"$value\";" >> /app/dist/env.js' >> /docker-entrypoint.sh && \
    echo 'done' >> /docker-entrypoint.sh && \
    echo 'npm run preview' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]