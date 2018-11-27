#!/bin/bash

echo 'Compiling radex/Radex.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths libs -o build --overwrite radex/Radex.sol

echo 'Compiling PRED.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite tokens/PRED.sol

echo 'Compiling FUN.sol into /build'
solc ..=.. --optimize --bin --abi --hashes --allow-paths tokens/libs -o build --overwrite tokens/FUN.sol
