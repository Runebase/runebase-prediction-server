pragma solidity ^0.4.11;

import "./Token.sol";

contract RunebasePredictionToken is ERC223Token {
  string public name = "Runebase Prediction";
  string public symbol = "PRED";
  uint public decimals = 8;
  uint public INITIAL_SUPPLY = 10000000000000000;

  function RunebasePredictionToken() {
    totalSupply = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
