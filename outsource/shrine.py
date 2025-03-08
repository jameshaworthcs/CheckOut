import requests
import random
import string
from datetime import datetime

headers = {
    'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
}


def get_current_date():
    return datetime.now().strftime('%Y-%m-%d')

def fetch_api_data(url):
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print("Failed to fetch data from API:", response.status_code)
        return None
    
def send_post_request(url, data):
    headers2 = {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'JEM/CheckOut (v3; +https://checkout.ac/support; abuse@jemedia.xyz)',
        'x-checkout-key': 'outdated'
    }
    try:
        response = requests.post(url, json=data, headers=headers2)
        response.raise_for_status()  # Raise an exception for 4XX and 5XX status codes
        return response
    except requests.exceptions.RequestException as e:
        print("Failed to send POST request:", e)
        return None

def compare_sessions(session_data, activity_data):
    session_matches = {}
    try:
        for session in session_data['sessions']:
            for activity in activity_data:
                activity_start_time = datetime.strptime(activity['startDateTime'], "%Y-%m-%dT%H:%M:%S.%fZ")
                session_start_time = datetime.strptime(session['startDate'] + ' ' + session['startTime'], "%a %b %d %Y %H:%M")
                if session['description'] == activity['reference'] and session_start_time == activity_start_time:
                    session_matches.setdefault(session['description'], {'session_id': session['rejectID'], 'codes_to_send_to_shrine': [], 'codes_to_send_to_reject': []})
                    
                    # Check for missing codes from reject to shrine
                    for session_code in session['codes']:
                        found = False
                        for activity_code in activity['checkinCodes']:
                            if str(session_code['checkinCode']) == activity_code['code']:
                                found = True
                                break
                        if not found:
                            session_matches[session['description']]['codes_to_send_to_shrine'].append({'activityID': activity['id'], 'checkinCode': session_code['checkinCode']})
                    
                    # Check for missing codes from shrine to reject
                    for activity_code in activity['checkinCodes']:
                        found = False
                        for session_code in session['codes']:
                            if str(session_code['checkinCode']) == activity_code['code']:
                                found = True
                                break
                        if not found:
                            session_matches[session['description']]['codes_to_send_to_reject'].append({'rejectID': session['rejectID'], 'moduleCode': session['moduleCode'], 'checkinCode': activity_code['code']})
    except:
        print("No active classes found or other api error.") 
    return session_matches

def main():
    session_url = "https://checkout.ac/api/app/active/yrk/cs/2"
    activity_url = f"https://checkout.theshrine.net/api/activity/by-day/{get_current_date()}"
    
    session_data = fetch_api_data(session_url)
    activity_data = fetch_api_data(activity_url)
    
    if session_data and activity_data:
        session_matches = compare_sessions(session_data, activity_data)
        codes_to_send_to_shrine = []
        codes_to_send_to_reject = []
        for description, session_match in session_matches.items():
            codes_to_send_to_shrine.extend(session_match['codes_to_send_to_shrine'])
            codes_to_send_to_reject.extend(session_match['codes_to_send_to_reject'])
        
        print("Codes to send to reject:")
        print(codes_to_send_to_reject)
        print("Codes to send to shrine:")
        print(codes_to_send_to_shrine)
        for code_info in codes_to_send_to_reject:
            data = {
                "inst": "yrk",
                "crs": "cs",
                "yr": "1",
                "md": code_info['moduleCode'],  # Update with moduleCode
                "grp": code_info['rejectID'],   # Use the rejectID
                "chc": str(code_info['checkinCode']),  # Convert checkinCode to string
                "tk": "shrine" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))  # Generate a random token
            }
            response = send_post_request('https://checkout.ac/api/app/submit', data)
            if response:
                print("Response from POST request:")
                print(response.text)  # Output response from each post request
            else:
                print("Failed to send reject POST request for code:", code_info['checkinCode'])
        for shrine_info in codes_to_send_to_shrine:
            shrineData = {
                "activityId": shrine_info['activityID'],
                "code": str(shrine_info['checkinCode']),
                "offTimetable": False
            }
            print(shrineData)
            response = send_post_request('https://checkout.theshrine.net/api/code/submit', shrineData)
            if response:
                print("Response from POST request:")
                print(response.text)  # Output response from each post request
            else:
                print("Failed to send shrine POST request for code:", shrine_info['checkinCode'])
    else:
        print("Failed to fetch data from one or both APIs.")

if __name__ == "__main__":
    main()
