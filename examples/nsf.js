const fs = require('fs');
const OpenRCT2Lib = require('../dist/OpenRCT2Lib.js');

var args = process.argv.slice(2);

try {
    new OpenRCT2Lib(args[0]).then(parkData => {
        parkData.isNSF = true;

        let rst = args[0] + ' ... ';
        if (parkData.error) {
            rst += 'FAILED!!!!!!!';
        } else {
            rst += 'ok';
        }
        
        console.log(parkData);
    });
} catch (e) {
    console.error(e);
}
