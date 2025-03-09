var tibl = require('../routes/tibl.ts');
const express = require('express');
import { main as shrineMain } from './shrine';
import { main as aciMain } from './aci';
import { getApiConfig, fetchFromCheckout } from './utils';
import { defaultCourseInfo, buildActiveSessionsPath } from './config';
var app = express.Router();
var db = require('../databases/database.ts');
const util = require('util');

// Promisify db.query for async/await
const dbQuery = util.promisify(db.query);

// Configuration options for shrine synchronization
interface ShrineConfig {
  enabled: boolean;           // Master switch to enable/disable all synchronization
  sendToCheckout: boolean;    // Whether to send codes to Checkout
  sendToShrine: boolean;      // Whether to send codes to Shrine
  apiKey: string | null;      // API key for Checkout authentication
}

// Configuration options for ACI synchronization
interface AciConfig {
  enabled: boolean;           // Master switch to enable/disable ACI synchronization
  sendToCheckout: boolean;    // Whether to send codes to Checkout
  apiKey: string | null;      // API key for Checkout authentication
}

// Configuration for the main Checkout API
interface CheckoutConfig {
  apiKey: string | null;      // API key for Checkout authentication
}

// Default configuration
const shrineConfig: ShrineConfig = {
  enabled: true,
  sendToCheckout: true,
  sendToShrine: false, // Disabled Shrine synchronization
  apiKey: null
};

// Default ACI configuration
const aciConfig: AciConfig = {
  enabled: true,
  sendToCheckout: true,
  apiKey: null
};

// Default Checkout configuration
const checkoutConfig: CheckoutConfig = {
  apiKey: null
};

// Function to fetch API key from the database
async function fetchApiKey(userEmail: string): Promise<string | null> {
  try {
    // Try to find the specified user
    let results = await dbQuery('SELECT api_token FROM users WHERE email = ?', [userEmail]);
    
    if (results.length > 0 && results[0].api_token) {
      // console.log(`Using API key from ${userEmail} user`);
      return results[0].api_token;
    }
    
    // If in development mode and no specific user found, try to find a sysop user
    if (process.env.NODE_ENV === 'development') {
      results = await dbQuery('SELECT api_token FROM users WHERE userstate LIKE ? LIMIT 1', ['%sysop%']);
      
      if (results.length > 0 && results[0].api_token) {
        // console.log("Development mode: Using API key from sysop user");
        return results[0].api_token;
      }
    }
    
    console.log(`No suitable API key found for ${userEmail}`);
    return null;
  } catch (error) {
    console.error("Error fetching API key:", error);
    return null;
  }
}

const outsource = async () => {
  // Log the API configuration
  const apiConfig = getApiConfig();
  // console.log(`Using Checkout API: ${apiConfig.checkoutBaseUrl}`);
  // console.log(`Using Shrine API: ${apiConfig.shrineBaseUrl}`);
  // console.log(`Using course info: ${defaultCourseInfo.institution}/${defaultCourseInfo.course}/${defaultCourseInfo.year}`);
  
  // Fetch API keys for all services if needed
  if (!checkoutConfig.apiKey) {
    checkoutConfig.apiKey = await fetchApiKey('checkout@jemedia.xyz');
    if (!checkoutConfig.apiKey) {
      console.log("Warning: No API key found for main Checkout authentication. Using unauthenticated requests.");
    } else {
      // console.log("Using API key for main Checkout requests");
    }
  }
  
  if (shrineConfig.enabled && !shrineConfig.apiKey) {
    shrineConfig.apiKey = await fetchApiKey('shrine@checkout.ac.uk');
    if (!shrineConfig.apiKey && shrineConfig.sendToCheckout) {
      console.log("Warning: No API key found for Shrine Checkout authentication. Checkout synchronization may fail.");
    }
  }
  
  if (aciConfig.enabled && !aciConfig.apiKey) {
    aciConfig.apiKey = await fetchApiKey('aci@checkout.ac.uk');
    if (!aciConfig.apiKey && aciConfig.sendToCheckout) {
      console.log("Warning: No API key found for ACI Checkout authentication. Checkout synchronization may fail.");
    }
  }
  
  // Fetch active sessions once for all outsource sources
  const activeSessionsUrl = buildActiveSessionsPath();
  const sessionData = await fetchFromCheckout(activeSessionsUrl, checkoutConfig.apiKey);
  
  if (!sessionData) {
    console.log("Failed to fetch active sessions data from Checkout API");
    return;
  }
  
  // Log session data summary
  const sessionCount = sessionData.sessions?.length || 0;
  // console.log(`Active sessions: ${sessionCount}`);
  
  // Only proceed if there are sessions or we're forcing execution
  const forceExecution = false;
  if (sessionCount > 0 || (process.env.NODE_ENV === 'development' && forceExecution)) {
    // Process Shrine if enabled
    if (shrineConfig.enabled) {
      // console.log("Starting Shrine synchronization...");
      try {
        await shrineMain(
          shrineConfig.sendToCheckout, 
          shrineConfig.sendToShrine, 
          shrineConfig.apiKey, 
          sessionData
        );
        // console.log("Shrine synchronization completed successfully");
      } catch (error) {
        console.error("Error during shrine synchronization:", error);
      }
    } else {
      // console.log("Shrine synchronization is disabled");
    }
    
    // Process ACI if enabled
    if (aciConfig.enabled) {
      // console.log("Starting ACI synchronization...");
      try {
        await aciMain(
          aciConfig.sendToCheckout, 
          aciConfig.apiKey, 
          sessionData
        );
        // console.log("ACI synchronization completed successfully");
      } catch (error) {
        console.error("Error during ACI synchronization:", error);
      }
    } else {
      // console.log("ACI synchronization is disabled");
    }
  } else {
    // console.log("No active sessions found, skipping outsource processes");
  }
};

// Function to update Shrine configuration
export function updateShrineConfig(config: Partial<ShrineConfig>): void {
  Object.assign(shrineConfig, config);
  // console.log("Shrine configuration updated:", shrineConfig);
}

// Function to update ACI configuration
export function updateAciConfig(config: Partial<AciConfig>): void {
  Object.assign(aciConfig, config);
  // console.log("ACI configuration updated:", aciConfig);
}

// Function to refresh the Checkout API key
export async function refreshCheckoutApiKey(): Promise<void> {
  checkoutConfig.apiKey = await fetchApiKey('checkout@jemedia.xyz');
  // console.log("Checkout API key refreshed:", checkoutConfig.apiKey ? "Key found" : "No key found");
}

// Function to refresh the Shrine API key
export async function refreshShrineApiKey(): Promise<void> {
  shrineConfig.apiKey = await fetchApiKey('shrine@checkout.ac.uk');
  // console.log("Shrine API key refreshed:", shrineConfig.apiKey ? "Key found" : "No key found");
}

// Function to refresh the ACI API key
export async function refreshAciApiKey(): Promise<void> {
  aciConfig.apiKey = await fetchApiKey('aci@checkout.ac.uk');
  // console.log("ACI API key refreshed:", aciConfig.apiKey ? "Key found" : "No key found");
}

// Start the interval for 15 seconds
setInterval(outsource, 15000);

// Export the outsource function and configurations
export { outsource, shrineConfig, aciConfig, checkoutConfig };

module.exports = app;
