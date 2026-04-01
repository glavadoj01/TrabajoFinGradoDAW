# Guía de instalación y dependencias (Frontend y Backend)

Este documento centraliza los requisitos y pasos de instalación de dependencias para el desarrollo y despliegue de los proyectos **Frontend** (Angular) y **Backend** (Node.js/NestJS) del Círculo de Lectura.

---

> Nota: Los requisitos generales, abarcan desde el punto 1 al punto 4. El resto de puntos/dependencias, se aportan a modo de documentación. Ya que realmente vienen ya configuradas (tailwind) o se instalan mediante dependendias en los `package.json` de cada proyecto mediante `npm install`

---

## 1. Requisitos generales

- **npm** recomendado: >= 11.6.x
- **Node.js** recomendado: >= 22.21.x
- **Git** (opcional, para clonar repositorios)
- **MySQL** >= 8.x (solo backend) - Instalación independiente ([Enlace web MySQL](https://dev.mysql.com/downloads/windows/installer/8.0.html))

> Nota: Realmente solo se requiere de una instalación de `SQL Server`, pero se recomienda el pack completo (WorkBench, samples&expamples, ...); para complementar con interfaz gráfica sencilla para visualizar directamente la BD sin requerir consultas http via postam-api.

Opcional/recomendado:

- **NVM** (Node Version Manager) para gestionar versiones de Node.js (más orientado a UNIX/Linux -> cmd/powerShell no lo detectan, requiere GitBash)
- **Volta** Alternativa especifica para Windows a NVM (para gestión de versiones -> Funciona en cmd/powerShell/GitBash)
- **Docker** (para entornos de desarrollo avanzados) - WIP para despliegue
- **GitBash** Terminal nativa/incluida con Git

---

## 2. Instalacción de **Gestor node**

### 2.1. Volta (Versión/Método Utilizado)

Para usar Volta para gestionar versiones de Node.js y CLI globales:

```bash
winget install Volta.Volta
```

Verifica la instalación:

```bash
volta --version
```

>Nota: Consulta la documentación oficial para más detalles: [https://volta.sh/](https://volta.sh/)

### 2.2. Instalación de NVM (Alternativa)

Para usar NVM para gestionar versiones de Node.js y CLI globales.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

> Nota: En Windows, se recomienda usar Git Bash o instalar [nvm-windows](https://github.com/coreybutler/nvm-windows) si se prefiere entorno nativo. Aunque GitBash es la opción ideal; por defecto no procesa ficheros comprimidos y hay que añadir dicha capacidad aparte de la instalación de Git ([Más información en la 1ª respuesta](https://stackoverflow.com/questions/38782928/how-to-add-man-and-zip-to-git-bash-installation-on-windows))

Verifica la instalación:

```bash
nvm --version
```

---

## 3. Instalación de Node.js y npm

### 3.1. Vía Volta (Opción Utilizada)

Instalar la versión recomendada:

```bash
volta install node@22
```

En cada proyecto, aseguramos el uso de node@22 (vía entrada en `package.json`) ejecutando:

```bash
volta pin node@22 # En el directorio raiz de cada proyecto
```

### 3.2. Vía NVM

Instala la versión recomendada:

```bash
nvm install 22
nvm use 22
```

Puedes crear un archivo `.nvmrc` en la raíz de cada proyecto para facilitar la selección automática de versión:

```bash
echo "22" > .nvmrc   # En directorio raíz del Frontend
echo "22" > .nvmrc   # En directorio raíz del Backend
```

### 3.3. Verificar versiones

```bash
node -v
npm -v
```

---

## 4. Instalación de dependencias globales

### 4.1. Utilizando Volta (Opción Utiliada)

- **Angular CLI** (solo frontend):

    ```bash
    volta install @angular/cli@21 # Instalación Global
    ```

- **NestJS CLI** (solo backend):

    ```bash
    volta install @nestjs/cli # Instalación Global
    ```

### 4.2. Utilizando NVM/NPM

- **Angular CLI** (solo frontend):

    ```bash
    npm install -g @angular/cli@21
    ```

- **NestJS CLI** (solo backend):

    ```bash
    npm install -g @nestjs/cli
    ```

### 4.3. Verificar instalación

```bash
ng version    # Angular CLI
nest --version # NestJS CLI
```

---

## 5. Instalación de dependencias del proyecto

En la raíz de cada proyecto (frontend y backend), ejecutar:

```bash
npm install
```

Esto instalará todas las dependencias listadas en el `package.json` correspondiente.

---

## 6. Dependencias adicionales (Frontend)

>Nota: A modo de documentación, ya que se incluyen en el package.json y se instalan con `npm i`

- **TailwindCSS y DaisyUI** (estilos y componentes):

    ```bash
    npm install tailwindcss @tailwindcss/postcss postcss --force
    npm i -D daisyui@latest
    ```

    Requieren ademas de importación/modificación en ficheros especificos:

    - [Web de Tailwind con instrucciones para Proyectos Angular](https://tailwindcss.com/docs/installation/framework-guides/angular)
    - [Web de DaisyUI con instrucciones para Proeyctos Angular/Tailwind](https://daisyui.com/docs/install/angular/)

- Configurar (si procede) y renombrar el fichero `_environments.ts` con las instrucciones que contiene.
---

## 7. Dependencias adicionales (Backend)

- **MySQL** debe estar instalado y en ejecución.
- Configura las variables de entorno en el archivo `_.env` y renombrar el fichero según las instrucciones del proyecto backend (ReadMe y propio fichero `_.env`).

---

## Notas Finales

**Recuerda:** Esta guía solo cubre requisitos e instalación de dependencias. Para instrucciones de uso, configuración avanzada o despliegue, consulta los README específicos de cada proyecto.

**Enlaces de interes**:

- [Repositorio Principal](https://github.com/glavadoj01/TrabajoFinGradoDAW) - Documentación
- [Repositorio Frontend](https://github.com/glavadoj01/Circulo_Lectura_Fronted)
- [Repositorio Backend](https://github.com/glavadoj01/BackEnd_Circulo_Lectura)
