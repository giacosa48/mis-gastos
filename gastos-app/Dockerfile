FROM node:20-alpine

WORKDIR /app

# Install server deps
COPY server/package.json server/
RUN cd server && npm install --production

# Install client deps and build
COPY client/package.json client/
RUN cd client && npm install
COPY client/ client/
RUN cd client && npx vite build

# Copy server code
COPY server/ server/

# Expose port
ENV PORT=3001
EXPOSE 3001

# Start
CMD ["node", "server/index.js"]
