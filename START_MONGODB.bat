@echo off
REM MongoDB Startup Script for Windows
REM This script will start MongoDB on your system

cls
echo.
echo ====================================================
echo           MongoDB Startup Script
echo ====================================================
echo.

REM Try to find MongoDB installation
echo Searching for MongoDB installation...
echo.

REM Common MongoDB paths
set "MONGO_PATH1=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
set "MONGO_PATH2=C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
set "MONGO_PATH3=C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe"
set "MONGO_PATH4=C:\mongodb\bin\mongod.exe"

REM Create data directory if it doesn't exist
if not exist "C:\data\db" (
    echo Creating data directory...
    mkdir C:\data\db
)

REM Try each path
if exist "%MONGO_PATH1%" (
    echo Found MongoDB v7.0
    echo Starting MongoDB...
    echo.
    "%MONGO_PATH1%" --dbpath="C:\data\db"
    goto :end
)

if exist "%MONGO_PATH2%" (
    echo Found MongoDB v6.0
    echo Starting MongoDB...
    echo.
    "%MONGO_PATH2%" --dbpath="C:\data\db"
    goto :end
)

if exist "%MONGO_PATH3%" (
    echo Found MongoDB v5.0
    echo Starting MongoDB...
    echo.
    "%MONGO_PATH3%" --dbpath="C:\data\db"
    goto :end
)

if exist "%MONGO_PATH4%" (
    echo Found MongoDB in custom location
    echo Starting MongoDB...
    echo.
    "%MONGO_PATH4%" --dbpath="C:\data\db"
    goto :end
)

REM If not found, show instructions
echo.
echo ====================================================
echo MongoDB Not Found!
echo ====================================================
echo.
echo Please install MongoDB from:
echo https://www.mongodb.com/try/download/community
echo.
echo Installation Steps:
echo 1. Download the MSI installer
echo 2. Run the installer and follow the prompts
echo 3. During installation, select "Install MongoDB as a Service"
echo 4. Once installed, run this script again
echo.

:end
pause
