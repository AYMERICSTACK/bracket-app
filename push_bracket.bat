@echo off
:: Passer le terminal en UTF-8
chcp 65001 > nul

:: Messages clairs
echo 📂 Vérification de l'état du dépôt...
git status
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de git status.
    pause
    exit /b
)

echo.
echo ➕ Ajout de tous les fichiers modifiés...
git add .
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de git add.
    pause
    exit /b
)

:: Demander le message du commit
set /p COMMIT_MSG="📝 Entrez le message du commit : "

:: Commit
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo ❌ Erreur lors du commit. Peut-être aucun changement à committer.
)

echo.
echo ⬇️ Pull avec rebase depuis la branche distante...
git pull --rebase
if %errorlevel% neq 0 (
    echo ❌ Erreur lors du pull --rebase.
    pause
    exit /b
)

echo.
echo ⬆️ Push en cours vers la branche actuelle...
git push
if %errorlevel% neq 0 (
    echo ❌ Erreur lors du push.
    pause
    exit /b
)

echo.
echo ✅ Push terminé avec succès !
pause