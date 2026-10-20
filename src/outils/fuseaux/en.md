---
id: fuseaux
lang: en
slug: time-zone-converter
titre: "Time zone converter and meeting planner — free"
h1: "Convert the time between several cities"
description: "What time is it in Tokyo when it is 2 pm in London? Add cities, drag the timeline and share the slot: daylight saving handled, nothing sent anywhere."
nom_court: "Time zones"
phrase: "2 pm in London, and elsewhere? Find the right slot."
categorie: pratique
icone: clock
mots_cles: [time zone converter, time difference, meeting planner, time in New York, world clock, convert time between cities, schedule international meeting]
faq:
  - q: "What is the time difference between London and New York?"
    r: "Five hours most of the year: when it is 2 pm in London, it is 9 am in New York. For a few weeks in spring and autumn it drops to four hours, because the United States and the United Kingdom do not change their clocks on the same day."
  - q: "Why does the gap with New York change for a few weeks a year?"
    r: "The United States moves to daylight saving time on the second Sunday of March and back on the first Sunday of November; the UK and the EU do it on the last Sunday of March and the last Sunday of October. Between those dates the gap is four hours instead of five."
  - q: "How do I find a meeting time that works in several countries?"
    r: "Add every city, then drag the timeline: office hours (9 am to 6 pm) are shown in green on each row. The best slot is the column where every row is green; if none exists, pick the one with the fewest people in the middle of the night."
  - q: "Is daylight saving time taken into account?"
    r: "Yes. The calculation uses your browser's time zone database (the IANA database), which knows when each region changes its clocks, including those that never do, such as Japan, China and India."
  - q: "What if the time I pick does not exist, or happens twice?"
    r: "On the day clocks go forward, 2:30 am does not exist in Paris: the tool moves it to 3:30 am and tells you. On the day clocks go back, 2:30 am happens twice: the first one is used, and a notice says so."
  - q: "Are my cities and times sent anywhere?"
    r: "No. Everything is calculated in your browser. The share link keeps the cities and the time after the # sign, a part of the address that browsers never send to the website."
sources:
  - titre: "IANA time zone database"
    url: "https://www.iana.org/time-zones"
  - titre: "GeoNames, cities with more than 15,000 inhabitants (CC-BY 4.0 licence)"
    url: "https://www.geonames.org/"
  - titre: "Uniform Time Act, United States daylight saving rules (15 U.S.C. 260a)"
    url: "https://www.law.cornell.edu/uscode/text/15/260a"
mis_a_jour: 2026-10-20
calcul: true
---
Setting up a call with a colleague in Montreal, a team in Singapore and a client in London comes down to one question: what time is it for each of them? This tool lays the cities side by side and moves them together.

## How to use it

1. **Add cities.** Your own city is already there, with two others. Type a name in English or French (London, Tokyo, Brazil) and press Enter.
2. **Set the time.** Change the time on any row, or the date at the top: every other row follows, with the day (+1 d, −1 d) when it changes.
3. **Look for a slot.** Drag the timeline (or use the arrow keys): the blue line crosses the 24 hours of every city.
4. **Share it.** "Copy link" keeps the cities and the time in the address; "Add calendar" creates a one-hour .ics file that Google Calendar, Outlook and Apple Calendar open.

## Reading the timeline

Each row shows 24 cells lined up on the same instants. Solid green marks office hours (9 am to 6 pm, local time), pale green the evening and early morning, grey the night. Rows do not start at the same hour: that is expected, they are offset exactly as the cities are.

## Why the difference changes

A time zone is not a fixed number. London is UTC+0 in winter and UTC+1 in summer; New York is UTC−5, then UTC−4. Because the two regions do not change clocks on the same Sunday, the five-hour gap becomes four hours for a few weeks in spring and autumn. Japan, China and India never change their clocks. The southern hemisphere does the opposite: Sydney moves its clocks forward in early October. Some regions are offset by half an hour (India is UTC+5:30) or forty-five minutes (Nepal, UTC+5:45): the timeline shows that too.

To avoid mistakes, always write the city next to the time in invitations ("2 pm London time") rather than an offset alone.

## What the tool does not do

It does not know public holidays or local weekends: check that a green slot falls on a working day in every country. The list covers about 400 cities (capitals and the largest cities of each country), taken from GeoNames; if yours is missing, pick one in the same time zone. Times are shown on a 24-hour clock.
