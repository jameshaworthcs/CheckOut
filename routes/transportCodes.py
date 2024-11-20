import re
import csv
import requests
from datetime import datetime, date
import rejectParser

def process_timetable_data(json_data):

    codesOutput = []  # Initialize the output array

    for activity_set in json_data['activities']:
        for code_data in activity_set['codes']:  # Iterate through codes
            code = code_data['code']
            score = code_data['score']
            md = rejectParser.getMD(activity_set)[0]
            grp = rejectParser.getMD(activity_set)[1]
            if (md != False):
                codesOutput.append({
                    "chc": code,
                    "score": score,
                    "md": md,
                    "grp": grp
                })
    return codesOutput




# Fetch JSON data from the API endpoint
api_url = "https://aci-api.ashhhleyyy.dev/api/codes"
headers = {'User-Agent': 'rejectParser/1.0 (Contact: dev@jemedia.xyz)'}

try:
    response = requests.get(api_url, headers=headers, timeout=1)
    response.raise_for_status()

    # Directly pass the parsed JSON to the processing function
    result = process_timetable_data(response.json())  
    print(result)

except requests.exceptions.RequestException as e:
    print("Error fetching data from API:", e)
