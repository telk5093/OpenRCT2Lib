const util = require('util');
const OpenRCT2Lib = require('../OpenRCT2Lib.js');

const scenario_path = './aa.park';
let file = new OpenRCT2Lib(scenario_path);
// console.log(JSON.stringify(file.getData(), null, "  "));
file.getData();
