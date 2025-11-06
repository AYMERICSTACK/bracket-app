@echo off
chcp 65001 > nul

git status --porcelain > temp.txt
set /p changes=<temp.txt
del temp.txt

if not "%changes%"=="" (
    echo ⚠️  Vous avez des modifications non commités.
    echo Tapez C pour commit, S pour stash, ou A pour annuler :
    set /p choice="Votre choix : "
    if /I "%choice%"=="C" (
        set /p COMMIT_MSG="📝 Entrez le message du commit : "
        git add .
        git commit -m "%COMMIT_MSG%"
    ) else if /I "%choice%"=="S" (
        git stash
        echo ✅ Modifications stashed.
    ) else (
        echo ❌ Annulé.
        exit /b
    )
)

git checkout mobile-layout-test

set /p COMMIT_MSG="📝 Entrez le message du commit : "
git add .
git commit -m "%COMMIT_MSG%"
git push origin mobile-layout-test

echo ✅ Push terminé sur mobile-layout-test !
pause
