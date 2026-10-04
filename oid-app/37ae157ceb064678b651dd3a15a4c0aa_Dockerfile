FROM node:24-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN apk upgrade --no-cache && npm ci

FROM deps AS build
ARG OID_DATA_MODE=controlled-product-staging
ENV OID_DATA_MODE=$OID_DATA_MODE
COPY . .
RUN npx prisma generate && npm run build

FROM build AS migration
ENV NODE_ENV=production
RUN npm prune --omit=dev \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
CMD ["node","node_modules/prisma/build/index.js","migrate","deploy"]

FROM node:24-alpine3.22 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/scripts/azure-identity-bridge.mjs ./scripts/azure-identity-bridge.mjs
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD ["node","-e","fetch('http://127.0.0.1:3000/api/v1/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node","server.js"]
