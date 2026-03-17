---
description: Cómo empaquetar MiConsola usando electron-packager (Método estable alternativo)
---

Si `electron-builder` falla por errores de herramientas nativas (winCodeSign/7zip), usa este flujo que es más ligero y directo:

### 1. Compilar el código frontend y backend
```powershell
npm run build
```

### 2. Generar la carpeta ejecutable portable
```powershell
npx electron-packager . MiConsola --platform=win32 --arch=x64 --out=release-packager --overwrite --ignore="/(src|electron|.vscode|.git|public)"
```

### 3. Comprimir para distribución (Opcional)
```powershell
Compress-Archive -Path ".\release-packager\MiConsola-win32-x64\*" -DestinationPath ".\release-packager\MiConsola_Estable.zip" -Force
```

> [!NOTE]
> Se usa `--ignore` para no incluir el código fuente en el binario final, reduciendo el tamaño y protegiendo la estructura.
