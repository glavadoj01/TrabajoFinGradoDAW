# Relación de Software Utilizado

## 0. Software para diseño

- draw.io
- lunacy
- MySQL WorkBench

## 1. Software para desarrollo

- NVM:
    Gestor de paquetes para instalar versiones NodeJS (incluye npm)

    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```

    Nota:
    Consultar [01 - Instalacion NodeJs mediante NVM.md](./01%20-%20Instalacion%20NodeJS%20mediante%20NVM.md) para mayor información o [Página oficial GitHub NVM](https://github.com/nvm-sh/nvm)

  - Verificar con:

    ```bash
    nvm ls
    node -v
    npm -v
    ```

- Instalar Angular CLI globalmente (front):

    ```bash
    npm install -g @angular/cli
    ```

  - Verificar:

    ```bash
    ng version
    ```

- Instalar NestJS CLI globalmente (back):

    ```bash
    npm install -g @nestjs/cli
    ```

  - Verificar:

    ```bash
    nest --version
    ```

- Instalar Docker (AppStore):

    Confirmar que Docker funciona:

    ```bash
    docker --version
    docker-compose --version
    ```

- Instalar Volta:

    Gestor para sincronizar instalaciones locales con instrucciones del proyecto

    ```bash
        winget install Volta.Volta
    ```
