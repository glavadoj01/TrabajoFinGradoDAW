#!/bin/sh
set -e

host="$1"
shift
cmd="$@"

echo "Esperando a MySQL en $host..."

until mysqladmin ping -h "$host" --silent; do
  sleep 1
done

echo "MySQL está listo. Arrancando backend..."
exec $cmd
