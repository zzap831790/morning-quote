#!/bin/sh
# Downloads the book texts the quotes are checked against, into ./texts
# Project Gutenberg texts come from their GITenberg copies on GitHub.
# Standard Ebooks texts come from Standard Ebooks' own GitHub repos.
set -e
cd "$(dirname "$0")"
mkdir -p texts
G=https://raw.githubusercontent.com/GITenberg
get() { curl -sSf -o "texts/$1" "$G/$2"; echo "got $1"; }
get karamazov.txt     The-Brothers-Karamazov_28054/master/28054.txt
get crime.txt         Crime-and-Punishment_2554/master/2554.txt
get warpeace.txt      War-and-Peace_2600/master/2600.txt
get resurrection.txt  Resurrection_1938/master/1938.txt
get kjv.txt           The-Bible-King-James-Version-Complete_30/master/30.txt
get frankenstein.txt  Frankenstein_84/master/84.txt
get timemachine.txt   The-Time-Machine_35/master/35.txt
get flatland.txt      Flatland--A-Romance-of-Many-Dimensions_97/master/97.txt
get utopia.txt        A-Modern-Utopia_6424/master/6424.txt
python3 se_fetch.py marcus-aurelius_meditations_george-long texts/se_meditations_long.txt
python3 se_fetch.py epictetus_short-works_george-long       texts/se_epictetus_long.txt
python3 se_fetch.py leo-tolstoy_a-confession_aylmer-maude   texts/se_confession_maude.txt
