#!/bin/bash
cd "$(dirname "$0")"
echo "Iniciando Imagen Cosmetics, un momento..."
(sleep 2 && open http://localhost:3000) &
npm start
