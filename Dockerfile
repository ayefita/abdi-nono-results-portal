FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
ENV PORT=43123
ENV HOSTNAME=0.0.0.0
EXPOSE 43123
CMD ["sh", "scripts/docker-entrypoint.sh"]
