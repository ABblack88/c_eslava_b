#!/bin/bash
# Script de construcción para Cloudflare Pages
# Genera el archivo supabase.js inyectando las variables de entorno de forma segura

echo "Generando configuración de Supabase desde plantilla..."

# Verificar si las variables están definidas
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "ADVERTENCIA: Las variables SUPABASE_URL o SUPABASE_ANON_KEY no están configuradas en Cloudflare."
    echo "Si esto es un entorno local, asegúrate de tener el archivo js/config/supabase.js creado manualmente."
    # Si estamos en local y ya existe el archivo, no hacemos nada para no romperlo
    if [ -f "js/config/supabase.js" ]; then
        exit 0
    fi
fi

# Reemplazar placeholders en el archivo template y guardar como el archivo final
sed -e "s|{{SUPABASE_URL}}|$SUPABASE_URL|g" \
    -e "s|{{SUPABASE_ANON_KEY}}|$SUPABASE_ANON_KEY|g" \
    js/config/supabase.template.js > js/config/supabase.js

echo "Configuración generada exitosamente."
