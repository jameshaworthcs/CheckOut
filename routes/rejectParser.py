import re
import csv
import sys
import json
from datetime import datetime, date

def getMD(activity_set, csv_filename='/var/www/checkin/timetables/yrk-cs-1.csv'):
    # Extract relevant values from the input data
    input_date = activity_set['date']
    start_time = activity_set['time'].split('-')[0].strip()
    space = activity_set['space']
    activity = activity_set['activity']

    # Convert input date to YYYY-MM-DD format (with current year)
    date_obj = datetime.strptime(input_date, '%A %d %B')
    current_year = date.today().year
    date_with_year = date_obj.replace(year=current_year)
    formatted_date = date_with_year.strftime('%Y-%m-%d')

    # Process the CSV file
    with open(csv_filename, 'r') as csvfile:
        reader = csv.reader(csvfile, delimiter=';')
        matching_rows = []
        for row in reader:
            if row[4] == formatted_date and row[5] == start_time:
                matching_rows.append(row)

        matching_rows = [row for row in matching_rows if space in row[12]]
        matching_rows = [row for row in matching_rows if activity in row[16]]

        if matching_rows:
            desired_value = matching_rows[0][1]
            grpMatch =  re.search(r'Grp (\d+)', matching_rows[0][0])
            if grpMatch:
                grp = grpMatch.group(1)
            else:
                grp = 'Lecture'
            if desired_value == "COM00016C":
                md = "soft2"
            elif desired_value == "COM00014C":
                md = "theory2"
            elif desired_value == "COM00011C":
                md = "sd"
            else:
                md = False
            return md, grp
        return False, False

def getCodes(json_input):
    try:
        result = getMD(json.loads(str(json_input)))
        md = result[0]
        grp = result[1]
        mdData = {"md": md, "grp": grp}
        mdData = json.dumps(mdData)
        print(str(mdData))
    except Exception as error:
        print(error)
if __name__ == "__main__":
    json_input = sys.argv[1]
    getCodes(json_input)