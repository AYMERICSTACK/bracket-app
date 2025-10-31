@echo off
:: Passer le terminal en UTF-8
chcp 65001 > nul

:: Messages clairs
echo 📂 Vérification de l'état du dépôt...
git status

echo.
echo ➕ Ajout de tous les fichiers modifiés...
git add .

:: Demander le message du commit
set /p COMMIT_MSG="📝 Entrez le message du commit : "

:: Commit
git commit -m "%COMMIT_MSG%"

:: Push
echo.
echo ⬆️ Push en cours...
git push origin main

echo.
echo ✅ Push terminé !
pause
