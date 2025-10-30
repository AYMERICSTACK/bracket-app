@echo off
chcp 65001 >nul
:: ================================
:: 🚀 Script push automatique Git
:: ================================

cd /d "C:\Users\adjeridi\Documents\bracket-app"

echo.
echo 📂 Vérification de l'état du dépôt...
git status

echo.
echo ➕ Ajout de tous les fichiers modifiés...
git add .

set /p MESSAGE=📝 Entrez le message du commit : 

echo.
echo 💾 Commit en cours...
git commit -m "%MESSAGE%"

echo.
echo 🌿 Vérification de la branche actuelle...
git branch

echo.
echo 🚀 Envoi sur GitHub (branche main)...
git push origin main

echo.
echo ✅ Push terminé avec succès !
echo -----------------------------------------
git log --oneline -5
echo -----------------------------------------

pause
