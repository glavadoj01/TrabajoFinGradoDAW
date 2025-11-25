# Instalación de NodeJs, mediante el gestor de paquetes NVM

## 1. Instalación de NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

> Nota:
>
> Requiere de GitBash con capacidad de procesar .zip/.rar
> Más información en [Página oficial GitHub NVM](https://github.com/nvm-sh/nvm)

- Verificación:

    ```bash
    command -v nvm
    ```

    Respuesta:

    ```bash
    nvm
    ```

## 2. Consulta Instalaciones Locales/Disponibles

- Locales:

    ```bash
    nvm ls
    ```

- Disponibles:

    ```bash
    nvm ls-remote
    ```

## 3. Instalar versión

- Instalación:

    ```bash
    nvm install <versión>
    ```

    Ej:

    > ```bash
    > nvm install 22
    > ```

- Usar (Ahora)

    ```bash
    nvm use <versión>
    ```

- Alias y Por defecto:

    La sentencia sería:

    ```bash
    nvm alias <nombre> <versión>
    ```

    Con el alias reservado "default":

    ```bash
    nvm alias default <versión>
    ```

    > Nota:
    >
    > Al menos, en la 1ª instalación. Se suele crear el alias reservado "default" para esa versión.

## 4. Verificar NodeJS y npm

```bash
node -v
npm -v
```

## 5. Para un proyecto Individual

Por proyecto → Crear fichero: .nvmrc + Comando: nvm use

- Crear fichero en directorio raiz del proyecto

    ```bash
    echo "22" > .nvmrc
    ```
