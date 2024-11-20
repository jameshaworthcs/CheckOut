import re
import csv
import sys
import json
from datetime import datetime, date

def getSessions(md, csv_filename='/var/www/checkin/timetables/yrk-cs-1.csv'):
    if md == "soft2":
        md = "COM00016C"
    elif md == "theory2":
        md = "COM00014C"
    elif md == "sd":
        md = "COM00011C"
    else:
        return []
    # Process the CSV file
    with open(csv_filename, 'r') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        sessions = []
        for row in reader:
            if row[1] == md and row[4] == datetime.now().strftime("%Y-%m-%d"):
                session = {"className": row[0].split(" -")[0],
                           "startTime":str(row[5]),
                           "location": str(row[12])[0:8]}
                sessions.append(session)
        return sessions

def getS(md):
    try:
        mdData = json.dumps(getSessions(md))
        print(str(mdData))
    except Exception as error:
        print(error)
        print("[]")
if __name__ == "__main__":
    md = sys.argv[1]
    getS(md)