"use strict";
const fs = require('fs');
const pako = require('pako');
const zlib = require('zlib');

class OpenRCT2Lib {
    constructor(path) {
		this._path = path;
        this._pos = 0;
        this._rawdata = [];
        this._chunkData = {};

        if (!fs.existsSync(this._path)) {
            throw 'File not exists';
        }
        this._rawdata = fs.readFileSync(this._path);
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
    getInt2Arr(length = 1) {
        let rst = [];
        for (let n = 0; n < length; n++) {
            rst.push(this.getInt(1));
        }
        return rst;
    }

    /**
     * Get header and parse chunk data
     * @ref /src/openrct2/ParkFile.cpp:158
     * @ref /src/openrct2/core/OrcaStream.hpp:42
     */
	getData() {
        let rst = {};

        // Split the Header and the rest data
        let HeaderRawData = this._rawdata.slice(0, 64);

        // Header
        rst.header = {};
        let headerBuffer = new rctBuffer(HeaderRawData);
		rst.header.Magic            = headerBuffer.getInt(4);   //= 1263681872
		rst.header.TargetVersion    = headerBuffer.getInt(4);   //=6
		rst.header.MinVersion       = headerBuffer.getInt(4);   //=6
		rst.header.NumChunks        = headerBuffer.getInt(4);   //=16
		rst.header.UncompressedSize = headerBuffer.getInt(8);
		rst.header.Compression      = headerBuffer.getInt(4);   // 0=NONE, 1=GZIP
		rst.header.CompressedSize   = headerBuffer.getInt(8);
		rst.header.FNV1a            = headerBuffer.getInt2Arr(8);
		rst.header.padding          = headerBuffer.getInt2Arr(20);
        this._pos += 64;

        // Read chunk's meta data
        let chunkMetaData = [];
        for (let i=0; i<rst.header.NumChunks; i++) {
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
        if (rst.header.Compression === 1) {
            gameData = pako.ungzip(gameData, {to: 'hex'});
        }
        
        // Split each chunk
        let chunkPos = 0;
        rst.chunkData = {};
        for (let c in chunkMetaData) {
            let _chunkID     = chunkMetaData[c][0];
            let _chunkOffset = chunkMetaData[c][1];
            let _chunkSize   = chunkMetaData[c][2];
            let currentChunkData = gameData.slice(_chunkOffset, _chunkOffset + _chunkSize);
            rst.chunkData[_chunkID] = this.getChunk(_chunkID, currentChunkData);

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
                rst.engine = chunk.getString();
                rst.authors = chunk.getStringArray();
                rst.dateStarted = chunk.getTimestamp();
                rst.dateModified = chunk.getTimestamp();
                break;

            // 0x02  Objects
            case 0x02:
                break;

            // 0x03  Scenario
            case 0x03:
                rst.category = chunk.getInt(4);
                rst.name = chunk.getStringTable();
                rst.parkName = chunk.getStringTable();
                rst.details = chunk.getStringTable();

                let objectiveType = chunk.getInt(4);
                let objectiveYear = chunk.getInt(4);

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

                rst.objective = {
                    'type': objectiveType,
                    'typeText': objectiveTypeText,
                    'year': objectiveYear,
                    'guests': chunk.getInt(8),    // shares num. guests(objectiveType=01), RideId(objectiveType=04) or MinimumLength(objectiveType=08)
                    'currency': chunk.getInt(8),  // shares Currency or MinimumExcitement(objectiveType=09)
                    'ratingWarningDays': chunk.getInt(2),
                    'completedCompanyValue': chunk.getMoney(8),
                    'allowEarlyCompletion': chunk.getBool(),
                    'scenarioFileName': chunk.getString(),
                };
                break;

            // 0x04  General
            case 0x04:
                rst.gamePaused = chunk.getInt(4);
                rst.currentTicks = chunk.getInt(4);
                rst.dateMonthTicks = chunk.getInt(4);
                rst.dateMonthsElapsed = chunk.getInt(4);
                rst.rand = [
                    chunk.getInt(4),
                    chunk.getInt(4),
                ];
                rst.guestInitialHappiness = chunk.getInt(4);
                rst.guestInitialCash = chunk.getMoney(4);
                rst.guestInitialHunger = chunk.getInt(4);
                rst.guestInitialThirst = chunk.getInt(4);
                rst.nextGuestNumber = chunk.getInt(4);
                // rst.peepSpawns = chunk.getXYZD();
                break;

            // 0x05  Climate
            case 0x05:
                rst.climate = chunk.getInt(4);   // 0=CoolAndWet, 1=Warm, 2=HotAndDry, 3=Cold
                rst.climateUpdateTimer = chunk.getInt(4);
                rst.climateCurrent = {
                    'weather': chunk.getInt(4),
                    'temperature': chunk.getInt(4),
                    'weatherEffect': chunk.getInt(4),
                    'weatherGloom': chunk.getInt(4),
                    'level': chunk.getInt(4),
                };
                rst.climateNext = {
                    'weather': chunk.getInt(4),
                    'temperature': chunk.getInt(4),
                    'weatherEffect': chunk.getInt(4),
                    'weatherGloom': chunk.getInt(4),
                    'level': chunk.getInt(4),
                }
                break;

            // 0x06  Park
            case 0x06:
                rst.parkName = chunk.getString();
                rst.cash = chunk.getMoney();
                rst.loan = chunk.getMoney();
                rst.maxLoan = chunk.getMoney();
                rst.loanInterestRate = chunk.getInt(4);
                rst.parkFlags = chunk.getInt(8);
                rst.parkEntranceFee = chunk.getMoney(4);
                rst.staffHandymanColour = chunk.getInt(4);
                rst.staffMechanicColour = chunk.getInt(4);
                rst.staffSecurityColour = chunk.getInt(4);
                rst.samePriceThroughoutPark = chunk.getInt(8);
                rst.numMonths = chunk.getInt(4);
                rst.numTypes = chunk.getInt(4);
                rst.expenditureTable = [];
                for (let i=0; i<rst.numMonths; i++) {
                    rst.expenditureTable[i] = [];
                    for (let j=0; j<rst.numTypes; j++) {
                        rst.expenditureTable[i][j] = chunk.getMoney();
                    }
                }
                rst.historicalProfit = chunk.getMoney();
                rst.marketingCampaigns = chunk.getIntArray();
                rst.currentAwards = chunk.getIntArray();
                rst.parkValue = chunk.getMoney();
                rst.companyValue = chunk.getMoney();
                rst.parkSize = chunk.getInt(4);
                rst.numGuestsInPark = chunk.getInt(4);
                rst.numGuestsHeadingForPark = chunk.getInt(4);
                rst.parkRating = chunk.getInt(4);
                rst.parkRatingCasualtyPenalty = chunk.getInt(4);
                rst.currentExpenditure = chunk.getMoney();
                rst.currentProfit = chunk.getMoney();
                rst.weeklyProfitAverageDividend = chunk.getMoney();
                rst.weeklyProfitAverageDivisor = chunk.getInt(4);
                rst.totalAdmissions = chunk.getMoney();
                rst.totalIncomeFromAdmissions = chunk.getMoney();
                rst.totalRideValueForMoney = chunk.getMoney(4);
                rst.numGuestsInParkLastWeek = chunk.getInt(4);
                rst.guestChangeModifier = chunk.getInt(4);
                rst.guestGenerationProbability = chunk.getInt(4);
                rst.suggestedGuestMaximum = chunk.getInt(4);
                rst.peepWarningThrottle = chunk.getIntArray();
                rst.parkRatingHistory = chunk.getIntArray();
                rst.guestsInParkHistory = chunk.getIntArray();
                rst.cashHistory = chunk.getIntArray();
                rst.weeklyProfitHistory = chunk.getIntArray();
                rst.parkValueHistory = chunk.getIntArray();
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

                console.log(rst);
                break;

            // 0x09  Notifications
            case 0x09:
                break;

            // 0x20  Interface
            case 0x20:
                break;

            // 0x30  Tiles
            case 0x30:
                break;

            // 0x31  Entities
            case 0x31:
                break;

            // 0x33  Banners
            case 0x33:
                break;

            // 0x35  Staff (not used)
            // case 0x35:
            //     break;

            // 0x36  Cheats
            case 0x36:
                break;

            // 0x37  Restricted objects
            case 0x37:
                break;

            // 0x80  Packed objects
            case 0x80:
                break;

            // Unknown chunk
            default:
                rst = chunkData;
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
     * @param int size                           Size in bytes
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
                // return Buffer.from(arr).toString('utf8');
                return rst;
            } else {
                // arr.push(ord);
                rst += String.fromCharCode(ord);
            }
        }
        // return Buffer.from(arr).toString('utf8') + '...';
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
}
module.exports = exports = OpenRCT2Lib;
