FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
# argon2 has a native module. Keep its compiler toolchain only in this build stage.
RUN apk add --no-cache python3 make g++ \
  && npm ci --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json index.html ./
COPY src ./src
COPY server ./server
USER node
EXPOSE 4174
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:4174/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/start.js"]
