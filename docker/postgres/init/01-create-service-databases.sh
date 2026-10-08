#!/usr/bin/env bash
set -euo pipefail

# Cria um banco lógico com papel (role) e senha próprios para cada
# serviço (ADR 0001: cada microserviço é dono exclusivo do seu banco).
#
# Este script roda apenas na primeira subida do volume do Postgres
# (docker-entrypoint-initdb.d). As senhas chegam por variáveis de
# ambiente do compose, com default em `.env` local - credenciais de
# desenvolvimento, nunca de produção.

create_service_db() {
  local db="$1"
  local user="$2"
  local password="$3"

  # Role de login (idempotente): só cria se ainda não existir.
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=user="$user" \
    --set=password="$password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'user', :'password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'user');
\gexec
SQL

  # Banco lógico com o papel como dono (em PostgreSQL 15+, o dono do
  # banco também é dono do schema public e pode criar as tabelas).
  psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set=db="$db" \
    --set=user="$user" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'db', :'user')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db');
\gexec
SQL
}

create_service_db auth auth "${AUTH_DB_PASSWORD:?AUTH_DB_PASSWORD não definida}"
create_service_db shopping_list shopping_list "${SHOPPING_LIST_DB_PASSWORD:?SHOPPING_LIST_DB_PASSWORD não definida}"
create_service_db price_history price_history "${PRICE_HISTORY_DB_PASSWORD:?PRICE_HISTORY_DB_PASSWORD não definida}"

echo "Bancos lógicos por serviço criados: auth, shopping_list, price_history"
