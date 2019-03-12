#!/bin/bash

mkdir -p /root/.runebaseprediction/mainnet/archive
mkdir -p /root/.runebaseprediction/testnet/archive

echo 'Backing up RunebasePrediction DB Mainnet...'
cd /root/.runebaseprediction/mainnet/archive
zip -r "runebasepredictionarchive-$(date +"%Y-%m-%d").zip" /var/lib/docker/volumes/runebaseprediction-server_runebaseprediction-mainnet/_data/.runebaseprediction

echo 'Removing Mainnet archives older than 14 days...'
find /root/.runebaseprediction/mainnet/archive -mindepth 1 -mtime +14 -delete

echo 'Backing up RunebasePrediction DB Testnet...'
cd /root/.runebaseprediction/testnet/archive
zip -r "runebasepredictionarchive-$(date +"%Y-%m-%d").zip" /var/lib/docker/volumes/runebaseprediction-server_runebaseprediction-testnet/_data/.runebaseprediction

echo 'Removing Testnet archives older than 14 days...'
find /root/.runebaseprediction/testnet/archive -mindepth 1 -mtime +14 -delete
