// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SportToken is ERC20 {
    constructor() ERC20("SportToken", "SPR") {
        _mint(msg.sender, 1000000 * 10 ** decimals()); // 1M tokens
    }
}