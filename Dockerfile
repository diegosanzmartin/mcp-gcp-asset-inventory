FROM node:18-slim

# Install Google Cloud SDK dependencies
RUN apt-get update && apt-get install -y curl apt-transport-https ca-certificates gnupg lsb-release

# Add Google Cloud SDK distribution URL
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import Google Cloud public key
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Install Google Cloud SDK
RUN apt-get update && apt-get install -y google-cloud-sdk

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Run the server
ENTRYPOINT ["node", "dist/index.js"]