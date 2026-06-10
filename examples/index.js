const OpenRCT2Lib = require('../dist/OpenRCT2Lib.js');

const filepath = __dirname + '/Forest Frontiers.park';
new OpenRCT2Lib(filepath).then(parkData => {
    console.log(parkData);
});

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
