# Alternativa script

- Clonar
- Editar .env's con Password e IP equipo
- Ejecutar "Dar permisos":

  ```bash
  chmod +x deploy.sh
  ```

- Iniciar:

  ```bash
  ./deploy.sh
  ```

# Docker Engine

- Ubuntu/Debian
  `sudo apt install docker.io`

- CentOS/RHEL:
  `sudo yum install docker`

- Arch:
  `sudo pacman -S docker`

Activación del Servicio
`sudo systemctl enable --now docker`

# Docker Compose v2

En la mayoría de distros modernas ya viene integrado en Docker como:
`docker compose`

Si no, instalar:
`sudo apt install docker-compose-plugin`

# Editar Variables

- .env Raiz para docker/SQL
- .env Backend

Ambos deben tener la misma contraseña para la BD de forma independiente.

# Arranque

```bash
docker compose build
docker compose up -d
```

# Verificaciones

## Ver MySQL

```bash
docker logs mysql_server
```

## Ver backend

```bash
docker logs backend_server
```

Respuesta apróx.:

```bash
MySQL está listo. Arrancando backend...
Servidor escuchando en puerto 3000
```

## Ver frontend

```bash
http://IP_DE_LA_VM:4200
```

## ¿Cómo parar todo?

```bash
docker compose down
```

## ¿Cómo reiniciar solo el backend?

```bash
docker compose build backend
docker compose up -d backend
```

## ¿Cómo actualizar código sin reconstruir todo?

- Back:

```bash
docker compose build backend
docker compose up -d backend
```

- Frontend:

```bash
docker compose build frontend
docker compose up -d frontend
```

# Apagar

```bash
docker compose down
```

# Apagar con borrado

```bash
docker compose down -v
```
