import requests
from bs4 import BeautifulSoup
import logging
import datetime
import json
import sys
import time

import duo
import reject_api
import SHIB_session_generator
import settings_handler



HEADERS = {"User-Agent": "AutoCheckin/1.1", "x-checkout-key": "rTXi8Nb5h4ROvd7WE1sr93Ni1NmJQ1hf"}
HEADERSPOST = {"User-Agent": "AutoCheckin/1.1",
                "x-checkout-key": "rTXi8Nb5h4ROvd7WE1sr93Ni1NmJQ1hf",
                  'Content-Type': 'application/json',
                  #'Cookie': 'checkout.account.secure=s%3A7UjB5YMEu9Sgjd3Wf5gyacg3mkSEAMlB.%2FzPODf0ngD5uCD65Xt5pBhrWsdbwVAuaj9jOVPocQmA'
                  }

checkout_domain = "chk-1.jemedia.xyz"

_logger = logging.getLogger("Checkin")
BASETIME = datetime.datetime.now().strftime("%y %m %d ")


def log(email, state, message):
    payload = json.dumps({
        "email": email,
        "state": state,
        "message": message
    })
    print("Log:", payload)

    url = "https://"+checkout_domain+"/auto/log"

    response = requests.request("POST", url, headers=HEADERSPOST, data=payload)

    print(response.text)


def get_checkin_events_token(session: dict[str: str]):
    email = sys.argv[1]
    sys_email = sys.argv[1]
    _logger.info("Fetching events from checkin.york.ac.uk")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "Accept": "text/html",
        "Accept-Encoding": "gzip, deflate, br",
        "Cookie": f"prestostudent_session={session['prestostudent_session']}",
    }

    req: requests.Response = requests.get(
        "https://checkin.york.ac.uk/selfregistration",
        headers=headers,
    )

    cookies = req.cookies

    # Check if the 'prestostudent_session' cookie is present
    if 'prestostudent_session' in cookies:
        prestostudent_session_value = cookies['prestostudent_session']
        #print("prestostudent_session cookie value:", prestostudent_session_value)
    else:
        print("prestostudent_session cookie not found in the response")
        log(email, "Fail", "Session refresh fail")
        return False

    req.raise_for_status()

    _logger.debug("page load success")

    page = req.content.decode()
    soup = BeautifulSoup(page, "html.parser")

    title = soup.find("title").text

    if title == "Please log in to continue...":
        _logger.warning("Session expired")
        log(email, "Fail", "Session refresh fail")
        return False

    if title != "Check-In":
        _logger.warning("Unexpected page title: " + title)
        log(email, "Fail", "Parser title fail")
        return False

    token = soup.find("meta", {"name": "csrf-token"})["content"]

    classes = soup.find_all("section", {"class": "box-typical box-typical-padding"})
    events = []

    # Find all span elements with class 'side-menu-title side-menu-name'
    name_elements = soup.find_all("span", {"class": "side-menu-title side-menu-name"})

    # Extract the text from the span elements and convert it to a string
    email_list = [name.text.strip() for name in name_elements]

    # Assuming there's only one email address, you can directly access the first element of the list
    email = email_list[0]

    if sys_email != email:
        log(sys_email, "Fail", "Email mismatch. Checkout user email does not match Checkin account.")

    #print("Old C:", str(session['prestostudent_session'])[:30])
    #print("New C:", str(prestostudent_session_value)[:30])

    uURL = "https://"+checkout_domain+"/auto/u/"+str(session['prestostudent_session'])+"/"+prestostudent_session_value+"/"+email
    req2: requests.Response = requests.get(
        uURL,
        headers=HEADERS,
    )
    
    # Parsing the JSON response
    #print(req2.content)
    response_data = req2.json()

    # Accessing the value of changedRows
    changed_rows = response_data['result']['changedRows']
    print("SessionUpdated?", changed_rows)

    # Log to AutoCheckin
    if changed_rows != 0:
        log(email, "Normal", "Session refresh success")
    else:
        log(email, "Fail", "Session refresh fail")

    if not classes:
        _logger.warning("No class objects found")
        return [], token

    if classes[0].text.__contains__("There is currently no activity for which you can register yourself."):
        _logger.info("Found 0 events.")
        return [], token

    for _class in classes:
        time = _class.find_all("div", {"class": "col-md-4"})[0].text.strip()
        start, end = time.split(" - ")
        start = datetime.datetime.strptime(BASETIME + start, "%y %m %d %H:%M")
        end = datetime.datetime.strptime(BASETIME + end, "%y %m %d %H:%M")

        event = {
            "start_time": start,
            "end_time": end,
            "activity": _class.find_all("div", {"class": "col-md-4"})[1].text.strip(),
            "lecturer": _class.find_all("div", {"class": "col-md-4"})[2].text.strip(),
            "space": _class.find_all("div", {"class": "col-md-4"})[3].text.strip(),
            "status": "unknown",
            "id": _class.get(
                "data-activities-id"
            ),
        }

        options = _class.find_all("div", {"class": "selfregistration_status"})

        for o in options:
            if o.get("class")[-1] == "hidden":
                continue

            widget = o.find("div", {"class": "widget-simple-sm-bottom"})

            if widget is not None:
                event["status"] = o.find(
                    "div", {"class": "widget-simple-sm-bottom"}
                ).text.strip()

                continue

            event["status"] = "NotPresent"

            break

        events.append(event)


    _logger.info(f"Found {len(events)} events")
    return events, token


def try_code(event_id, code, session: dict[str: str], token):
    req = requests.post(
        f"https://checkin.york.ac.uk/api/selfregistration/{event_id}/present",
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Referer": "https://checkin.york.ac.uk/selfregistration",
            "Cookie": f"XSRF-TOKEN={token}; prestostudent_session={session['prestostudent_session']}",
        },
        data={
            "code": code,
            "_token": token,
        },
    )

    # TODO: Check response for success rather than just status for failure
    print("Response code", req.status_code)
    if req.status_code == 422:
        return False

    return True


def try_codes(codes, session: dict[str: str]):
    _logger.info("Starting code checking process")
    try:
        events, token = get_checkin_events_token(session)
        print(events, token)
    except:
        print("Failed in session")
    try:

        for event in events:
            if event["status"] in ["Present", "Present Late"]:
                _logger.debug(
                    f"Skipping event {event['activity']} as it is already marked as present"
                )
                continue

            _logger.debug(f"Attempting to sign in to event {event['activity']}")

            for code in codes:
                result = try_code(event["id"], code, session, token)

                if result:
                    _logger.debug(f"Non failure during sign-in to event {event['activity']}")
                    email = sys.argv[1]
                    msg = f"Checked into {str(event['activity'])} with code {code}"
                    log(email, "Checkin", msg)
                    print(result)
                    break
                else:
                    print("Failed in try_code")

        events, _ = get_checkin_events_token(session)

        if any(event["status"] not in ["Present", "Present Late"] for event in events):
            _logger.warning("Not all events are signed into")
            return False

        _logger.info("All events are signed into")
        return True
    except Exception as error:
        print("Failed in events/session", error)


def main():
    #_logger.info("Checking for settings")
    settings = settings_handler.Settings()

    #_logger.info("Checking for duo settings")
    #duo.check_setup(settings)

    #_logger.info("Generating session tokens")
    #_session_tokens = SHIB_session_generator.generate_session_token(settings)
    _session_tokens = {'prestostudent_session':str(sys.argv[2])}
    print(str(settings))
    print(_session_tokens)
    _logger.info("Getting codes")
    codes = reject_api.getCodes(settings)
    print(codes)

    # if not codes:
    #     _logger.warning("No codes found, exiting")
    #     return False

    return try_codes(codes, _session_tokens)


if __name__ == "__main__":
    print("Starting autocheckin for", sys.argv[1])
    logging.basicConfig(level=logging.INFO)

    result = main()

    print("Finished with result:", result)
