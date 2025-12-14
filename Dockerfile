# Stage 1: Build
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Production
FROM node:16-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["node", "index.js"]
