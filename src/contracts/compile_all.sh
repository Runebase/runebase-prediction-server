#!/bin/bash


echo 'Compiling FunToken.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite tokens/FunToken.sol

echo 'Compiling radex/radex.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths libs -o build --overwrite radex/contracts/Radex.sol

echo 'Compiling RunebasePredictionToken.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite tokens/RunebasePredictionToken.sol
