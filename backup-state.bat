@echo off
echo ====================================
echo  RESPALDANDO ESTADO ACTUAL
echo ====================================

set BACKUP_DIR=backups\%date:~10,4%-%date:~4,2%-%date:~7,2%-%time:~0,2%%time:~3,2%%time:~6,2%
mkdir %BACKUP_DIR%

echo [1/4] Respaldando archivos de configuracion...
copy .env* %BACKUP_DIR%\
copy package.json %BACKUP_DIR%\

echo [2/4] Respaldando codigo fuente...
xcopy /E /I /Y src %BACKUP_DIR%\src

echo [3/4] Respaldando build de produccion...
xcopy /E /I /Y build %BACKUP_DIR%\build

echo [4/4] Creando log de cambios...
git log --oneline -10 > %BACKUP_DIR%\recent-commits.txt
git status > %BACKUP_DIR%\git-status.txt

echo ====================================
echo  RESPALDO COMPLETADO EN: %BACKUP_DIR%
echo ====================================
pause
