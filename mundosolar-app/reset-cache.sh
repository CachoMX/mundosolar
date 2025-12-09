#!/bin/bash
echo "Limpiando caché de Expo..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*
echo "Caché limpiado. Ahora ejecuta: npm start -- --clear"
