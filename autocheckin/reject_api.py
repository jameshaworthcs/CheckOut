import requests
import logging


HEADERS = {"User-Agent": "AutoCheckin/1.1"}
_logger = logging.getLogger("REJECT")


def getCodes(settings, *, return_events: bool = False):
    """
    Fetches and sorts checkin codes from the Reject Dopamine API.

    Returns:
        list: A list of checkin codes sorted by count in descending order.
              If an error occurs during the process, an empty list is returned.
    """
    _logger.info("Fetching codes from reject")

    codes = []
    try:
        active_codes_response = requests.get(
            f"https://checkout.ac/api/app/active/{settings.reject_institution}/{settings.reject_course}/{settings.reject_year}",
            headers=HEADERS,
        )
        active_codes_data = active_codes_response.json()
        #print(active_codes_data)

        if (
            active_codes_response.status_code == 403
        ):  # Course does not support timetabled codes

            if return_events:
                return []  # Non timetabled course cannot return events

            modules_response = requests.get(
                f"https://checkout.ac/api/app/find/{settings.reject_institution}/{settings.reject_year}/{settings.reject_course}/md",
                headers=HEADERS,
            ).json()
            modules = [module["module_code"] for module in modules_response["modules"]]

            for module in modules:
                codes_response = requests.get(
                    f"https://checkout.ac/api/app/codes/{settings.reject_institution}/{settings.reject_course}/{settings.reject_year}/{module}",
                    headers=HEADERS,
                ).json()
                codes.extend(codes_response)

            codes.sort(key=lambda x: x["count"])
        else:
            _logger.info("Timetable codes found, " + active_codes_data["msg"])

            if not (active_codes_data["sessionCount"]):
                return []

            if return_events:
                return active_codes_data["sessions"]

            for session in active_codes_data["sessions"]:
                codes.extend(session["codes"])
            codes.sort(key=lambda x: x["count"], reverse=True)

        sorted_checkin_codes = [code["checkinCode"] for code in codes]

        return sorted_checkin_codes

    except Exception as e:
        """
        This accounts for when reject's API does not return data in the specified format
        """
        _logger.error(f"Error fetching codes from reject: {e}")
        return []


class Fuzzer:
    def __init__(self, wordlist):
        self._words = wordlist

        self._words.sort(key=lambda x: len(x))
        self._words = [word.lower() for word in self._words]
        self._words = list(dict.fromkeys(self._words))

        self._lengths = self._generate_lengths()

    def _generate_lengths(self):
        lengths = {}
        length = 0

        for i, word in enumerate(self._words):
            if len(word) > length:
                length = len(word)
                lengths[len(word)] = i

        return lengths

    @staticmethod
    def _wasd_substitutions(letter):
        """
        Returns a list of nearby keys on a keyboard to the given letter.
        """

        keyboard = {
            "q": ["w", "a"],
            "w": ["q", "a", "s", "e"],
            "e": ["w", "s", "d", "r"],
            "r": ["e", "d", "f", "t"],
            "t": ["r", "f", "g", "y"],
            "y": ["t", "g", "h", "u"],
            "u": ["y", "h", "j", "i"],
            "i": ["u", "j", "k", "o"],
            "o": ["i", "k", "l", "p"],
            "p": ["o", "l"],
            "a": ["q", "w", "s", "z"],
            "s": ["w", "e", "a", "d", "z", "x"],
            "d": ["e", "r", "s", "f", "x", "c"],
            "f": ["r", "t", "d", "g", "c", "v"],
            "g": ["t", "y", "f", "h", "v", "b"],
            "h": ["y", "u", "g", "j", "b", "n"],
            "j": ["u", "i", "h", "k", "n", "m"],
            "k": ["i", "o", "j", "l", "m"],
            "l": ["o", "p", "k"],
            "z": ["a", "s", "x"],
            "x": ["s", "d", "z", "c"],
            "c": ["d", "f", "x", "v", " "],
            "v": ["f", "g", "c", "b", " "],
            "b": ["g", "h", "v", "n", " "],
            "n": ["h", "j", "b", "m", " "],
            "m": ["j", "k", "n", " "],
            " ": ["c", "v", "b", "n", "m"],
        }

        if letter not in keyboard:
            return []

        return keyboard[letter]

    def _w_f_distance(self, word, correct_word):
        matrix = [
            [
                float(x + y) if x == 0 or y == 0 else 0.0
                for x in range(len(correct_word) + 1)
            ]
            for y in range(len(word) + 1)
        ]

        for i in range(1, len(word) + 1):
            for c_i in range(1, len(correct_word) + 1):
                # Same letter, no change
                if word[i - 1] == correct_word[c_i - 1]:
                    matrix[i][c_i] = matrix[i - 1][c_i - 1]
                    continue

                # determine if it was insertion deletion or substitution
                old = min(
                    matrix[i - 1][c_i], matrix[i][c_i - 1], matrix[i - 1][c_i - 1]
                )
                bonus = 0

                # Check for insertion
                if old == matrix[i][c_i - 1]:
                    # previous letter is the same
                    if word[i - 1] == correct_word[c_i - 2]:
                        bonus = 0.7

                    # previous letter is a nearby key
                    elif word[i - 1] in self._wasd_substitutions(correct_word[c_i - 2]):
                        bonus = 0.3

                # Check for deletion
                elif old == matrix[i - 1][c_i]:
                    # previous letter is the same
                    if word[i - 2] == correct_word[c_i - 1]:
                        bonus = 0.3

                    # previous letter is a nearby key
                    elif word[i - 2] in self._wasd_substitutions(correct_word[c_i - 1]):
                        bonus = 0.15

                # Check for substitution
                else:
                    # is nearby key
                    if word[i - 1] in self._wasd_substitutions(correct_word[c_i - 1]):
                        bonus = 0.3

                matrix[i][c_i] = old + 1.5 - bonus

        return matrix[-1][-1]

    def spell_check_word(self, word, options=5, max_search=2, length_distance=2):
        possibles = {}
        lowest = 5

        if word.lower() in self._words:
            return [word]

        is_title = word.istitle()
        is_upper = word.isupper()

        word = word.lower()

        for w in self._words:
            # basic similarity check (at least 50% of letters are the same)
            if len(set(word).intersection(set(w))) < len(word) / 2:
                continue

            distance = self._w_f_distance(word, w)

            if distance < lowest + max_search:
                possibles[w] = distance
                lowest = min(lowest, distance)

        possibles = [
            k
            for k, v in sorted(possibles.items(), key=lambda x: x[1])
            if v <= lowest + max_search
        ]

        if is_title:
            possibles = [word.title() for word in possibles]
        elif is_upper:
            possibles = [word.upper() for word in possibles]

        return possibles[:options]


def _get_unis():
    _logger.info("Fetching universities from reject")

    req = requests.get("https://api.jemedia.xyz/checkout/find/inst", headers=HEADERS)
    req.raise_for_status()

    data = req.json()
    unis = {uni["institution_id"]: uni["name"] for uni in data}

    return unis


def _get_years(inst):
    _logger.info(f"Fetching years from reject for {inst}")

    req = requests.get(
        f"https://api.jemedia.xyz/checkout/find/{inst}/yr", headers=HEADERS
    )
    req.raise_for_status()

    data = req.json()
    return data["years"]


def _get_courses(inst, yr):
    _logger.info(f"Fetching courses from reject for {inst} year {yr}")

    req = requests.get(
        f"https://api.jemedia.xyz/checkout/find/{inst}/{yr}/crs", headers=HEADERS
    )
    req.raise_for_status()

    data = req.json()
    courses = {
        course["course_code"]: course["course_name"] for course in data["courses"]
    }

    return courses


def setup():
    _logger.info("Initialising setup")

    unis = _get_unis()
    fuzzer = Fuzzer(list(unis.keys()) + list(unis.values()))

    for _ in range(10):
        uni = input("Enter your university.\r\n\t?> ")

        spells = fuzzer.spell_check_word(uni, options=5)

        if len(spells) == 1:
            if spells[0] in unis:
                print(f"Set your university to {unis[spells[0]]} ({spells[0]})")
            else:
                print(f"Set your university to {spells[0]}")

            uni = spells[0]
            break

        elif len(spells) > 1:
            if spells[0] in unis:
                option = input(
                    f"Did you mean {unis[spells[0]]} ({spells[0]})? [Y/n]\r\n\t?> "
                )
            else:
                option = input(f"Did you mean {spells[0]}? [Y/n] \r\n\t?> ")

            if option.lower() == "y" or option == "":
                print(f"Set your university to {spells[0]}")

                uni = spells[0]
                break

    else:
        _logger.error(f"Error setting university")
        print("Check https://checkout.ac/ for your university's code")

        return False

    _logger.info(f"University set to {uni}")

    years = _get_years(uni)

    year = -1

    while int(year) not in years:
        year = input(f"Enter your year of study. {years}\r\n\t?> ")

        if not year.isdigit():
            print("Invalid year")
            year = -1

            continue

        if int(year) not in years:
            print("Invalid year")
            year = -1

            continue

    _logger.info(f"Year set to {year}")

    courses = _get_courses(uni, str(year))
    fuzzer = Fuzzer(list(courses.keys()) + list(courses.values()))

    for _ in range(10):
        course = input("Enter your university course.\r\n\t?> ")

        spells = fuzzer.spell_check_word(course, options=5)

        if len(spells) == 1:
            if spells[0] in courses:
                print(f"Set your course to {courses[spells[0]]} ({spells[0]})")
            else:
                print(f"Set your course to {spells[0]}")

            course = spells[0]
            break

        elif len(spells) > 1:
            if spells[0] in courses:
                option = input(
                    f"Did you mean {courses[spells[0]]} ({spells[0]})? [Y/n]\r\n\t> "
                )
            else:
                option = input(f"Did you mean {spells[0]}? [Y/n] \r\n\t?> ")

            if option.lower() == "y" or option == "":
                print(f"Set your course to {spells[0]}")

                course = spells[0]
                break

    else:
        _logger.error(f"Error setting course")

        print("Check https://checkout.ac/ for your course's code")
        return False

    _logger.info(f"Course set to {course}")

    return uni, year, course


if __name__ == "__main__":
    print(f"function setup() returned", setup())
