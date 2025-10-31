@echo off
echo 📂 Vérification de l'état du dépôt...
git status
echo.

:ASK
set /p proceed="Voulez-vous ajouter tous les fichiers modifiés et créer un commit ? (O/N) "
if /i "%proceed%"=="O" goto ADD
if /i "%proceed%"=="N" goto END
echo Veuillez répondre O ou N.
goto ASK

:ADD
echo ➕ Ajout de tous les fichiers modifiés...
git add -A

set /p msg="📝 Entrez le message du commit : "
if "%msg%"=="" (
    echo ❌ Message vide, commit annulé.
    goto END
)

git commit -m "%msg%"
git push
echo ✅ Push terminé !
goto END

:END
echo Fin du script.
pause
