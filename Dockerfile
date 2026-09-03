ARG NODE_VERSION=24.16.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy project source files with node ownership
COPY --chown=node:node . .

# Ensure logs directory exists and set proper permissions
RUN mkdir -p src/logs && chown -R node:node /usr/src/app

# Run the application as a non-root user
USER node

# Expose the application port
EXPOSE 3610

# Start application
CMD ["npm", "start"]

