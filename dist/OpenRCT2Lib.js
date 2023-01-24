"use strict";
const fs = require('fs');
const pako = require('pako');

class OpenRCT2Lib {
    /**
     * Constructor
     * @param string path                       *.park's file path
     * @return Object                           Parsed data
     */
    constructor(path) {
		this._path = path;
        this._pos = 0;
        this._rawdata = [];
        this._chunkData = {};

        if (!fs.existsSync(this._path)) {
            throw 'File not exists';
        }
        this._rawdata = fs.readFileSync(this._path);
        return this.getData();
	}

    /**
     * Read integer with given size
     * @param int size                           Size in bytes
     * @return int
     */
    getInt(size = 1) {
        let rst = 0;
        for (let n = 0; n < size; n++) {
            rst += (this._rawdata[this._pos++] << (n * 8)) * 1;
        }
        return (rst * 1);
    }

    /**
     * Get header and parse chunk data
     * @ref /src/openrct2/park/ParkFile.cpp:146
     * @ref /src/openrct2/core/OrcaStream.hpp:42
     */
	getData() {
        let rst = {};

        // Split the Header and the rest data
        let HeaderRawData = this._rawdata.slice(0, 64);

        // Header
        rst.header = {};
        let headerBuffer = new rctBuffer(HeaderRawData);
		rst.header.magic            = headerBuffer.getInt(4);   //=1263681872
		rst.header.targetVersion    = headerBuffer.getInt(4);   //=6~
		rst.header.minVersion       = headerBuffer.getInt(4);   //=6~
		rst.header.numChunks        = headerBuffer.getInt(4);   //=16
		rst.header.uncompressedSize = headerBuffer.getInt(8);
		rst.header.compression      = headerBuffer.getInt(4);   // 0=NONE, 1=GZIP
		rst.header.compressedSize   = headerBuffer.getInt(8);
		rst.header.FNV1a            = headerBuffer.getInt2Arr(8);
		rst.header.padding          = headerBuffer.getInt2Arr(20);
        this._pos += 64;

        // Read chunk's meta data
        let chunkMetaData = [];
        for (let i=0; i<rst.header.numChunks; i++) {
            let _chunkID     = this.getInt(4);
            let _chunkOffset = this.getInt(8);
            let _chunkSize   = this.getInt(8);
            chunkMetaData.push([_chunkID, _chunkOffset, _chunkSize]);
        }
        chunkMetaData.sort((a, b) => {   // Sort by offset
            return a[1] < b[1];
        });

        // Start game data
        let gameData = this._rawdata.slice(this._pos);
        if (rst.header.compression === 1) {
            gameData = pako.ungzip(gameData, {to: 'hex'});
        }
        
        // Split each chunk
        let chunkPos = 0;
        for (let c in chunkMetaData) {
            let _chunkID     = chunkMetaData[c][0];
            let _chunkOffset = chunkMetaData[c][1];
            let _chunkSize   = chunkMetaData[c][2];
            let currentChunkData = gameData.slice(_chunkOffset, _chunkOffset + _chunkSize);
            let _chunkData = this.getChunk(_chunkID, currentChunkData);
            let _key = Object.keys(_chunkData)[0];
            if (_key && _key != '0') {
                rst[_key] = _chunkData[_key];
            }
            chunkPos += _chunkSize;
        }

        return rst;
	}

    /**
     * Read chunk's data
     * @param int chunkID                       Chunk id
     * @param Array chunkData                   Chunk data in array
     * @return Array                            Result data in array
     */
    getChunk(chunkID, chunkData) {
        let rst = {};
        let chunk = new rctBuffer(chunkData);
        switch (chunkID) {
            // 0x01  Authoring
            case 0x01:
                rst.authoring = {};
                rst.authoring.engine = chunk.getString();
                rst.authoring.authors = chunk.getStringArray();
                rst.authoring.dateStarted = chunk.getTimestamp();
                rst.authoring.dateModified = chunk.getTimestamp();
                break;

            // 0x02  Objects
            case 0x02:
                rst.object = {};
                rst.object.numSubLists = chunk.getInt(4);
                for (let i=0; i<rst.object.numSubLists; i++) {
                    rst.object.objectType = chunk.getInt(4);
                    rst.object.subListSize = chunk.getInt(4);
                    
                    for (let j=0; j<rst.object.subListSize; j++) {
                        let kind = chunk.getInt(8);
                        // chunk.getDebug();
                        break;
                        switch(kind) {
                            case 0:   // DESCRIPTOR_NONE
                                break;
                            case 1:   // DESCRIPTOR_DAT

                                break;
                            case 2:   // DESCRIPTOR_JSON
                                break;
                        }
                    }
                }
                // chunk.getDebug();
                // console.log(rst.object);
                break;

            // 0x03  Scenario
            case 0x03:
                rst.scenario = {};
                rst.scenario.category = chunk.getInt(4);
                rst.scenario.name = chunk.getStringTable();
                rst.scenario.parkName = chunk.getStringTable();
                rst.scenario.details = chunk.getStringTable();

                let objectiveType = chunk.getInt(4);   // gScenarioObjective.Type
                let objectiveArg1 = chunk.getInt(4);   // gScenarioObjective.Year
                let objectiveArg3 = chunk.getInt(4);   // gScenarioObjective.NumGuests
                let objectiveArg2 = chunk.getInt(8);   // gScenarioObjective.Currency

                let ratingWarningDays = chunk.getInt(2);   // gScenarioParkRatingWarningDays
                let completedCompanyValue = chunk.getMoney(8);   // gScenarioCompletedCompanyValue
                let allowEarlyCompletion = chunk.getBool();
                let scenarioFileName = chunk.getString();   // gScenarioFileName

                let objectiveTypeText = null;
                switch (objectiveType) {
                    case 1:   //OBJECTIVE_GUESTS_BY,
                        objectiveTypeText = 'To have at least {guests} guests in your park at the end of {year}, with a park rating of at least 600';
                        break;
                    case 2:   //OBJECTIVE_PARK_VALUE_BY,
                        objectiveTypeText = 'To achieve a park value of at least {currency} at the end of {year}';
                        break;
                    case 3:   //OBJECTIVE_HAVE_FUN,
                        objectiveTypeText = 'Have Fun!';
                        break;
                    case 4:   //OBJECTIVE_BUILD_THE_BEST,
                        objectiveTypeText = 'Build the best {guests} you can!';
                        break;
                    case 5:   //OBJECTIVE_10_ROLLERCOASTERS,
                        objectiveTypeText = 'To have 10 different types of roller coasters operating in your park, each with an excitement value of at least 6.00';
                        break;
                    case 6:   //OBJECTIVE_GUESTS_AND_RATING,
                        objectiveTypeText = 'To have at least {guests} guests in your park. You must not let the park rating drop below 700 at any time!';
                        break;
                    case 7:   //OBJECTIVE_MONTHLY_RIDE_INCOME,
                        objectiveTypeText = 'To achieve a monthly income from ride tickets of at least {currency}';
                        break;
                    case 8:   //OBJECTIVE_10_ROLLERCOASTERS_LENGTH,
                        objectiveTypeText = 'To have 10 different types of roller coasters operating in your park, each with a minimum length of {guests}, and an excitement rating of at least 7.00';
                        break;
                    case 9:   //OBJECTIVE_FINISH_5_ROLLERCOASTERS,
                        objectiveTypeText = 'To finish building all 5 of the partially built roller coasters in this park, designing them to achieve excitement ratings of at least {currency} each';
                        break;
                    case 10:   //OBJECTIVE_REPAY_LOAN_AND_PARK_VALUE,
                        objectiveTypeText = 'To repay your loan and achieve a park value of at least {currency}';
                        break;
                    case 11:   //OBJECTIVE_MONTHLY_FOOD_INCOME,
                        objectiveTypeText = 'To achieve a monthly profit from food, drink and merchandise sales of at least {currency}';
                        break;
                }

                rst.scenario.objective = {
                    'type': objectiveType,
                    'typeText': objectiveTypeText,
                    'year': objectiveArg1,
                    'guests': objectiveArg3,    // shares num. guests(objectiveType=01), RideId(objectiveType=04) or MinimumLength(objectiveType=08)
                    'currency': objectiveArg2,  // shares Currency or MinimumExcitement(objectiveType=09)
                    'ratingWarningDays': ratingWarningDays,
                    'completedCompanyValue': completedCompanyValue,
                    'allowEarlyCompletion': allowEarlyCompletion,
                    'scenarioFileName': scenarioFileName,
                };
                break;

            // 0x04  General
            case 0x04:
                rst.general = {};
                rst.general.gamePaused = chunk.getInt(4);
                rst.general.currentTicks = chunk.getInt(4);
                rst.general.dateMonthTicks = chunk.getInt(4);
                rst.general.dateMonthsElapsed = chunk.getInt(4);
                rst.general.rand = chunk.getInt(8);
                rst.general.guestInitialHappiness = chunk.getInt(4);
                rst.general.guestInitialCash = chunk.getMoney(4);
                rst.general.guestInitialHunger = chunk.getInt(4);
                rst.general.guestInitialThirst = chunk.getInt(4);
                rst.general.nextGuestNumber = chunk.getInt(4);
                // rst.general.peepSpawns = chunk.getXYZD();
                break;

            // 0x05  Climate
            case 0x05:
                rst.climate = {};
                rst.climate.state = chunk.getInt(4);   // 0=CoolAndWet, 1=Warm, 2=HotAndDry, 3=Cold
                rst.climate.updateTimer = chunk.getInt(4);
                rst.climate.current = {
                    'weather': chunk.getInt(4),
                    'temperature': chunk.getInt(4),
                    'weatherEffect': chunk.getInt(4),
                    'weatherGloom': chunk.getInt(4),
                    'level': chunk.getInt(4),
                };
                rst.climate.next = {
                    'weather': chunk.getInt(4),
                    'temperature': chunk.getInt(4),
                    'weatherEffect': chunk.getInt(4),
                    'weatherGloom': chunk.getInt(4),
                    'level': chunk.getInt(4),
                }
                break;

            // 0x06  Park
            case 0x06:
                rst.park = {};
                rst.park.name = chunk.getString();
                rst.park.cash = chunk.getMoney();
                rst.park.loan = chunk.getMoney();
                rst.park.maxLoan = chunk.getMoney();
                rst.park.loanInterestRate = chunk.getInt(4);
                rst.park.parkFlags = chunk.getInt(8);
                rst.park.parkEntranceFee = chunk.getMoney(4);
                rst.park.staffHandymanColour = chunk.getInt(4);
                rst.park.staffMechanicColour = chunk.getInt(4);
                rst.park.staffSecurityColour = chunk.getInt(4);
                rst.park.samePriceThroughoutPark = chunk.getInt(8);
                rst.park.numMonths = chunk.getInt(4);
                rst.park.numTypes = chunk.getInt(4);
                rst.park.expenditureTable = [];
                for (let i=0; i<rst.park.numMonths; i++) {
                    rst.park.expenditureTable[i] = [];
                    for (let j=0; j<rst.numTypes; j++) {
                        rst.park.expenditureTable[i][j] = chunk.getMoney();
                    }
                }
                rst.park.historicalProfit = chunk.getMoney();
                rst.park.marketingCampaigns = chunk.getIntArray();
                rst.park.currentAwards = chunk.getIntArray();
                rst.park.parkValue = chunk.getMoney();
                rst.park.companyValue = chunk.getMoney();
                rst.park.parkSize = chunk.getInt(4);
                rst.park.numGuestsInPark = chunk.getInt(4);
                rst.park.numGuestsHeadingForPark = chunk.getInt(4);
                rst.park.parkRating = chunk.getInt(4);
                rst.park.parkRatingCasualtyPenalty = chunk.getInt(4);
                rst.park.currentExpenditure = chunk.getMoney();
                rst.park.currentProfit = chunk.getMoney();
                rst.park.weeklyProfitAverageDividend = chunk.getMoney();
                rst.park.weeklyProfitAverageDivisor = chunk.getInt(4);
                rst.park.totalAdmissions = chunk.getMoney();
                rst.park.totalIncomeFromAdmissions = chunk.getMoney();
                rst.park.totalRideValueForMoney = chunk.getMoney(4);
                rst.park.numGuestsInParkLastWeek = chunk.getInt(4);
                rst.park.guestChangeModifier = chunk.getInt(4);
                rst.park.guestGenerationProbability = chunk.getInt(4);
                rst.park.suggestedGuestMaximum = chunk.getInt(4);
                rst.park.peepWarningThrottle = chunk.getIntArray();
                rst.park.parkRatingHistory = chunk.getIntArray();
                rst.park.guestsInParkHistory = chunk.getIntArray();
                rst.park.cashHistory = chunk.getIntArray();
                rst.park.weeklyProfitHistory = chunk.getIntArray();
                rst.park.parkValueHistory = chunk.getIntArray();
                break;

            // 0x07  History (not used)
            // case 0x07:
            //     break;

            // 0x08  Research
            case 0x08:
                rst.research = {};
                rst.research.fundingLevel = chunk.getInt(4);
                rst.research.priorities = chunk.getInt(4);
                rst.research.progressStage = chunk.getInt(4);
                rst.research.progress = chunk.getInt(4);
                rst.research.expectedMonth = chunk.getInt(4);
                rst.research.expectedDay = chunk.getInt(4);
                rst.research.lastItem = chunk.getResearchItem();
                rst.research.nextItem = chunk.getResearchItem();
                rst.research.itemsUninvented = chunk.getResearchItemArray();
                rst.research.itemsInvented = chunk.getResearchItemArray();
                break;

            // 0x09  Notifications
            case 0x09:
                rst.notifications = {};
                break;

            // 0x20  Interface
            case 0x20:
                rst.interface = {};
                rst.interface.savedView = {
                    'x': chunk.getInt(4),
                    'y': chunk.getInt(4),
                    'zoom': chunk.getInt(4),
                    'rotation': chunk.getInt(4),
                    'lastEntranceStyle': chunk.getInt(4),
                    'editorStep': chunk.getInt(4),
                };
                break;

            // 0x30  Tiles
            case 0x30:
                rst.tiles = {};
                rst.tiles.mapX = chunk.getInt(4);
                rst.tiles.mapY = chunk.getInt(4);
                break;

            // 0x31  Entities
            case 0x31:
                rst.entities = {};
                break;

            // 0x32  Rides
            case 0x32:
                rst.rides = {};
                break;

            // 0x33  Banners
            case 0x33:
                rst.banners = {};
                break;

            // 0x35  Staff (not used)
            // case 0x35:
            //     break;

            // 0x36  Cheats
            case 0x36:
                rst.cheats = {};
                break;

            // 0x37  Restricted objects
            case 0x37:
                break;

            // 0x80  Packed objects
            case 0x80:
                rst.packedObjects = {};
                break;

            // Unknown chunk
            default:
                rst.unknown = chunkData;
        }

        return rst;
    }
}

class rctBuffer {
    constructor(rawdata) {
        this._rawdata = rawdata;
        this._pos = 0;
    }

    /**
     * Read integer with given size
     * @param int size                           Size in quater bytes
     * @return int
     */
    getInt(size = 1) {
        let rst = 0;
        for (let n = 0; n < size; n++) {
            rst += (this._rawdata[this._pos++] << (n * 8)) * 1;
        }
        return ((rst * 1) >>> 0);
    }
    getInt2Arr(length = 1) {
        let rst = [];
        for (let n = 0; n < length; n++) {
            rst.push(this.getInt(1));
        }
        return rst;
    }
    readInt(data, start, size = 1) {
        let rst = 0;
        for (let n = 0; n < size; n++) {
            rst += (data[start + n] << (n * 8)) * 1;
        }
        return rst;
    }
    readInt2Arr(data, start, size = 1) {
        let rst = [];
        for (let n = 0; n < size; n++) {
            rst.push(data[start + n]);
        }
        return rst;
    }

    /**
     * Get timestamp data, which is equal to 8 bytes
     */
    getTimestamp(size=8) {
        return this.getInt(size);
    }

    /**
     * Get money32 data
     */
    getMoney(size=8) {
        return this.getInt(size);
    }

    getBool() {
        return this.getInt(4);
    }

    /**
     * Get Array32
     */
    // getArray(callback) {
    //     let rst = [];
    //     let arrayLength = this.getInt(4);
    //     let arrayElementSize = this.getInt(4);
    //     for(let i=0; i<arrayLength; i++) {
    //         rst.push(this.callback(arrayElementSize));
    //     }
    //     return rst;
    // }

    /**
     * Get Array32
     * @return Array
     */
    getIntArray() {
        let rst = [];
        let arrayLength = this.getInt(4);
        let arrayElementSize = this.getInt(4);
        if (arrayElementSize <= 0) {
            return [];
        }
        for(let i=0; i<arrayLength; i++) {
            rst.push(this.getInt(arrayElementSize));
        }
        return rst;
    }
    getStringArray() {
        let rst = [];
        let arrayLength = this.getInt(4);
        let arrayElementSize = this.getInt(4);   // could be 0 if it is varing (eg. for string)
        for(let i=0; i<arrayLength; i++) {
            rst.push(arrayElementSize === 0 ? this.getString() : this.getChar(arrayElementSize));
        }
        // If length is zero, but there is a one 0x00 in the array data, so proceed pointer.
        if (!arrayLength) {
            this._pos++;
        }
        return rst;
    }
    getResearchItemArray() {
        let rst = [];
        let arrayLength = this.getInt(4);
        let arrayElementSize = this.getInt(4);
        for(let i=0; i<arrayLength; i++) {
            let entry = this.getResearchItem(4);
            if (entry) {
                rst.push(entry);
            }
        }
        return rst;
    }

    /**
     * Get string-table
     */
    getStringTable() {
        let arrayLength = this.getInt(4);       // always 1
        let arrayElementSize = this.getInt(4);  // always string's length

        return {
            'lang':  this.getString(),
            'value': this.getString(),
        };
    }

    /**
     * Get characters with given size
     * @param int size                           Size in bytes
     * @return string
     */
    getChar(size = 1) {
        let rst = '';
        for (let n = 0; n < size; n++) {
            rst += String.fromCharCode(this._rawdata[this._pos++]);
        }
        return rst;
    }

	/**
     * Get string
     */
    getString() {
        let rst = '';
        let arr = [];
        let n = 0;
        while (n < 1024) {
            let ord = this._rawdata[this._pos++];
            n++;
            if (ord === 0) {
                return Buffer.from(arr).toString('utf8');
            } else {
                arr.push(ord);
            }
        }
        return rst + '...';
    }

    /**
     * Get Research Item
     */
    getResearchItem(boolSize=1) {
        let hasValue = this.getInt(boolSize);
        if (hasValue) {
            return {
                'type': this.getInt(4),
                'baseRideType': this.getInt(4),
                'entryIndex': this.getInt(4),
                'flags': this.getInt(4),
                'category': this.getInt(4),
            };
        } else {
            return false;
        }
    }

    /**
     * Get News item
     */
    getNewsItem() {
        return {
            'type': this.getInt(4),
            'flags': this.getInt(4),
            'assoc': this.getInt(4),
            'ticks': this.getInt(4),
            'monthYear': this.getInt(4),
            'day': this.getInt(4),
            'text': this.getString(),
        }
    }

    /**
     * For debug
     */
    getInt2Arr(length = 1) {
        let rst = [];
        for (let n = 0; n < length; n++) {
            rst.push(this.getInt(1));
        }
        return rst;
    }
    getDebug(size=100) {
        console.log(this.getInt2Arr(size));
        this._pos -= size;
    }
}
module.exports = exports = OpenRCT2Lib;
