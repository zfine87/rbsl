import datetime
import logging
import os
import PIL.Image
import PIL.ImageGrab
import pytesseract
import pywinauto
import sys
import time

from pywinauto.application import Application
from shutil import copyfile
from shutil import move

# Set Tesseract EXE Path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract'

# Initialize logging settings
logging.basicConfig(format='%(levelname)s:%(message)s', level=logging.DEBUG)

# Path Constants
pathToFBB = r'C:\Program Files (x86)\GDS\Fast Break Pro Basketball 3'
fullFBBPath = r'C:\Program Files (x86)\GDS\Fast Break Pro Basketball 3\FBPB3.exe'
pathToFBBOutputData = r'C:\Users\Public\Documents\GDS\Fast Break Pro Basketball 3\output'

relativePathtoData = r'..\data'

playerRatingsFileName = 'PlayerRatings.csv'

originalCwd = os.getcwd()

# Set active directory to folder with FBPB
os.chdir(pathToFBB)

# Start FBPB
app = Application().start(fullFBBPath)
activeWindow = app.top_window()

# Bring window to front
activeWindow.minimize()
activeWindow.restore()
activeWindow.set_focus()

# Move window to origin corner of screen (to normalize locations)
activeWindow.move_window(x=0, y=0)

activeWindow.ThunderRT6UserControlDC2.click()
# activeWindow.print_control_identifiers()

# childWindow = activeWindow.child_window(title='Load Saved Game')

# load the active file 
pywinauto.mouse.double_click(coords=(385,190))

# Wait for loading
app.wait_cpu_usage_lower(threshold=2.5)

# # Log-in (513,231)
pywinauto.mouse.click(coords=(513,231))
pywinauto.keyboard.send_keys('57kings4'
                             '{ENTER}')

time.sleep(.5)

# left, upper, right, lower
calendarImage = PIL.ImageGrab.grab(bbox=(787, 249, 914, 267))

calendarImage.save('C:\\repos-z\\rbsl\\images\\img.jpg')

inGameDateString = pytesseract.image_to_string(calendarImage).strip()

# Sometimes pytesseract add a comma to the end of the date, so remove it if it's there
if inGameDateString.endswith(','):
    inGameDate = datetime.datetime.strptime(inGameDateString, '%B %d, %Y,')    
else:
    inGameDate = datetime.datetime.strptime(inGameDateString, '%B %d, %Y')

print('Got an in-game date of: ' + inGameDate.strftime("%Y-%m-%d"))

### Export Data Files

# Go to tools page
pywinauto.mouse.click(coords=(282, 26))
# Go to GM Text Reports Page
pywinauto.mouse.click(coords=(528, 174))

# Export Reports (PlayerStats, PlayerCareerStats, PlayerRatings, TeamStats)
pywinauto.mouse.click(coords=(911, 164))
pywinauto.mouse.click(coords=(911, 250))
pywinauto.mouse.click(coords=(911, 339))
pywinauto.mouse.click(coords=(911, 518))

os.chdir(originalCwd)

# Move files over to data store
move(os.path.join(pathToFBBOutputData, playerRatingsFileName),os.path.join(os.getcwd(), relativePathtoData, inGameDate.strftime("%Y-%m-%d_PlayerRatings.csv")))

# Close FBPB3
print('Successfully created ratings CSV, exiting FBPB3')
os.system("TASKKILL /F /IM FBPB3.exe")