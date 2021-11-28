# OpenRCT2Lib
**OpenRCT2Lib** parses [OpenRCT2](https://github.com/OpenRCT2/OpenRCT2)'s New Savefile format (_*.park_).  
This offers _*.park_ file's informations, such as Park's name, Scenario's objective and etc.


# References
 * https://github.com/OpenRCT2/OpenRCT2/blob/develop/src/openrct2/ParkFile.cpp
 * https://raw.githubusercontent.com/OpenRCT2/OpenRCT2/develop/docs/save-format.md (I think it might be outdated but useful for ref.)


# Chunk
## 0x01: Authoring
| Property     | Description                    | Misc. |
|--------------|--------------------------------|-------|
| engine       | E.g. "openrct2 v0.1.2 (Linux)" |       |
| authors      |                                |       |
| dateStarted  |                                |       |
| dateModified |                                |       |

## 0x02: Objects
_(Not supported yet)_

## 0x03: Scenario
| Property                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Misc.               |
|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| category                        | Category of the scenario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |                     |
| name                            | Name of the scenario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                     |
| parkName                        | Park name of the scenario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |                     |
| details                         | Description of the scenario                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                     |
| objective.type                  | Objective type in number.<br>     1: Guests by {guests}<br>     2: Park value by {currency}<br>     3: Have Fun!<br>     4: Build the best {guest} you can!<br>     5: To have 10 different types of roller coasters<br>     6: Guests by {guests} with park rating 700 above<br>     7: Monthly ride income at least {currency}<br>     8: To have 10 roller coasters with min. length {guests}<br>     9: To finish 5 coasters with excitement ratings of at least   {currency}<br>     10: Repay loans and park value with {currency}<br>     11: Monthly profit from food/drink/sales of at least {currency}<br>      * {guests} = ``objective.guests``,   {currency} = ``objective.currency`` |                     |
| objective.typeText              | Objective type in text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |                     |
| objective.year                  | Year value of objective                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |                     |
| objective.guests                | Count of Guests for   objective.type=1<br>     RideId for objective.type=4<br>     Min. length of coaster for objective.type=8                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |                     |
| objective.currency              | Money value for   objective.type=2, 7, 10, 11<br>     Min. excitement ratings for objective.type=9                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |                     |
| objective.ratingWarningDays     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |                     |
| objective.completedCompanyValue | Completed company value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |                     |
| objective.allowEarlyCompletion  | 1 if the scenario early completion is allowed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |                     |
| objective.scenarioFileName      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Seems not accurate? |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Seems not accurate? |

## 0x04: General
| Property              | Description           | Misc. |
|-----------------------|-----------------------|-------|
| gamePaused            |                       |       |
| currentTicks          |                       |       |
| dateMonthTicks        |                       |       |
| dateMonthsElapsed     |                       |       |
| rand                  |                       |       |
| guestInitialHappiness |                       |       |
| guestInitialCash      |                       |       |
| guestInitialHunger    |                       |       |
| guestInitialThirst    |                       |       |
| peepSpawns            | _(Not supported yet)_ |       |


## 0x05: Climate
| Property           | Description                                                                          | Misc. |
|--------------------|--------------------------------------------------------------------------------------|-------|
| climate            |                                                                                      |       |
| climateUpdateTimer |                                                                                      |       |
| climatCurrent      | weather<br>     temperature<br>     weatherEffect<br>     weatherGloom<br>     level |       |
| climateNext        | _(Same with above)_                                                                  |       |


## 0x06: Park
| Property                    | Description                                     | Misc. |
|-----------------------------|-------------------------------------------------|-------|
| parkName                    | Park name                                       |       |
| cash                        | Current cash                                    |       |
| loan                        | Current loan                                    |       |
| maxLoan                     | Maximum loan                                    |       |
| loanInterestRate            | Interest rate of loan                           |       |
| parkFlags                   |                                                 |       |
| parkEntranceFee             | Entrance fee of the park                        |       |
| staffHandymanColour         | Colour index of Handymans                       |       |
| staffMechanicColour         | Colour index of Mechanics                       |       |
| staffSecurityColour         | Colour index of Securities                      |       |
| samePriceThroughoutPark     |                                                 |       |
| numMonths                   |                                                 |       |
| numTypes                    |                                                 |       |
| expenditureTable            |                                                 |       |
| historicalProfit            |                                                 |       |
| marketingCampaigns          |                                                 |       |
| currentAwards               |                                                 |       |
| parkValue                   | Current park value                              |       |
| companyValue                | Current company value                           |       |
| parkSize                    | Area of the park                                |       |
| numGuestsInPark             | Count of guests in the park                     |       |
| numGuestsHeadingForPark     | Count of guests heading for the park's entrance |       |
| parkRating                  | Park rating                                     |       |
| parkRatingCasualtyPenalty   |                                                 |       |
| currentEpenditure           |                                                 |       |
| currentProfit               |                                                 |       |
| weeklyProfitAverageDividend |                                                 |       |
| weeklyProfitAverageDivisor  |                                                 |       |
| totalAdmissions             |                                                 |       |
| totalIncomeFromAdmissions   |                                                 |       |
| totalRideValueForMoney      |                                                 |       |
| numGuestsInParkLastWeek     |                                                 |       |
| guestChangeModifier         |                                                 |       |
| guestGenerationProbability  |                                                 |       |
| suggestedGuestMaximum       |                                                 |       |
| peepWarningThrottle         |                                                 |       |
| parkRatingHistory           | History of park rating                          |       |
| guestsInParkHistory         | History of count of guests in the park          |       |
| cashHistory                 | History of cash                                 |       |
| weeklyProfitHistory         | History of weekly profit                        |       |
| parkValueHistory            | History of park value                           |       |


## 0x07: History
_(This chunk is commented so not used)_


## 0x08: Research
| Property                 | Description | Misc. |
|--------------------------|-------------|-------|
| research.fundinglevel    |             |       |
| research.priorities      |             |       |
| research.progressStage   |             |       |
| research.progress        |             |       |
| research.expectMonth     |             |       |
| research.expectDay       |             |       |
| research.lastItem        |             |       |
| research.nextItem        |             |       |
| research.itemsUninvented |             |       |
| research.itemsInvented   |             |       |


## 0x09: Notifications
_(Not supported yet)_


## 0x20: Interface
_(Not supported yet)_


## 0x30: Tiles
_(Not supported yet)_


## 0x31: Entities
_(Not supported yet)_


## 0x33: Banners
_(Not supported yet)_


## 0x35: Staff
_(This chunk is commented so not used)_


## 0x36: Cheats
_(Not supported yet)_


## 0x37: Restricted objects
_(Not supported yet)_


## 0x80: Packed objects
_(Not supported yet)_