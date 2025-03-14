// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BookingManager {
    IERC20 public sportToken;
    uint public slotPrice;

    struct Slot {
        uint timestamp;
        address bookedBy;
        bool isBooked;
    }

    mapping(string => Slot) public slots;

    constructor(address _sportToken) {
        sportToken = IERC20(_sportToken);
    }

    function setSlotPrice(uint _price) public {
        slotPrice = _price;
    }

    function reserveSlot(string memory _slotId) public {
        require(!slots[_slotId].isBooked, "Slot already booked");
        require(sportToken.transferFrom(msg.sender, address(this), slotPrice), "Payment failed");
        slots[_slotId].isBooked = true;
        slots[_slotId].bookedBy = msg.sender;
        slots[_slotId].timestamp = block.timestamp;
    }

    function checkAvailability(string memory _slotId) public view returns (bool) {
        return !slots[_slotId].isBooked;
    }
}