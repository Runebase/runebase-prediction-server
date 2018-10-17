#!/bin/bash

echo 'Compiling RunebasePredictionToken.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite tokens/RunebasePredictionToken.sol

echo 'Compiling FunToken.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite tokens/FunToken.sol

echo 'Compiling runebasedelta.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite exchange/runebasedelta.sol
