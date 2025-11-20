# ¿Qué es React?

React es una biblioteca de JavaScript de código abierto utilizada para construir interfaces de usuario (UI), específicamente para aplicaciones de una sola página (Single Page Applications - SPA). Es mantenida por Meta (anteriormente Facebook) y una comunidad de desarrolladores y empresas individuales.

## Características Principales

### 1. Basado en Componentes
React divide la interfaz de usuario en piezas independientes y reutilizables llamadas **componentes**. Cada componente maneja su propio estado y lógica, y pueden ser combinados para crear interfaces complejas.

### 2. JSX (JavaScript XML)
JSX es una extensión de sintaxis para JavaScript que permite escribir código similar a HTML dentro de JavaScript. Hace que el código sea más legible y fácil de entender.

```jsx
const elemento = <h1>Hola, Mundo!</h1>;
```

### 3. Virtual DOM
React mantiene una representación ligera del DOM real en memoria llamada **Virtual DOM**. Cuando el estado de un componente cambia, React actualiza el Virtual DOM y luego compara esta versión con la anterior. Solo los objetos que realmente cambiaron se actualizan en el DOM real, lo que mejora significativamente el rendimiento.

### 4. Flujo de Datos Unidireccional
Los datos en React fluyen en una sola dirección: de padres a hijos. Esto se hace a través de **props** (propiedades). Esto hace que el código sea más predecible y fácil de depurar.

## Conceptos Clave

### Props
Son argumentos que se pasan a los componentes de React. Son inmutables (no se pueden cambiar dentro del componente que las recibe).

### State (Estado)
Es un objeto gestionado dentro del componente (similar a las variables declaradas dentro de una función). A diferencia de las props, el estado puede cambiar a lo largo del tiempo, generalmente en respuesta a acciones del usuario.

### Hooks
Introducidos en React 16.8, permiten usar el estado y otras características de React sin escribir una clase. Los más comunes son:
- `useState`: Para manejar el estado local.
- `useEffect`: Para manejar efectos secundarios (llamadas a API, suscripciones, etc.).

## Ejemplo Simple

```jsx
import React, { useState } from 'react';

function Contador() {
  // Declarar una nueva variable de estado llamada "count"
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Has hecho clic {count} veces</p>
      <button onClick={() => setCount(count + 1)}>
        Haz clic aquí
      </button>
    </div>
  );
}
```

## ¿Por qué usar React?

1.  **Eficiencia:** Gracias al Virtual DOM.
2.  **Flexibilidad:** Se puede usar en una variedad de plataformas (web, móvil con React Native).
3.  **Gran Comunidad:** Existe una inmensa cantidad de recursos, librerías y herramientas disponibles.
4.  **Reutilización de Código:** Los componentes facilitan el mantenimiento y la escalabilidad de las aplicaciones.
