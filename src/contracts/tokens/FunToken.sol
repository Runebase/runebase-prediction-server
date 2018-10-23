pragma solidity ^0.4.11;

import "./Token.sol";

contract FunToken is ERC223Token {
  string public name = "Fun Token";
  string public symbol = "FUN";
  uint public decimals = 8;
  uint public INITIAL_SUPPLY = 10000000000000000;

  function FunToken() {
    totalSupply = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
