const express = require('express');
const Web3 = require('web3');
const app = express();

const courtStatus = {
    Aqua: {},
    Green: {},
    Blue: {},
    Red: {},
    Yellow: {}
};

const web3 = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');
const privateKey = '0xfa7735300ede56d194a07efd3cf08785280ccb3dd92419550f94ead3840e0b69';
web3.eth.accounts.wallet.add(privateKey);

// Έλεγχος σύνδεσης στο δίκτυο
web3.eth.net.isListening()
    .then(() => console.log('Successfully connected to BSC Testnet'))
    .catch(err => console.error('Failed to connect to BSC Testnet:', err));

const contractAddress = '0x800142ffBB4cB35a958911f64304f35E124EEEB5';
const sportTokenAddress = '0xC5e021f68697E15caE637E12CAAE2fEf6229289C';
const contractABI = [
    {
        "inputs": [{"internalType": "address", "name": "_sportToken", "type": "address"}],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [{"internalType": "string", "name": "_slotId", "type": "string"}],
        "name": "checkAvailability",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_slotId", "type": "string"}],
        "name": "reserveSlot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "_price", "type": "uint256"}],
        "name": "setSlotPrice",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "slotPrice",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "", "type": "string"}],
        "name": "slots",
        "outputs": [
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "address", "name": "bookedBy", "type": "address"},
            {"internalType": "bool", "name": "isBooked", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "sportToken",
        "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_slotId", "type": "string"}],
        "name": "cancelSlot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_oldSlotId", "type": "string"}, {"internalType": "string", "name": "_newSlotId", "type": "string"}],
        "name": "modifySlot",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Ενημερωμένο sportTokenABI (τυπικό ERC-20 ABI)
const sportTokenABI = [
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_from", "type": "address"},
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transferFrom",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "transfer",
        "outputs": [{"name": "success", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {"name": "_owner", "type": "address"},
            {"name": "_spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"name": "remaining", "type": "uint256"}],
        "type": "function"
    }
];

const contract = new web3.eth.Contract(contractABI, contractAddress);
const sportToken = new web3.eth.Contract(sportTokenABI, sportTokenAddress);

// Έλεγχος αν το contract αρχικοποιήθηκε σωστά
console.log('Contract methods available:', contract.methods ? Object.keys(contract.methods) : 'No methods available');

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

function normalizeSlotId(input) {
    const parts = input.split('-');
    if (parts.length !== 3) return input;

    const court = parts[0];
    let startTime = parts[1];
    let endTime = parts[2];

    const timeFormat = (time) => {
        const [hours, minutes] = time.split(':');
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    };

    startTime = timeFormat(startTime);
    endTime = timeFormat(endTime);

    return `${court}-${startTime}-${endTime}`;
}

function isValidSlotId(slotId) {
    const parts = slotId.split('-');
    if (parts.length !== 3) return false;

    const court = parts[0];
    const startTime = parts[1];
    const endTime = parts[2];

    if (!['Aqua', 'Green', 'Blue', 'Red', 'Yellow'].includes(court)) return false;

    const timeFormat = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeFormat.test(startTime) || !timeFormat.test(endTime)) return false;

    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    const duration = endMinutes - startMinutes;

    return duration === 60 || duration === 90;
}

function getDurationFromSlotId(slotId) {
    const parts = slotId.split('-');
    if (parts.length !== 3) return 60;

    const startTime = parts[1];
    const endTime = parts[2];

    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    return endMinutes - startMinutes;
}

function convertTo24Hour(time) {
    const timeMatch = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!timeMatch) {
        throw new Error("Invalid time format. Use 24-hour format (e.g., 14:00) or 12-hour format (e.g., 2 pm).");
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (minutes >= 60) {
        throw new Error("Invalid minutes. Minutes should be between 0 and 59.");
    }

    if (period) {
        if (hours < 1 || hours > 12) {
            throw new Error("Invalid hour in 12-hour format. Hours should be between 1 and 12 with AM/PM.");
        }
        if (period === 'pm' && hours !== 12) {
            hours += 12;
        } else if (period === 'am' && hours === 12) {
            hours = 0;
        }
    } else {
        if (hours < 0 || hours > 23) {
            throw new Error("Invalid hour in 24-hour format. Hours should be between 0 and 23.");
        }
    }

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Συνάρτηση για τη μετατροπή ώρας σε λεπτά από τα μεσάνυχτα
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

async function initializeCourtStatus() {
    console.log('Starting court status initialization...');
    const courtsList = ['Aqua', 'Green', 'Blue', 'Red', 'Yellow'];
    const startHour = 7;
    const endHour = 23;
    for (const court of courtsList) {
        courtStatus[court] = {};
        for (let hour = startHour; hour <= endHour; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const sixtyMinEnd = `${(hour + 1).toString().padStart(2, '0')}:00`;
            const ninetyMinEnd = `${(hour + 1).toString().padStart(2, '0')}:30`;
            const sixtyMinSlot = `${court}-${startTime}-${sixtyMinEnd}`;
            const ninetyMinSlot = `${court}-${startTime}-${ninetyMinEnd}`;
            try {
                if (!contract.methods || !contract.methods.slots) {
                    console.error('Contract methods object is invalid or slots function is missing');
                    throw new Error('Invalid contract configuration');
                }
                const sixtyMinStatus = await contract.methods.slots(sixtyMinSlot).call();
                const ninetyMinStatus = await contract.methods.slots(ninetyMinSlot).call();
                courtStatus[court][sixtyMinSlot] = { bookedBy: sixtyMinStatus.bookedBy || '0x0000000000000000000000000000000000000000', isBooked: sixtyMinStatus.isBooked };
                courtStatus[court][ninetyMinSlot] = { bookedBy: ninetyMinStatus.bookedBy || '0x0000000000000000000000000000000000000000', isBooked: ninetyMinStatus.isBooked };
                console.log(`Initialized ${sixtyMinSlot}: bookedBy=${courtStatus[court][sixtyMinSlot].bookedBy}, isBooked=${courtStatus[court][sixtyMinSlot].isBooked}`);
                console.log(`Initialized ${ninetyMinSlot}: bookedBy=${courtStatus[court][ninetyMinSlot].bookedBy}, isBooked=${courtStatus[court][ninetyMinSlot].isBooked}`);
            } catch (error) {
                console.error(`Error initializing slot ${sixtyMinSlot} or ${ninetyMinSlot}:`, error.message);
            }
        }
    }
    console.log('Court status initialization completed.');
}

async function updateCourtStatus(slotId, bookedBy) {
    try {
        const slot = await contract.methods.slots(slotId).call();
        const court = slotId.split('-')[0];
        courtStatus[court][slotId] = { 
            bookedBy: bookedBy !== null ? bookedBy : slot.bookedBy || '0x0000000000000000000000000000000000000000', 
            isBooked: bookedBy !== null ? true : slot.isBooked 
        };
        console.log(`Updated court status for ${slotId}: bookedBy=${courtStatus[court][slotId].bookedBy}, isBooked=${courtStatus[court][slotId].isBooked}`);
    } catch (error) {
        console.error(`Error updating court status for ${slotId}:`, error.message);
    }
}

const courts = { en: ['Aqua', 'Green', 'Blue', 'Red', 'Yellow'], gr: ['Aqua', 'Green', 'Blue', 'Red', 'Yellow'] };
const intents = {
    en: {
        checkAvailability: ['check', 'availability', 'available', 'free'],
        bookCourt: ['book', 'reserve', 'schedule'],
        cancelCourt: ['cancel', 'delete', 'remove'],
        modifyCourt: ['modify', 'change', 'update']
    },
    gr: {
        checkAvailability: ['διαθεσιμότητα', 'ελεύθερο', 'διαθέσιμο'],
        bookCourt: ['κράτηση', 'κλείσιμο', 'προγραμματισμός'],
        cancelCourt: ['ακύρωση', 'διαγραφή', 'αφαίρεση'],
        modifyCourt: ['τροποποίηση', 'αλλαγή', 'ενημέρωση']
    }
};
const timePatterns = {
    en: {
        morning: ['morning'],
        afternoon: ['afternoon'],
        evening: ['evening']
    },
    gr: {
        morning: ['πρωί'],
        afternoon: ['απόγευμα'],
        evening: ['βράδυ']
    }
};
const messages = {
    en: {
        help: "Please specify if you want to check availability, book a court, cancel a booking, or modify a booking.",
        noSlots: "No available slots found.",
        successBook: "Successfully booked court {slotId}.",
        successCancel: "Successfully cancelled court {slotId}. You have been refunded {amount} SPR.",
        successModify: "Successfully modified booking from {oldSlotId} to {newSlotId}. {chargeMessage}",
        noBooking: "No booking found for {slotId} or you are not the owner.",
        invalidTime: "Booking time is outside the allowed range (07:00-22:30 for 60 minutes, 07:00-22:00 for 90 minutes).",
        gapTooSmall: "Cannot book this slot. The gap between consecutive bookings must be greater than 30 minutes.",
        durationNotAllowed: "Cannot book a 90-minute slot when the gap is exactly 60 minutes."
    },
    gr: {
        help: "Παρακαλώ διευκρινίστε αν θέλετε να ελέγξετε τη διαθεσιμότητα, να κλείσετε ένα γήπεδο, να ακυρώσετε μια κράτηση ή να τροποποιήσετε μια κράτηση.",
        noSlots: "Δεν βρέθηκαν διαθέσιμες ώρες.",
        successBook: "Επιτυχής κράτηση του γηπέδου {slotId}.",
        successCancel: "Επιτυχής ακύρωση του γηπέδου {slotId}. Σας επιστράφηκαν {amount} SPR.",
        successModify: "Επιτυχής τροποποίηση της κράτησης από {oldSlotId} σε {newSlotId}. {chargeMessage}",
        noBooking: "Δεν βρέθηκε κράτηση για το {slotId} ή δεν είστε ο κάτοχος.",
        invalidTime: "Η ώρα κράτησης είναι εκτός του επιτρεπόμενου εύρους (07:00-22:30 για 60 λεπτά, 07:00-22:00 για 90 λεπτά).",
        gapTooSmall: "Δεν μπορεί να γίνει κράτηση. Το κενό μεταξύ διαδοχικών κρατήσεων πρέπει να είναι μεγαλύτερο από 30 λεπτά.",
        durationNotAllowed: "Δεν επιτρέπεται κράτηση 90 λεπτών όταν το κενό είναι ακριβώς 60 λεπτά."
    }
};

const PRICE_PER_60_MIN = web3.utils.toWei('40', 'ether');
const PRICE_PER_90_MIN = web3.utils.toWei('60', 'ether');

const server = app.listen(3000, () => {
    console.log('Server running on port 3000');
    initializeCourtStatus().then(() => {
        console.log('Court status initialized and synced with blockchain');
    }).catch((error) => {
        console.error('Error initializing court status:', error);
    });
});

process.on('SIGINT', (signal) => {
    console.log(`Received ${signal}. Attempting to close server...`);
    server.close((err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
        }
        console.log('Server closed successfully. Exiting process...');
        process.exit(0);
    });
});

process.on('SIGTERM', (signal) => {
    console.log(`Received ${signal}. Attempting to close server...`);
    server.close((err) => {
        if (err) {
            console.error('Error closing server:', err);
            process.exit(1);
        }
        console.log('Server closed successfully. Exiting process...');
        process.exit(0);
    });
});

app.post('/query', async (req, res) => {
    let query;
    try {
        const { query: reqQuery, account = "0x5eA4ef97D73bC4C424cC2a2d90482F36a2E3FAEA", lang = 'en', slotId, newTime } = req.body;
        query = reqQuery;
        console.log(`Processing query: ${query}, account: ${account}, lang: ${lang}, slotId: ${slotId}, newTime: ${newTime}`);
        const tokens = query.toLowerCase().split(/\s+/);
        let intent = null, time = null, date = null, duration = null;

        const langKey = lang.slice(0, 2);
        console.log(`Language key: ${langKey}`);
        for (let token of tokens) {
            if (intents[langKey]?.checkAvailability.some(phrase => query.includes(phrase))) {
                intent = 'checkAvailability';
                break;
            }
            if (intents[langKey]?.bookCourt.some(phrase => query.includes(phrase))) {
                intent = 'bookCourt';
                break;
            }
            if (intents[langKey]?.cancelCourt.some(phrase => query.includes(phrase))) {
                intent = 'cancelCourt';
                break;
            }
            if (intents[langKey]?.modifyCourt.some(phrase => query.includes(phrase))) {
                intent = 'modifyCourt';
                break;
            }
        }

        if (!intent) {
            console.log('Intent not recognized');
            res.json({ query, message: messages[langKey]?.help || messages.en.help });
            return;
        }
        console.log(`Intent detected: ${intent}`);

        if (intent === 'checkAvailability' || intent === 'bookCourt') {
            let timeMatch = tokens.find(token => token.match(/(?<!\d{2,})(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)(?!\s*(?:minutes|min|m))/i));
            time = timeMatch ? convertTo24Hour(timeMatch) : null;
            if (!time) {
                if (timePatterns[langKey]?.morning.some(phrase => query.includes(phrase))) time = "09:00";
                else if (timePatterns[langKey]?.afternoon.some(phrase => query.includes(phrase))) time = "15:00";
                else if (timePatterns[langKey]?.evening.some(phrase => query.includes(phrase))) time = "19:00";
            }
            if (!time) {
                throw new Error("No valid time found in query. Please specify a time (e.g., 14:00 or 2 pm) or a period (morning, afternoon, evening).");
            }
            console.log(`Detected time: ${time}`);
        } else if (intent === 'modifyCourt' && newTime) {
            time = convertTo24Hour(newTime);
            if (!time) {
                throw new Error("Invalid new time specified. Please use a valid time format (e.g., 14:00 or 2 pm).");
            }
            console.log(`Detected new time: ${time}`);
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        date = today.toISOString().split('T')[0];
        if (query.includes('αύριο') || query.includes('tomorrow')) date = tomorrow.toISOString().split('T')[0];
        console.log(`Detected date: ${date}`);

        duration = 60;
        if (query.match(/\b90\b/) || query.includes('1.5') || query.includes('μιάμιση')) duration = 90;
        console.log(`Detected duration: ${duration} minutes`);

        // Έλεγχος για το εύρος ώρας
        if (intent === 'checkAvailability' || intent === 'bookCourt') {
            const [startHours, startMinutes] = time.split(':').map(Number);
            const startTotalMinutes = startHours * 60 + startMinutes;
            const endTotalMinutes = startTotalMinutes + duration;
            const startLimitMinutes = 7 * 60; // 07:00 in minutes
            const endLimitMinutes = 23 * 60 + 30; // 23:30 in minutes

            if (startTotalMinutes < startLimitMinutes || endTotalMinutes > endLimitMinutes) {
                throw new Error(messages[langKey]?.invalidTime || messages.en.invalidTime);
            }
            console.log(`Start time in minutes: ${startTotalMinutes}, End time in minutes: ${endTotalMinutes}`);
        } else if (intent === 'modifyCourt' && newTime) {
            const [startHours, startMinutes] = time.split(':').map(Number);
            const startTotalMinutes = startHours * 60 + startMinutes;
            const endTotalMinutes = startTotalMinutes + duration;
            const startLimitMinutes = 7 * 60; // 07:00 in minutes
            const endLimitMinutes = 23 * 60 + 30; // 23:30 in minutes

            if (startTotalMinutes < startLimitMinutes || endTotalMinutes > endLimitMinutes) {
                throw new Error(messages[langKey]?.invalidTime || messages.en.invalidTime);
            }
            console.log(`Start time in minutes: ${startTotalMinutes}, End time in minutes: ${endTotalMinutes}`);
        }

        const allSlots = [];
        if (intent === 'checkAvailability' || intent === 'bookCourt' || (intent === 'modifyCourt' && time)) {
            const [startHours, startMinutes] = time.split(':').map(Number);
            for (let dur of [60, 90]) {
                const totalMinutes = startHours * 60 + startMinutes + dur;
                const endHourCalc = Math.floor(totalMinutes / 60);
                const endMinuteCalc = totalMinutes % 60;
                const endTime = `${endHourCalc.toString().padStart(2, '0')}:${endMinuteCalc.toString().padStart(2, '0')}`;
                const startTime = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
                if (endHourCalc < 24 || (endHourCalc === 23 && endMinuteCalc <= 30)) {
                    if (intent === 'modifyCourt') {
                        const court = slotId.split('-')[0];
                        allSlots.push({ slotId: `${court}-${startTime}-${endTime}`, duration: dur, court });
                    } else {
                        for (let court of courts.en) {
                            allSlots.push({ slotId: `${court}-${startTime}-${endTime}`, duration: dur, court });
                        }
                    }
                }
            }
            console.log(`Generated slots: ${JSON.stringify(allSlots)}`);
        }

        const availableSlots = [];
        console.log('Checking availability...');
        for (let slot of allSlots) {
            const status = courtStatus[slot.court][slot.slotId];
            console.log(`Checking slot ${slot.slotId}: courtStatus=${JSON.stringify(status)}`);
            const isAvailableOnBlockchain = await contract.methods.checkAvailability(slot.slotId).call();
            console.log(`Blockchain availability for ${slot.slotId}: ${isAvailableOnBlockchain}`);

            if (!status || !status.isBooked || isAvailableOnBlockchain) {
                // Έλεγχος για το κενό 30 λεπτών και τον κανόνα των 60 λεπτών
                const [_, startTime, endTime] = slot.slotId.split('-');
                const startTotalMinutes = timeToMinutes(startTime);
                const endTotalMinutes = timeToMinutes(endTime);
                let isValidGap = true;

                // Βρίσκουμε όλες τις κρατήσεις για το συγκεκριμένο γήπεδο
                const courtBookings = Object.entries(courtStatus[slot.court])
                    .filter(([_, booking]) => booking.isBooked)
                    .map(([slotId]) => {
                        const [_, slotStartTime, slotEndTime] = slotId.split('-');
                        return {
                            start: timeToMinutes(slotStartTime),
                            end: timeToMinutes(slotEndTime)
                        };
                    })
                    .sort((a, b) => a.start - b.start); // Ταξινόμηση με βάση την ώρα έναρξης

                let minGapBefore = Infinity;
                let minGapAfter = Infinity;

                for (const booking of courtBookings) {
                    // Έλεγχος για επικάλυψη
                    if (startTotalMinutes < booking.end && endTotalMinutes > booking.start) {
                        isValidGap = false;
                        console.log(`Slot ${slot.slotId} overlaps with existing booking ${booking.start}-${booking.end}`);
                        break;
                    }

                    // Υπολογισμός κενού πριν (από την λήξη της προηγούμενης)
                    const gapBefore = startTotalMinutes - booking.end;
                    if (gapBefore > 0 && gapBefore < minGapBefore) {
                        minGapBefore = gapBefore;
                    }

                    // Υπολογισμός κενού μετά (από την έναρξη της επόμενης)
                    const gapAfter = booking.start - endTotalMinutes;
                    if (gapAfter > 0 && gapAfter < minGapAfter) {
                        minGapAfter = gapAfter;
                    }
                }

                // Εφαρμογή κανόνων
                const minGap = Math.min(minGapBefore !== Infinity ? minGapBefore : Infinity, minGapAfter !== Infinity ? minGapAfter : Infinity);
                if (minGap <= 30 && minGap > 0) {
                    isValidGap = false;
                    console.log(`Slot ${slot.slotId} rejected: Gap of ${minGap} minutes is too small (≤ 30 minutes)`);
                } else if (minGap === 60 && slot.duration === 90) {
                    isValidGap = false;
                    console.log(`Slot ${slot.slotId} rejected: 90-minute booking not allowed with 60-minute gap`);
                } else if (minGap > 0 && minGap < 60) {
                    isValidGap = false;
                    console.log(`Slot ${slot.slotId} rejected: Gap of ${minGap} minutes is between 30 and 60 minutes, no booking allowed`);
                }

                if (isValidGap) {
                    availableSlots.push(slot);
                } else {
                    console.log(`Slot ${slot.slotId} rejected due to gap rules`);
                }
            } else {
                console.log(`Slot ${slot.slotId} is booked by ${status.bookedBy}`);
            }
        }
        console.log(`Available slots: ${JSON.stringify(availableSlots)}`);

        if (intent === 'checkAvailability') {
            const response = [];
            for (let court of courts.en) {
                const sixtyMinSlot = availableSlots.find(slot => slot.court === court && slot.duration === 60);
                const ninetyMinSlot = availableSlots.find(slot => slot.court === court && slot.duration === 90);
                if (sixtyMinSlot) response.push({ slotId: sixtyMinSlot.slotId, description: `${sixtyMinSlot.slotId} (60 minutes)` });
                if (ninetyMinSlot) response.push({ slotId: ninetyMinSlot.slotId, description: `${ninetyMinSlot.slotId} (90 minutes)` });
            }
            res.json({ query, availableSlots: response });
        } else if (intent === 'bookCourt') {
            console.log(`Attempting to book a court for ${duration} minutes...`);
            if (availableSlots.length === 0) {
                console.log('No available slots found for booking');
                res.json({ query, message: messages[langKey]?.noSlots || messages.en.noSlots });
                return;
            }
            const slotId = availableSlots.find(slot => slot.duration === duration)?.slotId || availableSlots[0].slotId;
            console.log(`Selected slot for booking: ${slotId}`);
            const priceInWei = duration === 60 ? PRICE_PER_60_MIN : PRICE_PER_90_MIN;
            const accountInstance = web3.eth.accounts.privateKeyToAccount(privateKey);
            const balance = await sportToken.methods.balanceOf(accountInstance.address).call();
            console.log(`Account balance before booking: ${web3.utils.fromWei(balance, 'ether')} SPR`);
            if (BigInt(balance) < BigInt(priceInWei)) {
                console.log(`Insufficient balance: ${web3.utils.fromWei(balance, 'ether')} SPR, required ${web3.utils.fromWei(priceInWei, 'ether')} SPR`);
                throw new Error(`Insufficient balance: ${web3.utils.fromWei(balance, 'ether')} SPR, required ${web3.utils.fromWei(priceInWei, 'ether')} SPR`);
            }
            const nonce = await web3.eth.getTransactionCount(accountInstance.address, 'pending');
            console.log(`Approving tokens for ${slotId} with nonce ${nonce}...`);
            const approveTx = await sportToken.methods.approve(contractAddress, priceInWei).send({ from: accountInstance.address, gas: 300000, nonce: Number(nonce) });
            console.log(`Approve transaction for ${slotId}:`, approveTx);
            const reserveNonce = Number(nonce) + 1;
            console.log(`Reserving slot ${slotId} with nonce ${reserveNonce}...`);
            await contract.methods.reserveSlot(slotId).send({ from: accountInstance.address, gas: 300000, nonce: reserveNonce });
            await updateCourtStatus(slotId, account);
            res.json({ query, message: (messages[langKey]?.successBook || messages.en.successBook).replace('{slotId}', slotId) });
        } else if (intent === 'cancelCourt') {
            if (!slotId) {
                throw new Error("Slot ID is required for cancellation");
            }
            const slot = await contract.methods.slots(slotId).call();
            if (!slot.isBooked || slot.bookedBy.toLowerCase() !== account.toLowerCase()) {
                res.json({ query, message: (messages[langKey]?.noBooking || messages.en.noBooking).replace('{slotId}', slotId) });
                return;
            }
            const accountInstance = web3.eth.accounts.privateKeyToAccount(privateKey);
            const nonce = await web3.eth.getTransactionCount(accountInstance.address, 'pending');
            const slotPrice = await contract.methods.slotPrice().call();
            await contract.methods.cancelSlot(slotId).send({ from: accountInstance.address, gas: 300000, nonce: Number(nonce) });
            await updateCourtStatus(slotId, null);
            const refundAmount = web3.utils.fromWei(slotPrice, 'ether');
            res.json({ query, message: (messages[langKey]?.successCancel || messages.en.successCancel).replace('{slotId}', slotId).replace('{amount}', refundAmount) });
        } else if (intent === 'modifyCourt') {
            if (!slotId || !newTime) {
                throw new Error("Slot ID and new time are required for modification");
            }
            const oldSlot = await contract.methods.slots(slotId).call();
            console.log(`Checking existing booking for ${slotId}: bookedBy=${oldSlot.bookedBy}, isBooked=${oldSlot.isBooked}`);
            if (!oldSlot.isBooked || oldSlot.bookedBy.toLowerCase() !== account.toLowerCase()) {
                console.log(`No booking found for ${slotId} or user mismatch`);
                res.json({ query, message: (messages[langKey]?.noBooking || messages.en.noBooking).replace('{slotId}', slotId) });
                return;
            }
            const court = slotId.split('-')[0];
            const [startHours, startMinutes] = time.split(':').map(Number);
            const newSlots = [];
            for (let dur of [60, 90]) {
                const totalMinutes = startHours * 60 + startMinutes + dur;
                const endHourCalc = Math.floor(totalMinutes / 60);
                const endMinuteCalc = totalMinutes % 60;
                const endTime = `${endHourCalc.toString().padStart(2, '0')}:${endMinuteCalc.toString().padStart(2, '0')}`;
                const startTime = `${startHours.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
                if (endHourCalc < 24 || (endHourCalc === 23 && endMinuteCalc <= 30)) {
                    newSlots.push({ slotId: `${court}-${startTime}-${endTime}`, duration: dur, court });
                }
            }
            const newSlot = newSlots.find(slot => slot.duration === duration) || newSlots[0];
            const newSlotId = newSlot?.slotId;
            const isNewSlotAvailable = await contract.methods.checkAvailability(newSlotId).call();
            if (!isNewSlotAvailable) {
                console.log(`New slot ${newSlotId} is not available`);
                res.json({ query, message: messages[langKey]?.noSlots || messages.en.noSlots });
                return;
            }
            const accountInstance = web3.eth.accounts.privateKeyToAccount(privateKey);
            const nonce = await web3.eth.getTransactionCount(accountInstance.address, 'pending');
            const oldDuration = getDurationFromSlotId(slotId);
            const newDuration = getDurationFromSlotId(newSlotId);
            let chargeMessage = '';
            if (oldDuration !== newDuration) {
                const oldPrice = oldDuration === 60 ? PRICE_PER_60_MIN : PRICE_PER_90_MIN;
                const newPrice = newDuration === 60 ? PRICE_PER_60_MIN : PRICE_PER_90_MIN;
                if (BigInt(newPrice) > BigInt(oldPrice)) {
                    const chargeDiff = web3.utils.fromWei((BigInt(newPrice) - BigInt(oldPrice)).toString(), 'ether');
                    chargeMessage = `You have been charged an additional ${chargeDiff} SPR for the 90-minute slot.`;
                } else if (BigInt(newPrice) < BigInt(oldPrice)) {
                    const refundDiff = web3.utils.fromWei((BigInt(oldPrice) - BigInt(newPrice)).toString(), 'ether');
                    chargeMessage = `You have been refunded ${refundDiff} SPR for switching to a 60-minute slot.`;
                }
            }
            console.log(`Modifying slot from ${slotId} to ${newSlotId}`);
            await contract.methods.modifySlot(slotId, newSlotId).send({ from: accountInstance.address, gas: 500000, nonce: Number(nonce) });
            await updateCourtStatus(slotId, null);
            await updateCourtStatus(newSlotId, account);
            res.json({ query, message: (messages[langKey]?.successModify || messages.en.successModify).replace('{oldSlotId}', slotId).replace('{newSlotId}', newSlotId).replace('{chargeMessage}', chargeMessage) });
        }
    } catch (error) {
        console.error('Error processing query:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/court-status', (req, res) => {
    console.log('GET request received for /court-status');
    res.json(courtStatus);
});