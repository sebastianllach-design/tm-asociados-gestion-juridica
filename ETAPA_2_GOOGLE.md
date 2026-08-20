# Etapa 2 · Google Drive + Sheets

Este archivo documenta el próximo paso, que **todavía no debe ejecutarse**.

Arquitectura prevista:

Render
  -> Google OAuth
  -> Google Apps Script / APIs
      -> Google Sheets
      -> Google Drive

## Drive

Carpeta raíz propuesta:

TM & ASOCIADOS - GESTION JURIDICA
  /CLIENTES
    /CL-...
      /CASOS
        /CAS-...
          /ACTUACIONES
            /A-...

Cada documento se guardará en Drive y el tablero conservará su `fileId` y URL.

## Sheets

Libro maestro:

TM & ASOCIADOS - BASE DE GESTION

Pestañas:
- CLIENTES
- CASOS
- ACTUACIONES
- TAREAS
- DOCUMENTOS
- HONORARIOS

No crear todavía estas estructuras hasta validar la versión publicada en Render.
