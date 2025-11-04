@echo off
REM Script pour push automatique sur la branche mobile-layout-test

REM Ajouter tous les fichiers modifiés
git add .

REM Commit avec message par défaut
git commit -m "Update mobile layout"

REM Passer sur la branche mobile-layout-test
git checkout mobile-layout-test

REM Pull avant de push pour éviter les conflits
git pull origin mobile-layout-test

REM Push sur la branche mobile-layout-test
git push origin mobile-layout-test

echo.
echo ✅ Push automatique terminé sur la branche mobile-layout-test !
pause
