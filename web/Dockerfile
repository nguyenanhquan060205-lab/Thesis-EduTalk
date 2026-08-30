FROM node:20-alpine

WORKDIR /app

# Copy dependencies definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Expose port
EXPOSE 3000

# Start app in dev mode
CMD ["npm", "run", "dev"]
