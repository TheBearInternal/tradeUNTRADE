FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["npm", "run", "dev"]
