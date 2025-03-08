import axios from 'axios';
import {
  fetchFromCheckout,
  fetchFromAci,
  postToCheckout,
  generateRandomToken,
  formatDate,
  logApiResponse
} from './utils';
import {
  defaultCourseInfo,
  buildActiveSessionsPath,
  buildSubmitCodeData
} from './config';

const headers = {
    'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
};

interface SessionCode {
    checkinCode: string | number;
}

interface Session {
    description: string;
    startDate: string;
    startTime: string;
    rejectID: string;
    moduleCode: string;
    codes: SessionCode[];
}

interface SessionData {
    sessions: Session[];
}

interface AciCode {
    code: string;
    score: number;
}

interface AciActivity {
    date: string;
    time: string;
    space: string;
    activity: string;
    codes: AciCode[];
}

interface AciResponse {
    activities: AciActivity[];
}

interface CodeToSendToCheckout {
    rejectID: string;
    moduleCode: string;
    checkinCode: string | number;
}

interface SessionMatch {
    session_id: string;
    codes_to_send_to_checkout: CodeToSendToCheckout[];
}

interface SessionMatches {
    [key: string]: SessionMatch;
}

function getCurrentDate(): string {
    return formatDate();
}

async function fetchApiData(url: string): Promise<any> {
    try {
        // Determine if this is a Checkout URL and use the appropriate function
        if (url.includes('checkout.ac')) {
            return await fetchFromCheckout(url.replace('https://checkout.ac', ''));
        } else if (url.includes('aci-api.ashhhleyyy.dev')) {
            return await fetchFromAci(url.replace('https://aci-api.ashhhleyyy.dev', ''));
        } else {
            // Direct axios call for other APIs
            const response = await axios.get(url, { headers });
            return response.data;
        }
    } catch (error) {
        console.error("Failed to fetch data from API:", error);
        return null;
    }
}

// Parse ACI date format (e.g., "Saturday 08 March") to a standard date format
function parseAciDate(dateStr: string): Date | null {
    try {
        const parts = dateStr.split(' ');
        if (parts.length < 3) return null;
        
        const day = parseInt(parts[1]);
        const month = parts[2];
        const year = new Date().getFullYear(); // Assume current year
        
        // Convert month name to month number
        const months: {[key: string]: number} = {
            'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
            'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
        };
        
        if (!(month in months)) return null;
        
        return new Date(year, months[month], day);
    } catch (error) {
        console.error("Error parsing ACI date:", error);
        return null;
    }
}

// Parse ACI time format (e.g., "20:30-21:30") to extract start time
function parseAciTime(timeStr: string): string | null {
    try {
        const parts = timeStr.split('-');
        if (parts.length < 1) return null;
        return parts[0].trim(); // Return the start time
    } catch (error) {
        console.error("Error parsing ACI time:", error);
        return null;
    }
}

function compareSessions(sessionData: SessionData, aciData: AciResponse): SessionMatches {
    const sessionMatches: SessionMatches = {};
    
    try {
        // Check if sessions exists, if not, treat it as an empty array
        const sessions = sessionData?.sessions || [];
        const activities = aciData?.activities || [];
        
        for (const session of sessions) {
            for (const activity of activities) {
                // Parse ACI date and time
                const aciDate = parseAciDate(activity.date);
                const aciStartTime = parseAciTime(activity.time);
                
                if (!aciDate || !aciStartTime) continue;
                
                // Format ACI date to match session date format
                const formattedAciDate = aciDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
                
                // Parse session start time (format: "Day Month DD YYYY HH:MM")
                const sessionDateTime = new Date(`${session.startDate} ${session.startTime}`);
                
                // Compare session description with ACI activity name and times
                if (session.description === activity.activity && 
                    session.startTime.startsWith(aciStartTime) && 
                    session.startDate === formattedAciDate) {
                    
                    if (!sessionMatches[session.description]) {
                        sessionMatches[session.description] = {
                            session_id: session.rejectID,
                            codes_to_send_to_checkout: []
                        };
                    }
                    
                    // Check for codes from ACI that need to be sent to Checkout
                    for (const aciCode of activity.codes) {
                        let found = false;
                        for (const sessionCode of session.codes) {
                            if (String(sessionCode.checkinCode) === aciCode.code) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            sessionMatches[session.description].codes_to_send_to_checkout.push({
                                rejectID: session.rejectID,
                                moduleCode: session.moduleCode,
                                checkinCode: aciCode.code
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error comparing sessions:", error);
    }
    
    return sessionMatches;
}

async function main(
    sendToCheckout: boolean = true, 
    apiKey: string | null = null,
    sessionData: SessionData | null = null
): Promise<void> {
    const aciUrl = "https://aci-api.ashhhleyyy.dev/api/codes";
    
    // Log API key status
    if (apiKey) {
        // console.log("Using authenticated API key for Checkout requests");
    } else if (sendToCheckout) {
        console.log("Warning: No API key provided for Checkout requests");
    }
    
    // Fetch session data if not provided
    if (!sessionData) {
        const sessionUrl = buildActiveSessionsPath();
        // Use the provided API key for fetching session data
        sessionData = await fetchApiData(`https://checkout.ac${sessionUrl}`);
        if (!sessionData) {
            console.log("Failed to fetch session data from Checkout API");
        }
    }
    
    const aciData = await fetchApiData(aciUrl);
    
    // Validate the data before proceeding
    if (!aciData || !aciData.activities) {
        console.log("Failed to fetch activity data from ACI API or data is not in expected format");
        if (aciData) {
            // console.log("ACI data type:", typeof aciData);
        }
    }
    
    // Ensure we have valid data to work with
    const validSessionData = sessionData || { sessions: [] };
    const validAciData = aciData && aciData.activities ? aciData : { activities: [] };
    
    // Log data summary
    // console.log(`Session data: ${validSessionData.sessions?.length || 0} sessions`);
    // console.log(`ACI data: ${validAciData.activities?.length || 0} activities`);
    
    // Process the data even if one of them is empty - this allows one-way sync
    const sessionMatches = compareSessions(validSessionData, validAciData);
    const codesToSendToCheckout: CodeToSendToCheckout[] = [];
    
    for (const description in sessionMatches) {
        const sessionMatch = sessionMatches[description];
        codesToSendToCheckout.push(...sessionMatch.codes_to_send_to_checkout);
    }
    
    // console.log("Codes to send to Checkout:");
    // console.log(codesToSendToCheckout);
    
    // Send codes to Checkout if enabled
    if (sendToCheckout && codesToSendToCheckout.length > 0) {
        // console.log("Sending codes to Checkout...");
        for (const codeInfo of codesToSendToCheckout) {
            const data = buildSubmitCodeData(
                codeInfo.rejectID,
                codeInfo.moduleCode,
                codeInfo.checkinCode,
                generateRandomToken("aci")
            );
            
            const response = await postToCheckout('/api/app/submit', data, apiKey);
            if (response) {
                logApiResponse("Checkout", response.data);
            } else {
                console.log("Failed to send Checkout POST request for code:", codeInfo.checkinCode);
            }
        }
    }
}

export { main }; 