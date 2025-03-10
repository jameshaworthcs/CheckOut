import axios from 'axios';
import {
  fetchFromCheckout,
  fetchFromShrine,
  postToCheckout,
  postToShrine,
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

interface ActivityCode {
    code: string;
}

interface Activity {
    id: string;
    reference: string;
    startDateTime: string;
    checkinCodes: ActivityCode[];
}

interface CodeToSendToShrine {
    activityID: string;
    checkinCode: string | number;
}

interface CodeToSendToReject {
    rejectID: string;
    moduleCode: string;
    checkinCode: string | number;
}

interface SessionMatch {
    session_id: string;
    codes_to_send_to_shrine: CodeToSendToShrine[];
    codes_to_send_to_reject: CodeToSendToReject[];
}

interface SessionMatches {
    [key: string]: SessionMatch;
}

function getCurrentDate(): string {
    return formatDate();
}

async function fetchApiData(url: string): Promise<any> {
    try {
        // Determine if this is a Checkout or Shrine URL and use the appropriate function
        if (url.includes('checkout.ac')) {
            return await fetchFromCheckout(url.replace('https://checkout.ac', ''));
        } else if (url.includes('checkout.theshrine.net')) {
            return await fetchFromShrine(url.replace('https://checkout.theshrine.net', ''));
        } else {
            // Fallback to direct axios call for other URLs
            const response = await axios.get(url);
            return response.data;
        }
    } catch (error) {
        console.error("Failed to fetch data from API:", error);
        return null;
    }
}

async function sendPostRequest(url: string, data: any, apiKey: string | null = null): Promise<any> {
    try {
        // Determine if this is a Checkout or Shrine URL and use the appropriate function
        if (url.includes('checkout.ac')) {
            return await postToCheckout(url.replace('https://checkout.ac', ''), data, apiKey);
        } else if (url.includes('checkout.theshrine.net')) {
            return await postToShrine(url.replace('https://checkout.theshrine.net', ''), data);
        } else {
            // Fallback to direct axios call for other URLs
            const headers: Record<string, string> = {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
            };
            
            if (apiKey && url.includes('checkout.ac')) {
                headers['x-checkout-key'] = apiKey;
            }
            
            const response = await axios.post(url, data, { headers });
            return response;
        }
    } catch (error) {
        console.error("Failed to send POST request:", error);
        return null;
    }
}

function compareSessions(sessionData: SessionData, activityData: Activity[]): SessionMatches {
    const sessionMatches: SessionMatches = {};
    
    try {
        // Check if sessions exists, if not, treat it as an empty array
        const sessions = sessionData?.sessions || [];
        
        for (const session of sessions) {
            for (const activity of activityData) {
                // Parse activity start time to remove timezone offset
                const activityStartTime = new Date(activity.startDateTime);
                const activityHour = activityStartTime.getUTCHours();
                const activityMinute = activityStartTime.getUTCMinutes();
                
                // Parse session time (format: HH:MM)
                const [sessionHour, sessionMinute] = session.startTime.split(':').map(Number);
                
                // Compare times and descriptions
                if (session.description === activity.reference && 
                    sessionHour === activityHour && 
                    sessionMinute === activityMinute) {
                    
                    if (!sessionMatches[session.description]) {
                        sessionMatches[session.description] = {
                            session_id: session.rejectID,
                            codes_to_send_to_shrine: [],
                            codes_to_send_to_reject: []
                        };
                    }
                    
                    // Ensure codes arrays exist
                    const sessionCodes = session.codes || [];
                    const activityCodes = activity.checkinCodes || [];
                    
                    // Check for missing codes from reject to shrine
                    for (const sessionCode of sessionCodes) {
                        let found = false;
                        for (const activityCode of activityCodes) {
                            if (String(sessionCode.checkinCode) === activityCode.code) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            sessionMatches[session.description].codes_to_send_to_shrine.push({
                                activityID: activity.id,
                                checkinCode: sessionCode.checkinCode
                            });
                        }
                    }
                    
                    // Check for missing codes from shrine to reject
                    for (const activityCode of activityCodes) {
                        let found = false;
                        const sessionCodesArray = Array.isArray(sessionCodes) ? sessionCodes : [];
                        
                        for (const sessionCode of sessionCodesArray) {
                            if (String(sessionCode.checkinCode) === activityCode.code) {
                                found = true;
                                break;
                            }
                        }
                        
                        if (!found) {
                            console.log(`Found missing code ${activityCode.code} from Shrine to add to Reject`);
                            sessionMatches[session.description].codes_to_send_to_reject.push({
                                rejectID: session.rejectID,
                                moduleCode: session.moduleCode || session.tiblModuleCode, // Use tiblModuleCode as fallback
                                checkinCode: activityCode.code
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("No active classes found or other API error:", error);
    }
    
    return sessionMatches;
}

async function main(
    sendToCheckout: boolean = true, 
    sendToShrine: boolean = true, 
    apiKey: string | null = null,
    sessionData: SessionData | null = null
): Promise<void> {
    const activityUrl = `https://checkout.theshrine.net/api/activity/by-day/${getCurrentDate()}`;
    
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
    
    const activityData = await fetchApiData(activityUrl);
    
    // Validate the data before proceeding
    if (!activityData || !Array.isArray(activityData)) {
        console.log("Failed to fetch activity data from Shrine API or data is not in expected format");
        if (activityData) {
            // console.log("Activity data type:", typeof activityData);
        }
    }
    
    // Ensure we have valid data to work with
    const validSessionData = sessionData || { sessions: [] };
    const validActivityData = Array.isArray(activityData) ? activityData : [];
    
    // Log data summary
    // console.log(`Session data: ${validSessionData.sessions?.length || 0} sessions`);
    // console.log(`Activity data: ${validActivityData.length} activities`);
    // console.log("Shrine codes:", validActivityData[0].checkinCodes);
    
    // Process the data even if one of them is empty - this allows one-way sync
    // console.log("Comparing sessions and activities...");
    // Deep clone and expand the data for proper logging
    // console.log("Session data expanded:", JSON.stringify(validSessionData, null, 2));
    // console.log("Activity data expanded:", JSON.stringify(validActivityData, null, 2));
    
    // Ensure codes array is initialized if empty
    validSessionData.sessions = validSessionData.sessions.map(session => ({
        ...session,
        codes: session.codes || []
    }));
    
    const sessionMatches = compareSessions(validSessionData, validActivityData);
    const codesToSendToShrine: CodeToSendToShrine[] = [];
    const codesToSendToReject: CodeToSendToReject[] = [];
    
    for (const description in sessionMatches) {
        const sessionMatch = sessionMatches[description];
        codesToSendToShrine.push(...sessionMatch.codes_to_send_to_shrine);
        codesToSendToReject.push(...sessionMatch.codes_to_send_to_reject);
    }
    
    // console.log("Session matches:", JSON.stringify(sessionMatches, null, 2));
    // console.log("Codes to send to reject:");
    // console.log(codesToSendToReject);
    // console.log("Codes to send to shrine:");
    // console.log(codesToSendToShrine);
    
    // Send codes to reject (Checkout) if enabled
    if (sendToCheckout && codesToSendToReject.length > 0) {
        // console.log("Sending codes to Checkout...");
        for (const codeInfo of codesToSendToReject) {
            const data = buildSubmitCodeData(
                codeInfo.rejectID,
                codeInfo.moduleCode,
                codeInfo.checkinCode,
                generateRandomToken()
            );
            
            const response = await sendPostRequest('https://checkout.ac/api/app/submit', data, apiKey);
            if (response) {
                logApiResponse("Checkout", response.data);
            } else {
                console.log("Failed to send Checkout POST request for code:", codeInfo.checkinCode);
            }
        }
    }
    
    // Send codes to shrine if enabled
    if (sendToShrine && codesToSendToShrine.length > 0) {
        // console.log("Sending codes to Shrine...");
        for (const codeInfo of codesToSendToShrine) {
            const data = {
                "activityID": codeInfo.activityID,
                "code": String(codeInfo.checkinCode)
            };
            
            const response = await sendPostRequest('https://checkout.theshrine.net/api/code/add', data);
            if (response) {
                logApiResponse("Shrine", response.data);
            } else {
                console.log("Failed to send Shrine POST request for code:", codeInfo.checkinCode);
            }
        }
    }
}

// Execute the main function if this file is run directly
if (require.main === module) {
    main().catch(error => {
        console.error("Error in main function:", error);
    });
}

// Export functions for potential use in other modules
export {
    getCurrentDate,
    fetchApiData,
    sendPostRequest,
    compareSessions,
    main
};
