Deployment guide — Docker + docker-compose

1) Prerequisites (server)
- Ubuntu 22.04 or similar
- Docker & Docker Compose installed
- Domain name pointed to server IP

2) Copy env
```
cp .env.example .env
# edit .env: set JWT_SECRET and any DB creds
```

3) Build and start
```
docker compose up -d --build
```

4) Seed database (once)
```
docker compose exec backend python seed.py
```

5) Obtain TLS (on host) - using certbot with nginx
```
# install certbot and configure certs for your domain
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Notes
- Make sure `DATABASE_URL` in `.env` points to the `db` service (as in .env.example).
- For production consider using managed Postgres and a secrets manager for JWT_SECRET.
- Add backups and monitoring as a next step.
