FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
RUN mkdir -p /app/data /app/.local /app/site && chown -R node:node /app/data /app/.local /app/site
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4180 DATABASE_PATH=/app/data/velcodes.sqlite SITE_DIRECTORY=/app/site
EXPOSE 4180
CMD ["node", "server/index.mjs"]
