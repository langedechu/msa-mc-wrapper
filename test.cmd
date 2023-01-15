@echo off

@REM if node_modules does not exist, run npm install

if not exist node_modules (
    npm install
)

@REM if index.js does not exist, run npm run build

if not exist index.js (
    npm run build
)

@REM run the program

node test
