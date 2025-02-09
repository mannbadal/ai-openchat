FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

ARG PORT=3000
ENV PORT=$PORT

EXPOSE $PORT

# Copy the entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Use the entrypoint script, then start the preview service
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "preview"]