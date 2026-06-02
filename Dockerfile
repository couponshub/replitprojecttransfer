# Use Node.js as the base image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json files first to install dependencies
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose port 5000 (The port your app uses)
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start"]
