#!/bin/bash
# Reinstall node_modules from scratch
rm -rf node_modules
rm -f package-lock.json
npm install
