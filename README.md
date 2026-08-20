# TM & Asociados · Etapa 1 Render

Primera etapa del tablero de gestión jurídica.

## Qué incluye

- Centro de control.
- Cartera de casos editable.
- Cartera de clientes editable.
- Caso 360°.
- Estado, prioridad y riesgo editables.
- Actuaciones y línea de tiempo.
- Adjuntos por actuación.
- Tareas y agenda.
- Honorarios.
- Indicadores.
- Diseño responsive.

## Persistencia en esta etapa

Los datos se guardan temporalmente en el navegador:

- datos estructurados: `localStorage`;
- archivos de prueba: `IndexedDB`.

Esto permite probar el funcionamiento en Render, pero **NO sincroniza dispositivos**.

No cargar documentación jurídica real todavía.

## Etapa 2

La siguiente etapa reemplazará la capa local por:

- Google Sheets para los datos estructurados;
- Google Drive para los archivos;
- Google OAuth para el acceso;
- Apps Script / Google APIs como capa de integración.

La interfaz no necesitará rediseñarse.

## Publicación

Este proyecto es un sitio estático. Subir la carpeta a GitHub y conectar el repositorio a Render.

`render.yaml` ya está incluido.
