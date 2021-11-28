const OpenRCT2Lib = require('../OpenRCT2Lib.js');


let parkData = new OpenRCT2Lib(__dirname + '/Forest Frontiers.park');
console.log(parkData);
/*
// Returns:
{
	header: {
		'magic': 1263681872,
		'targetVersion': 6,
		...
	},
	chunkData: {
		'1': {
			'engine': 'OpenRCT2, v0.3.5.1 (6e839bd on develop) provided by GitHub',
			'authors': [],
			...
		},
		'2': { ... },
		...
		'55': { ... },
	}
}
*/
