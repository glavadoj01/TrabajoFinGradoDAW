# Descripción de Requerimientos y Procesos

## Relación de Software Utilizado

### 0. Software para diseño previo

- draw.io
- lunacy
- MySQL WorkBench

Más información en el PDF de [Presentación Noviembre](./00%20-%20Presentación%20Noviembre.pdf) - Anteproyecto y Análisis Previo

### 1. Software para desarrollo

#### 1.1 NVM

Gestor de paquetes para instalar versiones NodeJS (incluye npm)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

>Nota:
>Consultar [Instalacion NodeJs mediante NVM.md](./01%20-%20Instalacion%20NodeJS%20mediante%20NVM.md) para mayor información o [Página oficial GitHub NVM](https://github.com/nvm-sh/nvm)

- Verificar con:

    ```bash
    nvm ls
    node -v
    npm -v
    ```

#### 1.2 Angular CLI (front)

```bash
npm install -g @angular/cli
```

- Verificar:

    ```bash
    ng version
    ```

#### 1.3 NestJS CLI (back)

```bash
npm install -g @nestjs/cli
```

- Verificar:

    ```bash
    nest --version
    ```

#### 1.4 Instalar Docker (AppStore)

- Verificar:

    ```bash
    docker --version
    docker-compose --version
    ```

#### 1.5 Volta (si hay problemas con NVM)

Gestor para sincronizar instalaciones locales con instrucciones del proyecto

```bash
winget install Volta.Volta
```

- NVM vs Volta

    Se debe priorizar NVM en 1º lugar respecto a volta, ya que se puede apagar facilmente si se requiere.

    ```bash
    where node
    where npm
    where ng
    where nest
    node -v
    npm -v
    ```

  - Interpretación:
    - Ruta contiene AppData\Local\Volta\bin → Volta está activo.
    - Ruta es C:\Program Files\nodejs\node.exe → suele ser nvm-windows (usa ese directorio como “link” de la versión activa).
    - Ruta a Node en otro sitio (p.ej. Program Files\nodejs sin nvm) → instalación “sistema” de Node.

- Ver PATH del usuario y del sistema por separado:

    ```bash
    [Environment]::GetEnvironmentVariable("Path","User") -split ';'
    [Environment]::GetEnvironmentVariable("Path","Machine") -split ';'
    ```

- Activar/Desactivar NVM:

    ```bash
    nvm off
    nvm on
    ```

- Reinstalar CLI's con Volta:

    ```bash
    volta install @angular/cli
    volta install @nestjs/cli
    ```

#### 1.6 Tailwind's components

- Instalación:

    ```bash
    npm install tailwindcss @tailwindcss/postcss postcss --force
    ```

- Para utilizarlo en el proyecto:

    Tras crear un proyecto con Angular, debemos indicar el uso de Tailwind al mismo.

  - Creación:

    ```bash
    ng new <project-name>
    ```

  - Create a .postcssrc.json file in the root:

    ```json
    {
    "plugins": {
        "@tailwindcss/postcss": {}
        }
    }
    ```

  - Agregar @import en ./src/styles.css

    ```css
    @import "tailwindcss";
    ```

Más información en la web oficial [www.tailwindcss.com](https://tailwindcss.com/docs/installation/framework-guides/angular)

#### 1.7 DaisyUI components

- Install daisyUI as a Node package:

    ```bash
    npm i -D daisyui@latest
    ```

- Add daisyUI to app.css:

    ```css
    @import "tailwindcss";
    @plugin "daisyui";
    ```

## Creación de un sitio estatico a partir del diseño en Lunacy

WIP
