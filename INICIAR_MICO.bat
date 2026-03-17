@echo off
title MiConsola - Produccion
cd /d "%~dp0"
echo [MICO] Iniciando MiConsola en modo produccion...
.\node_modules\.bin\electron .
