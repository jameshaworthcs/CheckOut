const moment = require('moment-timezone');

// Function to encrypt using Base64 encoding
function encrypt(codeID) {
    // Convert codeID to its numeric value
    const numericValue = parseInt(codeID);
    // Base64 encode the numeric value
    const encodedValue = Buffer.from(numericValue.toString()).toString('base64');
    return encodedValue;
}

// Function to decrypt using Base64 decoding
function decrypt(encodedValue) {
    // Base64 decode the encoded value
    const numericValue = parseInt(Buffer.from(encodedValue, 'base64').toString());
    // Convert numeric value back to codeID
    const codeID = numericValue.toString();
    return codeID;
}

function calculateScores(inst, crs, yr, md, grp, codes, grouped, codeDayFlip) {
    // Function to calculate the score for a code
    function calculateScore(code, remainingCodes) {
        let score = 1;

        // Count past submissions for IP and Username
        remainingCodes.forEach(otherCode => {
            if (otherCode.codeDay !== moment(Date.now()).format('YYYY-MM-DD') || otherCode.codeState === "0") {
                if (code.ip === otherCode.ip && otherCode.codeState === "1") {
                    score++;
                } else if (code.ip === otherCode.ip && otherCode.codeState !== "1") {
                    score -= 5;
                }

                if (code.username !== "anon@checkout.ac.uk" && code.username !== "guest@checkout.ac.uk" &&
                    code.username === otherCode.username && otherCode.codeState === "1") {
                    score++;
                } else if (code.username !== "anon@checkout.ac.uk" && code.username !== "guest@checkout.ac.uk" &&
                           code.username === otherCode.username && otherCode.codeState !== "1") {
                    score -= 5;
                }
                
                if (code.username.includes("j-h.ai") || code.username.includes("checkout@jemedia.xyz")) {score += 10}

                score -= parseInt(otherCode.codeReps) || 0;
            }
        });

        return score;
    }

    // Variables
    const codeDay = moment().tz('Europe/London').format('YYYY-MM-DD');

    // Filter the codes based on provided variables
    const filteredCodes = codes.filter(code => code.inst === inst && code.crs === crs && code.yr === yr && (code.md === md || md === '%') && (code.groupCode === grp || grp === '%') && (code.codeDay === codeDay || codeDayFlip === false) && code.visState === '1' && code.codeState === '1');

    // Calculate score for each filtered code
    const codesWithScores = filteredCodes.map(code => {
        const remainingCodes = codes.filter(otherCode => otherCode !== code);
        const score = calculateScore(code, remainingCodes);
        const count = score;
        const codeHash = encrypt(code.codeID);

        // Handle verifiedInfo - parse JSON if it's a string
        let verifiedInfo = typeof code.verifiedInfo === 'string' 
            ? JSON.parse(code.verifiedInfo) 
            : code.verifiedInfo || {};

        console.log(verifiedInfo);
        
        // Add reputation based on rejectScore
        verifiedInfo.reputation = score > 500;

        return {
            codeID: codeHash,
            groupCode: code.groupCode,
            checkinCode: code.checkinCode,
            score,
            count,
            verifiedInfo
        };
    });

    if (grouped) {
        // Group codes by groupCode and checkinCode and calculate average score
        const groupedCodes = {};
        codesWithScores.forEach(code => {
            const key = `${code.groupCode}-${code.checkinCode}`;
            if (!groupedCodes[key]) {
                groupedCodes[key] = {
                    groupCode: code.groupCode,
                    checkinCode: code.checkinCode,
                    codeIDs: [],
                    totalScore: 0,
                    count: 0,
                    verifiedInfo: null
                };
            }
            groupedCodes[key].codeIDs.push(code.codeID);
            groupedCodes[key].totalScore += code.score;
            groupedCodes[key].count++;

            // Check for autocheckin: true in verifiedInfo
            if (!groupedCodes[key].verifiedInfo && 
                code.verifiedInfo && 
                Object.values(code.verifiedInfo).some(value => 
                    value && typeof value === 'object' && value.autocheckin === true
                )) {
                    console.log('Autocheckin found');
                groupedCodes[key].verifiedInfo = code.verifiedInfo;
            }
        });

        // Calculate average score for each group and ensure it's an integer
        return Object.values(groupedCodes).map(group => {
            const rejectScore = Math.round(group.totalScore / group.count);
            
            // If no verifiedInfo with autocheckin was found, create a new one
            if (!group.verifiedInfo) {
                group.verifiedInfo = {
                    reputation: rejectScore > 5
                };
            } else {
                group.verifiedInfo.reputation = rejectScore > 5;
            }

            return {
                groupCode: group.groupCode,
                checkinCode: group.checkinCode,
                codeIDs: group.codeIDs,
                rejectScore,
                count: group.count,
                verifiedInfo: group.verifiedInfo
            };
        });
    }

    return codesWithScores;
}

module.exports = calculateScores;
