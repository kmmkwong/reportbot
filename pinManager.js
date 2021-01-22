const fs = require("fs");

const PIN_RECORDS_FILE = "./.data/pinRecords.txt";
var pinMap = {};

module.exports = {
  // Load from persistence storage
  loadPins: () => {
    try {
      const data = fs.readFileSync(PIN_RECORDS_FILE, "utf8");
      if (data) {
        pinMap = JSON.parse(data);
      }
      // console.log("--- Loaded pins ---");
      // console.log(pinMap);
      
    } catch (err) {
      console.error("--- Failed to load pins ---");
      console.error(err);
    }
  },
  
  // Persist into storage
  persistPins: () => {
    try {
      const data = fs.writeFileSync(PIN_RECORDS_FILE, JSON.stringify(pinMap));
      //file written successfully
    } catch (err) {
      console.error("--- Failed to persist pins ---");
      console.error(err);
    }
  },
  
  pin: (userId, reportId) => {
    if (!pinMap[userId]) {
      pinMap[userId] = [];
    }
    if (!pinMap[userId].includes(reportId)) {
      pinMap[userId].push(reportId);
    }
    module.exports.persistPins();
  },
  
  unpin: (userId, reportId) => {
    if (!pinMap[userId]) {
      pinMap[userId] = [];
    }
    const index = pinMap[userId].indexOf(reportId);
    if (index >= 0 ) {
      pinMap[userId].splice(index, 1);
    }
    module.exports.persistPins();
  },
  
  isPinned: (userId, reportId) => {
    if (!pinMap[userId]) {
      pinMap[userId] = [];
    }
    return pinMap[userId].includes(reportId);
  },
  
  getPinned: (userId) => {
    if (!pinMap[userId]) {
      pinMap[userId] = [];
    }
    return pinMap[userId];    
  }
};
