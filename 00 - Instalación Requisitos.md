# Guía de instalación y dependencias (Frontend y Backend)

Este documento centraliza los requisitos y pasos de instalación de dependencias para el desarrollo y despliegue de los proyectos **Frontend** (Angular) y **Backend** (Node.js/NestJS) del Círculo de Lectura.

---

> Nota: Los requisitos generales, abarcan desde el punto 1 al punto 4. El resto de puntos/dependencias, se aportan a modo de documentación. Ya que realmente vienen ya configuradas (tailwind) o se instalan mediante dependendias en los `package.json` de cada proyecto mediante `npm install`

---

## 1. Requisitos generales

- **Node.js** (recomendado: >= 22.x para frontend, >= 18.x para backend)
- **npm** (recomendado: >= 11.x frontend, >= 9.x backend)
- **Git** (opcional, para clonar repositorios)
- **MySQL** >= 8.x (solo backend) - Instalación independiente ([Enlace web MySQL](https://dev.mysql.com/downloads/windows/installer/8.0.html))

> Nota: Realmente solo se requiere de una instalación de `SQL Server`, pero se recomienda el pack completo (WorkBench, samples&expamples, ...); para complementar con interfaz gráfica sencilla para visualizar directamente la BD sin requerir consultas http via postam-api.

Opcional/recomendado:

- **NVM** (Node Version Manager) para gestionar versiones de Node.js
- **Volta** (alternativa a NVM para gestión de versiones)
- **Docker** (para entornos de desarrollo avanzados) - WIP para despliegue

---

## 2. Instalación de NVM (Node Version Manager)

Permite instalar y alternar entre distintas versiones de Node.js fácilmente.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

> Nota: En Windows, se recomienda usar Git Bash o instalar [nvm-windows](https://github.com/coreybutler/nvm-windows) si se prefiere entorno nativo. Aunque GitBash es la opción ideal; por defecto no procesa ficheros comprimidos y hay que añadir dicha capacidad aparte de la instalación de Git ([Más información en la 1ª respuesta](https://stackoverflow.com/questions/38782928/how-to-add-man-and-zip-to-git-bash-installation-on-windows))

Verifica la instalación:

```bash
command -v nvm
nvm --version
```

---

## 3. Instalación de Node.js y npm (vía NVM)

Consulta versiones disponibles:

```bash
nvm ls-remote
```

Instala la versión recomendada para cada proyecto:

- **Frontend (Angular):**

    ```bash
    nvm install 22
    nvm use 22
    ```

- **Backend (NestJS):**

    ```bash
    nvm install 18
    nvm use 18
    ```

Puedes crear un archivo `.nvmrc` en la raíz de cada proyecto para facilitar la selección automática de versión:

```bash
echo "22" > .nvmrc   # Frontend
echo "18" > .nvmrc   # Backend
```

Verifica versiones:

```bash
node -v
npm -v
```

---

## 4. Instalación de dependencias globales

- **Angular CLI** (solo frontend):

    ```bash
    npm install -g @angular/cli@21
    ```

- **NestJS CLI** (solo backend):

    ```bash
    npm install -g @nestjs/cli
    ```

Verifica instalación:

```bash
ng version    # Angular CLI
nest --version # NestJS CLI
```

---

## 5. Instalación de dependencias del proyecto

En la raíz de cada proyecto (frontend y backend), ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias listadas en el `package.json` correspondiente.

---

## 6. Dependencias adicionales (Frontend)

- **TailwindCSS y DaisyUI** (estilos y componentes):

    ```bash
    npm install tailwindcss @tailwindcss/postcss postcss --force
    npm i -D daisyui@latest
    ```

Requieren de importación/modificación en ficheros especificos:

- [Web de Tailwind con instrucciones para Proyectos Angular](https://tailwindcss.com/docs/installation/framework-guides/angular)
- [Web de DaisyUI con instrucciones para Proeyctos Angular/Tailwind](https://daisyui.com/docs/install/angular/)

---

## 7. Dependencias adicionales (Backend)

- **MySQL** debe estar instalado y en ejecución.
- Configura las variables de entorno en el archivo `.env` según las instrucciones del proyecto backend.

---

## 8. Volta (opcional)

Si prefieres usar Volta para gestionar versiones de Node.js y CLI globales:

```bash
winget install Volta.Volta
```

Consulta la documentación oficial para más detalles: [https://volta.sh/](https://volta.sh/)

---

## Notas Finales

**Recuerda:** Esta guía solo cubre requisitos e instalación de dependencias. Para instrucciones de uso, configuración avanzada o despliegue, consulta los README específicos de cada proyecto.

**Enlaces de interes**:

- [Repositorio Principal](https://github.com/glavadoj01/TrabajoFinGradoDAW) - Documentación
- [Repositorio Frontend](https://github.com/glavadoj01/Circulo_Lectura_Fronted)
- [Repositorio Backend](https://github.com/glavadoj01/BackEnd_Circulo_Lectura)
